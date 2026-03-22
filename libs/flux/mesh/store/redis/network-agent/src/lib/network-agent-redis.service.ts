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
    ) { }

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

            await this._client.hmset(key_, [
                uid,
                clientId,
            ]);

            await this._client.expire(key_, 500);
        }

        // Add to network
        await this._client.sadd(`networks/${networkId}/agents`, clientId);

        // Add to agent
        await this._client.hmset(
            `networks/${networkId}/agents/${clientId}`,
            [
                ...(ip ? [
                    'ip',
                    typeof ip === 'string' ? ip : '',
                ] : []),

                ...(uid ? [
                    'name',
                    typeof uid === 'string' ? uid : '',
                ] : []),

                ...(machineUID ? [
                    'machineUID',
                    typeof machineUID === 'string' ? machineUID : '',
                ] : []),

                'address',
                address,

                'connectedAt',
                new Date().toISOString(),
            ],
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
        await this._client.hmset(key, [
            'bytes',
            `${bytes}`,
            'packets',
            `${packets}`,
        ]);

    }

    // ****************************************************************************
    // * Read
    // ****************************************************************************

    /**
     * Returns all network agents.
     */
    public async readNetworkAgents(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAgent[]> {
        // Add to network
        const networkAgents = await this._client.smembers(`networks/${networkId}/agents`);

        // Add to agent
        const agentData: TNetworkAgent[] = [];

        for (const id of networkAgents) {
            const key: string = `networks/${networkId}/agents/${id}`;

            const [name, ip, address, bytes, packets, connectedAt] = await this._client.hmget(key, [
                'name',
                'ip',
                'address',
                'bytes',
                'packets',
                'connectedAt',
            ]);

            if (ip || address || bytes || packets) {
                agentData.push({
                    id: id as TClientId,
                    uid: name ? (name as TAgentOwnUId) : undefined,
                    ip: ip || null,
                    address: address as string,
                    bytes: Number.parseInt(bytes || '0', 10),
                    packets: Number.parseInt(packets || '0', 10),
                    connectedAt: new Date(connectedAt as unknown as Date),
                });
            }
        }

        return agentData;
    }

    /**
     * Reads the current number of connected agents on the given network.
     */
    public async readNetworkAgentCount(
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
    public async readNetworkClientAddressByUIDOrThrow(
        networkId: TNetworkId_S,
        clientOwnUId: TAgentOwnUId,
    ): Promise<TAddress> {
        const [clientAddress] = await this._client.hmget(`networks/${networkId}/agent-uids`, [clientOwnUId]);

        if (!clientAddress) {
            throw new Error(`Network agent not found for networkId: '${networkId}'`);
        }

        return clientAddress as TAddress;
    }

    // ****************************************************************************
    // * Delete
    // ****************************************************************************

    /**
     * Unregisters a network agent UID and address in the Redis hash.
     */
    public async unregisterNetworkAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        uid?: TAgentOwnUId,
    ): Promise<void> {
        if (uid) {
            await this._client.send('HDEL', [`networks/${networkId}/agent-uids`, uid]);
        }
        await this._client.srem(`networks/${networkId}/agents`, clientId);
    }

}
