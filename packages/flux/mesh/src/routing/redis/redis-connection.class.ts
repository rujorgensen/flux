import {
    type TRedisEventChannel,
    BunRedisClient,
    BunRedisPubSub,
} from '@core/redis/bun';
import type { TAddress, TClientId, TProcessAddress } from '@flux/shared/types';
import { NetworkAuthorityRedisSortedSet } from '@flux/mesh/store/redis/network-authority';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import type { TGlobalChannel } from '../global-channel/global-channel-pubsub.class';

let redisConnection: RedisConnection | undefined;

if (!process.env['FLUX_MESH_REDIS_URL']) {
    throw new Error('Missing FLUX_MESH_REDIS_URL in .env');
}

/**
 * Singleton function to get the Redis connection.
 * 
 * @param { string } [connectionString] - Optional connection string override
 * 
 * @returns { RedisConnection } The singleton Redis connection
 */
export const getMeshRedisConnection = (
    connectionString?: string,
) => {
    // We have to read the env variable here, because otherwise it can't be modified in tests
    redisConnection ??= new RedisConnection(process.env['FLUX_MESH_REDIS_URL'] as string);

    return redisConnection;
};

export type MessageCallback = (message: string, channel?: string) => unknown;

export class RedisConnection {
    // Dedicated client for handling hash
    private readonly cacheClient: BunRedisClient;

    // Dedicated clients for handling pub/sub
    private readonly pubSub: BunRedisPubSub;

    public readonly networkAuthoritySet: NetworkAuthorityRedisSortedSet;
    public readonly networkAgentRedisService: NetworkAgentRedisService;

    // Wrapper to not expose BunRedisClient functions
    public readonly hash;

