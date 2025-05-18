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
import { NetworkAgentRedisSortedSet } from './network-agent.redis.sorted-set';

export class NetworkAgentRedisService {
    private readonly cashedDataUsage: Map<string, number> = new Map();
    private readonly networkAgentRedisSortedSet: NetworkAgentRedisSortedSet;

    constructor(
        private readonly _client: RedisClient,
    ) {
        this.networkAgentRedisSortedSet = new NetworkAgentRedisSortedSet(this._client);

        // Update the network agent data usage regularly
        // setInterval(this.pushDataUsage.bind(this), 3_000);
    }

    // ****************************************************************************
    // * Create
    // ****************************************************************************

    /**
     * Register an agent.
     *
     * @param { TNetworkId_S }              networkId
     * @param { TClientId }                 clientId
     * @param { Bun.SocketAddress | null }  ip
     * @param { TAddress }                  address
     * 
     * @returns { void }
     */
    public async registerAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        ip: Bun.SocketAddress | null,
        address: TAddress,
        uid?: TAgentOwnUId,
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
        const key: string = `networks/${networkId}/agents/${clientId}`;

        await this._client.hmset(key, [
            ...(ip ? [
                'ip',
                typeof ip === 'string' ? ip : '',
            ] : []),

            'data-usage',
            '0',

            ...(uid ? [
                'name',
                typeof uid === 'string' ? uid : '',
            ] : []),

            'clientId',
            clientId,

            'address',
            address,

            'registerAt',
            new Date().toISOString(),
        ]);

        await this._client.expire(key, 500);

        await this.networkAgentRedisSortedSet
            .registerAgent(
                networkId,
                address,
            );
    }

    /**
     * 
     * @param networkId 
     * @param clientId 
     * @param bytes 
     * @param packets 
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

        const cashedDataUsage: number | undefined = this.cashedDataUsage.get(key);

        if (cashedDataUsage === undefined) {
            this.cashedDataUsage.set(key, bytes);
        } else {
            this.cashedDataUsage.set(key, bytes + cashedDataUsage);
        }

    }

    // ****************************************************************************
    // * Read
    // ****************************************************************************

    /**
     * Returns all network agents.
     * 
     * @param { TNetworkId_S }  networkId
     *
     * @returns { Promise<TNetworkAgent> }
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

            const [ip, address, bytes, packets] = await this._client.hmget(key, [
                'ip',
                'address',
                'bytes',
                'packets',
            ]);

            if (ip || address || bytes || packets) {
                agentData.push({
                    id: id as TClientId,
                    ip: ip || null,
                    address: address as string,
                    bytes: Number.parseInt(bytes || '0', 10),
                    packets: Number.parseInt(packets || '0', 10),
                });
            }
        }

        return agentData;
    }

    /**
     * Reads the current number of connected agents on the given network.
     * 
     * @param { TNetworkId_S }  networkId
     *
     * @returns { Promise<TNetworkAgentCountAt> }
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
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TAgentOwnUId }  networkId
     *
     * @returns { Promise<TAddress> }
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
     *
     * @param { TNetworkId_S }      networkId
     * @param { TClientId }         clientId
     * @param { TAgentOwnUId }      [uid]
     * 
     * @returns { void }
     */
    public async unregisterNetworkAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        address: TAddress,
        uid?: TAgentOwnUId,
    ): Promise<void> {
        if (uid) {
            await this._client.send('HDEL', [`networks/${networkId}/agent-uids`, uid]);
        }
        await this._client.srem(`networks/${networkId}/agents`, clientId);

        await this._client.hmset(
            `networks/${networkId}/agents/${clientId}`,
            [
                'unregisteredAt',
                new Date().toISOString(),
            ],
        );

        await this.networkAgentRedisSortedSet
            .unregisterAgent(
                networkId,
                address,
            );
    }

    // ****************************************************************************
    // * Internal Helpers
    // ****************************************************************************

    /**
     * Pushes the data usage to the Redis server.
     * 
     * @returns { Promise<void> }
     */
    private async pushDataUsage(

    ): Promise<void> {

        for (const [redisKey, usage] of this.cashedDataUsage) {
            await this._client
                .hincrby(
                    redisKey,
                    'data-usage',
                    usage,
                );

            this.cashedDataUsage.delete(redisKey);
        }
    }
}
