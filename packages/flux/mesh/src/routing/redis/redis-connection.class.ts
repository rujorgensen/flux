import {
    BunRedisClientType,
    BunRedisPubSub,
} from '@core/redis/bun';
import type { TAddress, TClientId, TProcessAddress } from '@flux/shared/types';
import { NetworkAuthorityRedisSortedSet } from './hash/network-authority.redis.sorted-set';
import { NetworkClientHash } from './hash/network-client.redis.hash';

let redisConnection: RedisConnection | undefined;

const FLUX_MESH_REDIS_URL: string | undefined = process.env.FLUX_MESH_REDIS_URL;

if (!FLUX_MESH_REDIS_URL) {
    throw new Error('Missing FLUX_MESH_REDIS_URL in .env');
}

/**
 * Singleton function to get the Redis connection
 *
 * @returns
 */
export const getRedisConnection = (

) => {
    redisConnection ??= new RedisConnection(FLUX_MESH_REDIS_URL);

    return redisConnection;
};

export type MessageCallback = (message: string) => unknown;

export class RedisConnection {
    // implements Notifier
    private readonly subscribers: Map<
        MessageCallback,
        (data: string, channel: string) => unknown
    >;

    // Dedicated client for handling hash
    private readonly cacheClient: BunRedisClientType;

    // Dedicated clients for handling pub/sub
    private readonly pubSub: BunRedisPubSub;

    public readonly networkAuthoritySet: NetworkAuthorityRedisSortedSet;
    public readonly networkClientHash: NetworkClientHash;

    // Wrapper to not expose BunRedisClientType functions
    public readonly hash;

    constructor(
        private readonly url: string,
    ) {
        this.subscribers = new Map();
        this.cacheClient = new BunRedisClientType({
            url: this.url,
            socket: {
                reconnectStrategy: (
                    retries: number,
                ) => {
                    // if (retries > 10) {
                    //     console.error('❌ Redis reconnect failed after 10 attempts.');
                    //     return new Error('Redis reconnect limit reached');
                    // }

                    console.warn(`🔄 Redis reconnection attempt #${retries}`);

                    // Backoff in ms
                    return Math.min(retries * 100, 3_000);
                },
            },
        });

        try {
            this.cacheClient.connect();
        } catch {
            console.log('caught');
        }

        this.cacheClient
            .on('error', (error) => {
                console.error('❌ Redis client error:', error.message);

                // Socket closed unexpectedly
                // Failed to connect
            })
            .on('reconnecting', () => {
                console.log('🔄 Redis reconnecting...');
            })
            .on('ready', () => {
                console.log('✅ Redis client ready');
            })
            .on('end', () => {
                console.warn('🚫 Redis connection closed');
            });

        this.networkAuthoritySet = new NetworkAuthorityRedisSortedSet(this.cacheClient.getClient());
        this.networkClientHash = new NetworkClientHash(this.cacheClient.getClient());

        // *** Create Redis subscriber
        this.pubSub = new BunRedisPubSub(
            {
                url: this.url,
                socket: {
                    reconnectStrategy: (
                        retries: number,
                    ) => {
                        console.warn(`🔄 Redis reconnection attempt #${retries}`);

                        // Backoff in ms
                        return Math.min(retries * 100, 3_000);
                    },
                },
            });

        try {
            this.pubSub.connect();
        } catch {
            console.log('caught');
        }

        // Dedicated client
        const hashClient = this.cacheClient.getClient();

        this.hash = {
            sadd: hashClient.sadd.bind(hashClient),
            hmset: hashClient.hmset.bind(hashClient),
            smembers: hashClient.smembers.bind(hashClient),
            srem: hashClient.srem.bind(hashClient),
            del: hashClient.del.bind(hashClient),
            hincrby: hashClient.hincrby.bind(hashClient),
            expire: hashClient.expire.bind(hashClient),
        };
    }

    /**
     * 
     * @param address
     * @param message
     * 
     * @returns { void }
     */
    public async publish(
        address: TAddress | TProcessAddress,
        message: string,
    ): Promise<void> {
        try {
            await this.pubSub.publish(address, message);
        } catch {
            console.error(`Publish failed on address: ${address}`);
        }
    }

    public async setConnected(
        address: string,
    ): Promise<void> {
        //  await this.client
        //      .set([address], '1', { EX: 5 });
        // console.log("setting", new Date().toISOString());
        await this.hash.hmset(`machines/processes/${address}`, [
            'status', 'connected',
            'updatedAt', new Date().toISOString(),
        ]);

        await this.hash.expire(`machines/processes/${address}`, 5);
    }

    public subscribe(
        channelId: TProcessAddress | TClientId,
        callback: MessageCallback
    ): void {
        try {
            const redisCallback = (message: string) => callback(message);

            this.pubSub.subscribe(channelId, redisCallback);
            this.subscribers.set(callback, redisCallback);
        } catch {
            console.log('error caught #2');
        }
    }

    public unsubscribe(
        channelId: string,
        callback: MessageCallback,
    ): void {
        try {
            const redisCallback = this.subscribers.get(callback);

            if (!redisCallback) {
                return;
            }

            this.pubSub.unsubscribe(channelId, redisCallback);
            this.subscribers.delete(callback);
        } catch {
            console.log('error caught #1');
        }
    }
}
