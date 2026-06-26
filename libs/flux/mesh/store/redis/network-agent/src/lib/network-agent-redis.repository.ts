/**
 * Loopkup a client address by UID
 */
import {
    type TAddress,
    type TClientId,
    type TAgentOwnUId,
    type TNetworkId_S,
    type TNetworkAgentCountAt,
    splitProcessAddress,
} from '@flux/shared/types';
import type { TNetworkAgent } from './network-agent-cache.type';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';
import { RedisConnection } from '@flux/mesh';

export class NetworkAgentRedisRepository {

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {}

    // ****************************************************************************
    // * Create
    // ****************************************************************************

    /**
     * Register an agent.
     */
    public async registerAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        ip: Bun.SocketAddress | null,
        address: TAddress,
        uid?: TAgentOwnUId,
        fluxClientUID?: TFluxClientUID,
    ): Promise<void> {
        if (uid) {
            const key_: string = `networks/${networkId}/agent-uids`;

            await this._redisConnection.hash.hset(key_, {
                [uid]: address,
            });

            await this._redisConnection.hash.expire(key_, 500);
        }

        // Add to network
        await this._redisConnection.hash.sadd(`networks/${networkId}/agents`, clientId);

        // Add to machine list
        const [machineAddress, processAddress] = splitProcessAddress(address);

        await this._redisConnection.hash.sadd(
            `~/machines/processes/${machineAddress}/${processAddress}/clients`,
            clientId,
        );

        // Add to global list
        await this._redisConnection.hash.hset(
            `~/clients`,
            {
                [clientId]: networkId,
            }
        );

        // Add to agent info hash
        await this._redisConnection.hash.hset(
            `networks/${networkId}/agents/${clientId}`,
            {
                ...(ip ? {
                    'ip': ip.address,
                } : {}),

                ...(uid ? {
                    'name': typeof uid === 'string' ? uid : '',
                } : {}),

                ...(fluxClientUID ? {
                    'machineUID': typeof fluxClientUID === 'string' ? fluxClientUID : '',
                } : {}),

                'address': address,
                'connectedAt': new Date().toISOString(),
            },
        );
    }

    /**
     * Updates the throughput statistics for a registered agent.
     */
    public async registerAgentThroughput(
        networkId: TNetworkId_S,
        clientId: TClientId,
        bytes: number,
        packets: number,
    ): Promise<void> {
        const key: string = `networks/${networkId}/agents/${clientId}`;

        // Consider if this should only be emitted via sockets, and not stored. Increase the total network usage though.
        await this._redisConnection.hash.hset(key, {
            'bytes': `${bytes}`,
            'packets': `${packets}`,
        });
    }

    // ****************************************************************************
    // * Read
    // ****************************************************************************

    /**
     * Returns all agents on a network.
     */
    public async readAgents(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAgent[]> {
        // Add to network
        const networkAgents = await this._redisConnection.hash.smembers(`networks/${networkId}/agents`);

        // Add to agent
        const agentData: TNetworkAgent[] = [];

        for (const id of networkAgents) {
            const networkAgent: TNetworkAgent | null = await this.readAgentByClientId(
                networkId,
                id as TClientId,
            );

            if (networkAgent) {
                agentData.push(networkAgent);
            }
        }

        return agentData;
    }

    /**
     * Reads the current number of connected agents on the given network.
     */
    public async readAgentCount(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAgentCountAt> {
        return {
            count: await this._redisConnection.hash.scard(`networks/${networkId}/agents`),
            date: new Date(),
        };
    }

    /**
     * Resolves the network client address by an agent's UID or throws.
     */
    public async readClientAddressByUIDOrThrow(
        networkId: TNetworkId_S,
        clientOwnUId: TAgentOwnUId,
    ): Promise<TAddress> {
        const [clientAddress] = await this._redisConnection
            .hash
            .hmget(
                `networks/${networkId}/agent-uids`,
                [clientOwnUId],
            );

        if (!clientAddress) {
            throw new Error(`Network agent not found for networkId: '${networkId}'`);
        }

        return clientAddress as TAddress;
    }

    public async readAgentByClientId(
        networkId: TNetworkId_S,
        clientId: TClientId,
    ): Promise<TNetworkAgent | null> {

        const [name, ip, address, bytes, packets, connectedAt] = await this._redisConnection
            .hash
            .hmget(
                `networks/${networkId}/agents/${clientId}`,
                [
                    'name',
                    'ip',
                    'address',
                    'bytes',
                    'packets',
                    'connectedAt',
                ]);

        if (ip || address || bytes || packets) {
            return {
                id: clientId,
                uid: name ? (name as TAgentOwnUId) : undefined,
                ip: ip || null,
                address: address as TAddress,
                bytes: Number.parseInt(bytes || '0', 10),
                packets: Number.parseInt(packets || '0', 10),
                connectedAt: new Date(connectedAt as unknown as Date),
            };
        }

        return null;
    }

    // ****************************************************************************
    // * Delete
    // ****************************************************************************

    /**
     * Unregisters a network agent UID and address in the Redis hash.
     */
    public async unregisterAgent(
        clientId: TClientId,
        networkId: TNetworkId_S,
        uid?: TAgentOwnUId,
    ): Promise<void> {

        if (uid) {
            await this._redisConnection.hash.hdel(`networks/${networkId}/agent-uids`, uid);
        }

        // Remove from machine list
        const agent = await this.readAgentByClientId(networkId, clientId);

        if (agent) {
            const [machineAddress, processAddress] = splitProcessAddress(agent.address as TAddress);

            await this._redisConnection.hash.srem(
                `~/machines/processes/${machineAddress}/${processAddress}/clients`,
                clientId,
            );
        }

        // Remove from global
        await this._redisConnection
            .hash
            .hdel(
                `~/clients`,
                clientId,
            );

        // Remove from network
        await this._redisConnection.hash.srem(`networks/${networkId}/agents`, clientId);

        // Remove from agent info hash
        await this._redisConnection.hash.del(`networks/${networkId}/agents/${clientId}`);
    }

    // ****************************************************************************
    // * Internal Helpers
    // ****************************************************************************
    public async readAgentNetworkIdByClientIdOrThrow(
        clientId: TClientId,
    ): Promise<TNetworkId_S> {
        const networkId = await this._redisConnection.hash.hget(`~/clients`, clientId);

        if (!networkId) {
            throw new Error(`Network agent not found for clientId: '${clientId}'`);
        }

        return networkId as TNetworkId_S;
    }
}
