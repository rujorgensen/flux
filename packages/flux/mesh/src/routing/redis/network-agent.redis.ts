/**
 * Register information on a specific network agent.
 */
import type { RedisClient } from 'bun';
import type {
    TAddress,
    TClientId,
    TAgentOwnUId,
    TNetworkId_S,
} from '@flux/shared/types';
import { NetworkAgentRedisSortedSet } from './hash/network-agent.redis.sorted-set';

export class NetworkAgentRedis {
    private readonly networkAgentRedisSortedSet: NetworkAgentRedisSortedSet;
    private readonly cashedDataUsage: Map<string, number> = new Map();

    constructor(
        private readonly client: RedisClient,
    ) {
        this.networkAgentRedisSortedSet = new NetworkAgentRedisSortedSet(client);

        // Update the network agent data usage regularly
        setInterval(this.pushDataUsage.bind(this), 3_000);
    }

    /**
     * Registers a network agent in the sorted set.
     * 
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TAddress } clientId - The client address
     * @param { TClientId } socketId - The socket ID
     * @param { TAgentOwnUId } uid - The agent UID
     * 
     * @returns { Promise<void> }
     */
    public async registerNetworkAgent(
        networkId: TNetworkId_S,
        clientId: TAddress,
        socketId: TClientId,
        uid: TAgentOwnUId,
    ): Promise<void> {
        const key: string = `networks/${networkId}/agents/${socketId}`;

        await this.client.hmset(key, [
            'data-usage',
            '0',

            'clientId',
            clientId,

            'name',
            uid,

            'registerAt',
            new Date().toISOString(),
        ]);

        await this.client.expire(key, 500);

        await this.networkAgentRedisSortedSet
            .registerAgent(
                networkId,
                socketId,
            );
    }

    /**
     * Unregisters a network agent from the sorted set.
     * 
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TClientId } socketId - The socket ID
     * 
     * @returns { Promise<number> } The number of elements removed
     */
    public async unregisterNetworkAgent(
        networkId: TNetworkId_S,
        socketId: TClientId,
    ): Promise<number> {
        const key: string = `networks/${networkId}/agents/${socketId}`;

        await this.client.hmset(key, [
            'unregisteredAt',
            new Date().toISOString(),
        ]);

        return await this.networkAgentRedisSortedSet
            .unregisterAgent(
                networkId,
                socketId,
            );
    }

    /**
     * Caches the data usage for a network agent to be pushed periodically.
     * 
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TClientId } socketId - The socket ID
     * @param { number } usage - The data usage in bytes
     */
    public registerDataUsage(
        networkId: TNetworkId_S,
        socketId: TClientId,
        usage: number,
    ): void {
        const key: string = `networks/${networkId}/agents/${socketId}`;

        const cashedDataUsage: number | undefined = this.cashedDataUsage.get(socketId);

        if (cashedDataUsage === undefined) {
            this.cashedDataUsage.set(key, usage);
        } else {
            this.cashedDataUsage.set(key, usage + cashedDataUsage);
        }
    }

    /**
     * Pushes the data usage to the Redis server.
     * 
     * @returns { Promise<void> }
     */
    private async pushDataUsage(

    ): Promise<void> {

        for (const [redisKey, usage] of this.cashedDataUsage) {
            await this.client
                .hincrby(
                    redisKey,
                    'data-usage',
                    usage,
                );

            this.cashedDataUsage.delete(redisKey);
        }

    }
}