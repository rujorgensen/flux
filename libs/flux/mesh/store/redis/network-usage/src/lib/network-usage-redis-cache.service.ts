/**
 * Loopkup a client address by UID
 */
import type { RedisClient } from 'bun';
import type {
    TNetworkId_S,
} from '@flux/shared/types';

// const LIMIT: number = 1000000;

export class NetworkUsageRedisCacheService {

    constructor(
        private readonly _client: RedisClient,
    ) { }

    /**
     * Returns the number of bytes used by the network.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { number }        bytes
     * @param { number }        packets
     * 
     * @returns { Promise<number> }
     */
    public async increaseNetworkUsage(
        networkId: TNetworkId_S,
        bytes: number,
        packets: number,
    ): Promise<number> {
        const key: string = `networks/${networkId}/data`;

        await this._client.hincrby(key, 'packets', packets);
        return await this._client.hincrby(key, 'bytes', bytes);
    }

    public async readNetworkUsageBytes(
        networkId: TNetworkId_S,
    ): Promise<number> {
        const key: string = `networks/${networkId}/data`;

        const [bytes] = await this._client.hmget(key, ['bytes']);

        if (!bytes) {
            return 0;
        }

        return Number.parseInt(bytes, 10);
    }

    /**
     * Locks a network due to exessive usage.
     * 
     * @param { TNetworkId_S }  networkId
     * 
     * @returns { Promise<void> }
     */
    private async lockNetworkUsage(
        networkId: TNetworkId_S,
    ): Promise<void> {
        const key: string = `networks/${networkId}/data`;

        // Set the lock
        await this._client.hmset(key, ['locked', '1']);

        // Auto-expire the lock
        await this._client.send('HEXPIRE', [key, '60', 'FIELDS', '1', 'locked',]);
    }
}
