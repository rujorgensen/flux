import { RedisClient } from 'bun';

export type TRedisEventChannel = string & { __brand: 'redis-event-channel'; };
export type MessageCallback = (message: string, channel: TRedisEventChannel) => unknown;

export class BunRedisPubSub {

    // Needs two clients, one for publishing and one for subscribing
    private readonly publisher: RedisClient;
    private readonly subscriber: RedisClient;

    // Map to track callback wrappers for proper unsubscription
    private readonly callbackMap = new Map<MessageCallback, (message: string, channel: string) => void>();

    // Track active subscriptions so we can cleanly unsubscribe on disconnect
    private readonly _subscribedChannels = new Set<string>();
    private _disconnected = false;

    constructor(
        private readonly _options: {
            name?: string, // Optional name for the client to tell them apart in the logs
            url: string,
            socket: {
                reconnectStrategy: (
                    retries: number,
                ) => number,
            },
        },
    ) {
        // Create publisher client
        this.publisher = new RedisClient(
            this._options.url,
            {
                autoReconnect: false,
            },
        );

        // Set up event handlers for publisher
        this.publisher.onconnect = () => {
            console.log(`${this._options.name ? `[${this._options.name}]` : ''}✅ Redis pub/sub publisher ready`);
        };

        this.publisher.onclose = (error) => {
            if (this._disconnected) {
                return;
            }

            console.error(`${this._options.name ? `[${this._options.name}]` : ''}❌ Redis pub/sub publisher error:`, error);
            console.warn(`${this._options.name ? `[${this._options.name}]` : ''}🚫 Redis pub/sub publisher connection closed`);
        };

        // Create subscriber client
        this.subscriber = new RedisClient(
            this._options.url,
            {
                autoReconnect: false,
            },
        );

        // Set up event handlers for subscriber
        this.subscriber.onconnect = () => {
            console.log(`${this._options.name ? `[${this._options.name}]` : ''}✅ Redis pub/sub subscriber ready`);
        };

        this.subscriber.onclose = (error) => {
            if (this._disconnected) {
                return;
            }

            console.error(`${this._options.name ? `[${this._options.name}]` : ''}❌ Redis pub/sub subscriber error:`, error);
            console.warn(`${this._options.name ? `[${this._options.name}]` : ''}🚫 Redis pub/sub subscriber connection closed`);
        };
    }

    /**
     * Connects both the publisher and subscriber clients.
     */
    public async connect(

    ) {
        await Promise.all([
            this.publisher.connect(),
            this.subscriber.connect(),
        ]);
    }

    /**
     * Publishes a message to the given address.
     */
    public async publish(
        address: string,
        message: string,
    ): Promise<number> {
        try {
            return await this.publisher.publish(address, message);
        } catch {
            console.log('publish failed');
            return 0;
        }
    }

    /**
     * Subscribes to messages on the given channel.
     */
    public async subscribe(
        channelId: string,
        callback: MessageCallback,
    ): Promise<void> {
        try {
            // Create wrapper that adapts Bun's callback signature to our signature
            const wrappedCallback = (
                message: string,
                channel: string,
            ) => {
                if (this._disconnected) return;
                callback(message, channel as TRedisEventChannel);
            };

            // Store the mapping for unsubscribe
            this.callbackMap.set(callback, wrappedCallback);
            this._subscribedChannels.add(channelId);

            await this.subscriber.subscribe(channelId, wrappedCallback);
        } catch {
            console.log('error caught #2');
        }
    }

    /**
     * Unsubscribes from messages on the given channel.
     */
    public async unsubscribe(
        channelId: string,
        callback?: MessageCallback,
    ): Promise<void> {
        try {
            this._subscribedChannels.delete(channelId);

            if (callback) {
                // Get the wrapped callback we used in subscribe
                const wrappedCallback = this.callbackMap.get(callback);
                if (wrappedCallback) {
                    await this.subscriber.unsubscribe(channelId, wrappedCallback);
                    this.callbackMap.delete(callback);
                } else {
                    // Fallback: unsubscribe from channel entirely
                    await this.subscriber.unsubscribe(channelId);
                }
            } else {
                // Unsubscribe from the channel entirely
                await this.subscriber.unsubscribe(channelId);
            }
        } catch {
            console.log('error caught #1');
        }
    }

    /**
     * Disconnects the Redis pub/sub client.
     *
     * Unsubscribes from all active channels before clearing state. This
     * cleanly terminates Bun's internal subscription read-loop so that when
     * the underlying Redis server (e.g. a test container) is stopped
     * afterwards, there is no longer an active subscription that would fire
     * an unhandled `ERR_REDIS_CONNECTION_CLOSED` rejection.
     *
     * @returns { Promise<void> }
     */
    public async disconnect(

    ): Promise<void> {
        if (this._disconnected) return;
        this._disconnected = true;

        // Cleanly unsubscribe from every tracked channel so Bun's internal
        // subscription loop terminates gracefully before the connection drops.
        for (const channelId of this._subscribedChannels) {
            void this.subscriber
                .unsubscribe(channelId)
                // Ignore errors — connection may already be closing
                .catch();
        }

        this._subscribedChannels.clear();
        this.callbackMap.clear();
    }
}