    constructor(
        private readonly _optionsOrURL: string | {
            name?: string, // Optional name for the client to tell them apart in the logs
            url: string,
        },
    ) {
        const url = typeof this._optionsOrURL === 'string'
            ? this._optionsOrURL
            : this._optionsOrURL.url;

        this.cacheClient = new BunRedisClient({
            url,
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
        this.networkAgentRedisService = new NetworkAgentRedisService(this.cacheClient.getClient());

        // *** Create Redis subscriber
        this.pubSub = new BunRedisPubSub(
            {
                name: (typeof this._optionsOrURL === 'object') ? this._optionsOrURL.name : undefined,
                url,
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

        this.pubSub
            .connect()
            .catch(() => console.error('pubsub connection failed'));

        // Dedicated client
        const hashClient = this.cacheClient.getClient();

        this.hash = {
            sadd: hashClient.sadd.bind(hashClient),
            hset: hashClient.hset.bind(hashClient),
            smembers: hashClient.smembers.bind(hashClient),
            srem: hashClient.srem.bind(hashClient),
            scard: hashClient.scard.bind(hashClient),
            del: hashClient.del.bind(hashClient),
            hincrby: hashClient.hincrby.bind(hashClient),
            hmget: hashClient.hmget.bind(hashClient),
            expire: hashClient.expire.bind(hashClient),
        };
    }

    // ****************************************************************************
    // *** Publish To All Channels
    // ****************************************************************************

    /**
     * Publishes a websocket channel event to all processes, except the one specified.
     */
    public async publishWebsocketChannelEvent(
        skipProcessAddress: TProcessAddress,
        channel: TGlobalChannel,
        message: string,
    ): Promise<void> {
        try {
            await this.pubSub.publish(`~${channel}`, `${skipProcessAddress}:${message}`);
        } catch {
            console.error(`Publish failed on global channel event: '${channel}'`);
        }
    }

    /**
     * Subscribes to websocket channel events from all processes.
     */
    public async subscribeWebsocketChannelEvent(
        callback: (
            channel: TGlobalChannel,
            skipProcessAddress: TProcessAddress,
            message: string,
        ) => unknown,
    ): Promise<void> {
        try {
            await this.pubSub.subscribe('~*', (
                message: string,
                preFixedChannel: TRedisEventChannel,
            ) => {
                const index = message.indexOf(':');

                const [skipProcessAddress, message_] = index !== -1
                    ? [message.slice(0, index), message.slice(index + 1)]
                    : [message, ''];

                callback(
                    preFixedChannel.slice(1) as TGlobalChannel,
                    skipProcessAddress as TProcessAddress,
                    message_,
                );
            });
        } catch {
            console.log('Error caught while subscribing to websocket channel event globally');
        }
    }

    // ****************************************************************************
    // *** Publish Directly to Address
    // ****************************************************************************

    /**
     * Publishes a message directly to an address.
     */
    public async directPublish(
        address: TAddress | TProcessAddress,
        message: string,
    ): Promise<void> {
        try {
            await this.pubSub.publish(address, message);
        } catch {
            console.error(`Publish failed on address: ${address}`);
        }
    }

    /**
     * Subscribes to messages on a Redis channel.
     */
    public subscribe(
        channelId: TProcessAddress | TClientId,
        callback: MessageCallback
    ): void {
        try {
            const redisCallback = (message: string) => callback(message);

            this.pubSub.subscribe(channelId, redisCallback);
        } catch {
            console.log('error caught #2');
        }
    }

    /**
     * Unsubscribes from messages on a Redis channel.
     */
    public unsubscribe(
        channelId: string,
        callback: MessageCallback,
    ): void {
        try {
            this.pubSub.unsubscribe(channelId, callback);
        } catch {
            console.log('error caught #1');
        }
    }

    /**
     * Subscribes to data packets published on a specific network channel.
     * Invokes the callback with the raw data string from each packet.
     */
    public subscribeToNetworkChannel(
        networkId: string,
        channelName: string,
        callback: (data: string) => void,
    ): void {
        try {
            const redisKey = `~networks/${networkId}/channels/${channelName}`;

            this.pubSub.subscribe(redisKey, (message: string) => {
                // message format: {processAddress}:nc-on-pub:{channelName}:{data}
                const firstColon = message.indexOf(':');
                const withoutProcess = firstColon !== -1 ? message.slice(firstColon + 1) : message;

                // withoutProcess: nc-on-pub:{channelName}:{data}
                const secondColon = withoutProcess.indexOf(':');
                const withoutCommand = secondColon !== -1 ? withoutProcess.slice(secondColon + 1) : withoutProcess;

                // withoutCommand: {channelName}:{data}
                const thirdColon = withoutCommand.indexOf(':');
                const data = thirdColon !== -1 ? withoutCommand.slice(thirdColon + 1) : withoutCommand;

                callback(data);
            });
        } catch (error) {
            console.error(`Failed to subscribe to network channel '${networkId}/${channelName}':`, error);
        }
    }

    /**
     * Unsubscribes a callback from data packets on a specific network channel.
     */
    public unsubscribeFromNetworkChannel(
        networkId: string,
        channelName: string,
        callback: (data: string) => void,
    ): void {
        try {
            const redisKey = `~networks/${networkId}/channels/${channelName}`;

            this.pubSub.unsubscribe(redisKey, callback as MessageCallback);
        } catch (error) {
            console.error(`Failed to unsubscribe from network channel '${networkId}/${channelName}':`, error);
        }
    }

    /**
     * Marks the given address as connected in Redis.
     */
    public async setConnected(
        address: string,
    ): Promise<void> {
        await this.hash.hset(
            `machines/processes/${address}`,
            {
                'status': 'connected',
                'updatedAt': new Date().toISOString(),
            },
        );

        await this.hash.expire(`machines/processes/${address}`, 5);
    }

    /**
     * Marks the given address as disconnected in Redis.
     */
    public async setDisconnected(
        _address: string,
    ): Promise<void> {
        // !TODO
    }

    /**
     * Disconnects the Redis cache and pub/sub.
     * 
     * @returns { Promise<void> }
     */
    public async disconnect(

    ): Promise<void> {
        this.cacheClient.disconnect();
        await this.pubSub.disconnect();
    }
}
