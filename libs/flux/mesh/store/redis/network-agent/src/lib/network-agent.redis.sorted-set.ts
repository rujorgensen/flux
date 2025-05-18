import type {
    RedisClient,
} from 'bun';
import type {
    TAddress,
    TNetworkId_S,
} from '@flux/shared/types';

export class NetworkAgentRedisSortedSet {

    constructor(
        private readonly client: RedisClient,
    ) { }

    /**
     * Registers a network agent in the sorted set.
     * 
     * @param { TNetworkId_S } networkId
     * @param { TClientId } socketId
     * 
     * @returns { Promise<void> }
     */
    public async registerAgent(
        networkId: TNetworkId_S,
        address: TAddress,
    ): Promise<void> {
        await this.client.send('ZADD', [
            `networks/${networkId}/agents`, // Key
            `${Date.now()}`, // Score
            address, // Member
        ]);
    }

    /**
     * Unregisters a network agent from the sorted set.
     * 
     * @param { TNetworkId_S } networkId
     * @param { TClientId } socketId
     * 
     * @returns { Promise<number> }
     */
    public async unregisterAgent(
        networkId: TNetworkId_S,
        address: TAddress,
    ): Promise<number> {
        return await this.client.send('ZREM', [
            `networks/${networkId}/agents`,
            address, // Member
        ]);
    }
}
