/**
 * Emitting events on the Redis client.
 */
import type { RedisClient } from 'bun';

export class NetworkAgentRedisEvents {

    constructor(
        private readonly _client: RedisClient,
    ) {}

}
