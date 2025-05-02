import { NetworkChannelHash } from '../../routing/redis/hash/network-channel.redis.hash';
import {
    type RedisConnection,
    getRedisConnection,
} from '../../routing/redis/redis-connection.class';
import type { GlobalChannelPubsub } from '../../routing/global-channel/global-channel-pubsub.class';

export class NetworkChannelManager {
    private readonly redisConnection: RedisConnection = getRedisConnection();
    private readonly networkChannelHash: NetworkChannelHash = new NetworkChannelHash(
        this.redisConnection,
    );

    constructor(
        private readonly _globalChannelPubsub: GlobalChannelPubsub,
    ) { }
}