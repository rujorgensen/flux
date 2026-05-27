/**
 * Register information on a specific network agent.
 */
import type { RedisClient } from 'bun';
import type {
    TClientId,
    TNetworkId_S,
} from '@flux/shared/types';

export class NetworkAgentRedis {
    private readonly cashedDataUsage: Map<string, number> = new Map();

    constructor(
        private readonly client: RedisClient,
    ) {

        // Update the network agent data usage regularly
        setInterval(this.pushDataUsage.bind(this), 3_000);
    }

    /**
     * Registers a network agent in the sorted set.
     * 
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TAddress } address - The client address
     * @param { TClientId } clientId - The socket ID
     * @param { TAgentOwnUId } uid - The agent UID
     * 
     * @returns { Promise<void> }
    public async registerNetworkAgent(
        networkId: TNetworkId_S,
        address: TAddress,
        clientId: TClientId,
        uid: TAgentOwnUId,
    ): Promise<void> {
        const key: string = `networks/${networkId}/agents/${clientId}`;

        await this.client.hset(key, {
            'data-usage': '0',
            'address': address,
            'name': uid,
            'registerAt': new Date().toISOString(),
        });

        await this.client.expire(key, 500);

        await this.networkAgentRedisSortedSet
            .registerAgent(
                networkId,
                clientId,
            );
    }
     */

    /**
     * Caches the data usage for a network agent to be pushed periodically.
     * 
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TClientId } clientId - The socket ID
     * @param { number } usage - The data usage in bytes
     */
    public registerDataUsage(
        networkId: TNetworkId_S,
        clientId: TClientId,
        usage: number,
    ): void {
        const key: string = `networks/${networkId}/agents/${clientId}`;

        const cashedDataUsage: number | undefined = this.cashedDataUsage.get(clientId);

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