import type { TProcessAddress } from '@flux/shared/types';
import { RedisConnection } from '../../routing/redis/redis-connection.class';

export class ProcessClass {

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {}

    /**
     * Marks the given address as connected in Redis.
     */
    public async setConnected(
        processAddress: TProcessAddress,
    ): Promise<void> {
        await this._redisConnection.hash.hset(
            `machines/processes/${processAddress}`,
            {
                'status': 'connected',
                'updatedAt': new Date().toISOString(),
            },
        );
    }

    /**
     * Marks the given address as disconnected in Redis.
     */
    public async setDisconnected(
        processAddress: TProcessAddress,
    ): Promise<void> {
        await this._redisConnection.hash.hset(
            `machines/processes/${processAddress}`,
            {
                'status': 'disconnected',
                'updatedAt': new Date().toISOString(),
            },
        );
    }

}