/**
 * Loopkup a client address by UID
 */
import type { RedisClient } from 'bun';
import type {
    TAddress,
    TClientId,
    TAgentOwnUId,
    TNetworkId_S,
    TNetworkAgentCountAt,
} from '@flux/shared/types';
import type { TNetworkAgent } from './network-agent-cache.type';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';

export class NetworkAgentRedisService {

    constructor(
        private readonly _client: RedisClient,
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
        machineUID?: TFluxClientUID,
    ): Promise<void> {
        if (uid) {
            const key_: string = `networks/${networkId}/agent-uids`;

            await this._client.hset(key_, {
                [uid]: clientId,
            });

            await this._client.expire(key_, 500);
        }

        // Add to network
        await this._client.sadd(`networks/${networkId}/agents`, clientId);

        // Add to global list
        await this._client.hset(
            `~/agents`,
            {
                [clientId]: networkId,
            }
        );

        // Add to agent info hash
        await this._client.hset(
            `networks/${networkId}/agents/${clientId}`,
            {
                ...(ip ? {
                    'ip': typeof ip === 'string' ? ip : '',
                } : {}),

                ...(uid ? {
                    'name': typeof uid === 'string' ? uid : '',
                } : {}),

                ...(machineUID ? {
                    'machineUID': typeof machineUID === 'string' ? machineUID : '',
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

        // Consider if this should only be emitted via sockets, and not stored. Increase the total network 
        // usage though.
        await this._client.hset(key, {
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
        const networkAgents = await this._client.smembers(`networks/${networkId}/agents`);

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
            count: await this._client.scard(`networks/${networkId}/agents`),
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
        const [clientAddress] = await this._client.hmget(`networks/${networkId}/agent-uids`, [clientOwnUId]);

        if (!clientAddress) {
            throw new Error(`Network agent not found for networkId: '${networkId}'`);
        }

        return clientAddress as TAddress;
    }

    public async readAgentByClientId(
        networkId: TNetworkId_S,
        clientId: TClientId,
    ): Promise<TNetworkAgent | null> {

        const [name, ip, address, bytes, packets, connectedAt] = await this._client
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
                address: address as string,
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
     * 
     * @throws 'Network agent not found for clientId ...'
     */
    public async unregisterAgentOrThrow(
        clientId: TClientId,
        networkId?: TNetworkId_S,
        uid?: TAgentOwnUId,
    ): Promise<void> {
        const networkId_: TNetworkId_S = networkId ?? await this.readAgentNetworkIdByClientIdOrThrow(clientId);
        console.log("starting");

        if (uid) {
            await this._client.hdel(`networks/${networkId_}/agent-uids`, uid);
        }

        // Remove from global
        await this._client
            .hdel(
                `~/agents`,
                clientId,
            );

        // Remove from network
        await this._client.srem(`networks/${networkId_}/agents`, clientId);

        // Remove from agent info hash
        await this._client.del(`networks/${networkId_}/agents/${clientId}`);
    }

    // ****************************************************************************
    // * Internal Helpers
    // ****************************************************************************
    private async readAgentNetworkIdByClientIdOrThrow(
        clientId: TClientId,
    ): Promise<TNetworkId_S> {
        const networkId = await this._client.hget(`~/agents`, clientId);

        if (!networkId) {
            throw new Error(`Network agent not found for clientId: '${clientId}'`);
        }

        return networkId as TNetworkId_S;
    }
}
