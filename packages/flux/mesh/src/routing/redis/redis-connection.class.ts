import {
    type RedisClientType,
    createClient,
} from 'redis';
import type { TAddress, TClientId, TProcessAddress } from '@flux/shared/types';
import { RedisSortedSet } from './hash/network-authority.redis.sorted-set';
import { NetworkClientHash } from './hash/network-client.redis.hash';

let redisConnection: RedisConnection | undefined;

const FLUX_REDIS_URL: string | undefined = process.env['FLUX_REDIS_URL'];

if (!FLUX_REDIS_URL) {
    throw new Error('Missing FLUX_REDIS_URL in .env');
}

/**
 * Singleton function to get the Redis connection
 *
 * @returns
 */
export const getRedisConnection = (

) => {
    if (!redisConnection) {
        redisConnection = new RedisConnection(FLUX_REDIS_URL);
    }

    return redisConnection;
};

export type MessageCallback = (message: string) => unknown;

export class RedisConnection {
    // implements Notifier
    private readonly subscribers: Map<
        MessageCallback,
        (data: string, channel: string) => unknown
    >;

    // Needs two clients, one for publishing and one for subscribing
    private readonly publisher: RedisClientType;
    private readonly subscriber: RedisClientType;

    public readonly networkAuthoritySet: RedisSortedSet;
    public readonly networkClientHash: NetworkClientHash;

    constructor(
        private readonly url: string,
    ) {
        this.subscribers = new Map();
        this.publisher = createClient({
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
            this.publisher.connect();
        } catch {
            console.log('caught');
        }

        this.publisher
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

        this.networkAuthoritySet = new RedisSortedSet(this.publisher);
        this.networkClientHash = new NetworkClientHash(this.publisher);

        // *** Create Redis subscriber

    /**
     * 
     * @param address
     * @param message
     * 
     * @returns { void }
     */
    public send(
        address: TAddress | TProcessAddress,
        message: string,
    ): void {
        console.log('about to publish');

        try {
            this.publisher.publish(address, message).catch(() => {
                console.log(`Error caught while publishing to channel`);
            });
        } catch {
            console.log('publish failde');
        }
    }

    public async setConnected(
        address: string,
    ): Promise<void> {
        //  await this.client
        //      .set([address], '1', { EX: 5 });
        // console.log("setting", new Date().toISOString());

        await this.publisher.hSet(`machines/processes/${address}`, {
            status: 'connected',
            updatedAt: new Date().toISOString(),
        });

        await this.publisher.expire(address, 5);
    }

    public subscribe(
        channelId: TProcessAddress | TClientId,
        callback: MessageCallback
    ): void {
        try {
            const redisCallback = (message: string) => callback(message);

            this.subscriber.subscribe(channelId, redisCallback);
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

            this.publisher.unsubscribe(channelId, redisCallback);
            this.subscribers.delete(callback);
        } catch {
            console.log('error caught #1');
        }
    }
}
