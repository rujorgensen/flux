/**
 * A connected channel.
 */

import type {
    TChannelName,
} from '@flux/shared/types';
import type {
    FluxWebSocketConnection,
} from './flux-ws-connection';
import type { BunRedisClient } from '@core/redis/bun';

/**
 * Key prefix used for storing the latest channel values in Redis
 */
const REDIS_CHANNEL_LATEST_VALUE_PREFIX = 'channel-latest-values';

export class FluxNetworkChannel {
    private _redisClient: Promise<BunRedisClient> | undefined;

    constructor(
        public readonly channelName: TChannelName,
        private readonly _fluxWebSocketConnection: FluxWebSocketConnection,
    ) { }

    /**
     * Broadcasts a message to the channel.
     * 
     * @param { string } channelName
     * 
     * @returns { void }
     */
    public publish<T>(
        message: string | T,
    ): void {
        // Store the latest message in Redis
        this.storeLatestValue(message);

        this._fluxWebSocketConnection
            .publish(
                this.channelName,
                message,
            );
    }

    /**
     * Listen to messages on this channel.
     * 
     * @param { TMessageCallback } fn - Callback function to handle messages
     * @param { boolean } emitLatestValue - Whether to emit the latest value immediately when subscribing
     *                                      If true, the server will send the latest message that was
     *                                      published to the channel immediately after subscription
     * 
     * @returns { void }
     */
    public onPublish<T>(
        fn: (message: string | T) => void,
        emitLatestValue: boolean = false,
    ): void {
        this._fluxWebSocketConnection
            .onPublish(
                this.channelName,
                (message: string | T) => {
                    // Store the latest message in Redis
                    this.storeLatestValue(message);
                    fn(message);
                }
                (fn as any), // TODO
                emitLatestValue,
            );
    }

    /**
     * Get the latest value published on this channel.
     * 
     * @returns { unknown } The latest value published on this channel or undefined if no message has been published
     */
    public async readLatestValue<T>(

    ): Promise<T | undefined> {
        const redisClient = await this.getRedisClient();
        if (!redisClient) {
            console.warn('Redis client is not available, unable to retrieve latest channel value');
            return undefined;
        }

        const key = this.getRedisKey();
        const client = redisClient.getClient();

        try {
            const value = await client.get(key);
            if (!value) return undefined;

            // Parse the value based on the stored format
            if (value.startsWith('o:')) {
                // This is a JSON object
                try {
                    return JSON.parse(value.substring(2)) as T;
                } catch (err) {
                    console.error(`Failed to parse JSON value for channel ${this.channelName}:`, err);
                    return undefined;
                }
            } else {
                // This is a string
                return value as unknown as T;
            }
        } catch (err) {
            console.error(`Error retrieving latest value for channel ${this.channelName}:`, err);
            return undefined;
        }
    }

    /**
     * Stores the latest value published on this channel in Redis
     * 
     * @private
     * @param message The message to store
     */
    private async storeLatestValue<T>(
        message: string | T,
    ): Promise<void> {
        const redisClient = await this.getRedisClient();
        if (!redisClient) {
            console.warn('Redis client is not available, unable to store latest channel value');
            return;
        }

        const key = this.getRedisKey();
        const client = redisClient.getClient();

        try {
            // Store the value based on its type
            const valueToStore = typeof message === 'string' ?
                message :
                `o:${JSON.stringify(message)}`;

            await client.set(key, valueToStore);
        } catch (err) {
            console.error(`Error storing latest value for channel ${this.channelName}:`, err);
        }
    }

    /**
     * Gets the Redis client, initializing it if necessary
     * 
     * @private
     * @returns The Redis client, or undefined if it could not be initialized
     */
    private async getRedisClient(): Promise<BunRedisClient | undefined> {
        if (!this._redisClient) {
            try {
                // Dynamic import to avoid circular dependencies
                const { getMeshBunRedisConnection } = await import('@flux/mesh/core/redis');
                this._redisClient = getMeshBunRedisConnection();
            } catch (err) {
                console.error('Failed to initialize Redis client:', err);
                return undefined;
            }
        }
        return this._redisClient;
    }

    /**
     * Gets the Redis key for storing this channel's latest value
     * 
     * @private
     * @returns The Redis key
     */
    private getRedisKey(): string {
        return `${REDIS_CHANNEL_LATEST_VALUE_PREFIX}:${this.channelName}`;
    }
}