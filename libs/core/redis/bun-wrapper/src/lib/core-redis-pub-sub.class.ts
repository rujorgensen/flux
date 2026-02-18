import { RedisClient } from 'bun';

export type TRedisEventChannel = string & { __brand: 'redis-event-channel'; };
export type MessageCallback = (message: string, channel: TRedisEventChannel) => unknown;

export class BunRedisPubSub {

    // Needs two clients, one for publishing and one for subscribing
    private readonly publisher: RedisClient;
    private readonly subscriber: RedisClient;

    // Map to track callback wrappers for proper unsubscription
    private readonly callbackMap = new Map<MessageCallback, (message: string, channel: string) => void>();

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
                autoReconnect: true,
                maxRetries: 10,
            },
        );

        // Set up event handlers for publisher
        this.publisher.onconnect = () => {
            console.log(`${this._options.name ? `[${this._options.name}]` : ''}✅ Redis pub/sub publisher ready`);
        };

        this.publisher.onclose = (error) => {
            if (error) {
                console.error(`${this._options.name ? `[${this._options.name}]` : ''}❌ Redis pub/sub publisher error:`, error);
            }
            console.warn(`${this._options.name ? `[${this._options.name}]` : ''}🚫 Redis pub/sub publisher connection closed`);
        };

        // Create subscriber client
        this.subscriber = new RedisClient(
            this._options.url,
            {
                autoReconnect: true,
                maxRetries: 10,
            },
        );

        // Set up event handlers for subscriber
        this.subscriber.onconnect = () => {
            console.log(`${this._options.name ? `[${this._options.name}]` : ''}✅ Redis pub/sub subscriber ready`);
        };

        this.subscriber.onclose = (error) => {
            if (error) {
                console.error(`${this._options.name ? `[${this._options.name}]` : ''}❌ Redis pub/sub subscriber error:`, error);
            }
            console.warn(`${this._options.name ? `[${this._options.name}]` : ''}🚫 Redis pub/sub subscriber connection closed`);
        };
    }

    public async connect(

    ) {
        await Promise.all([
            this.publisher.connect(),
            this.subscriber.connect(),
        ]);
    }

    /**
     * 
     * @param address
     * @param message
     * 
     * @returns { void }
     */
    public async publish(
        address: string,
        message: string,
    ): Promise<void> {
        try {
            await this.publisher.publish(address, message);
        } catch {
            console.log('publish failed');
        }
    }

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
                callback(message, channel as TRedisEventChannel);
            };

            // Store the mapping for unsubscribe
            this.callbackMap.set(callback, wrappedCallback);

            await this.subscriber.subscribe(channelId, wrappedCallback);
        } catch {
            console.log('error caught #2');
        }
    }

    public async unsubscribe(
        channelId: string,
        callback?: MessageCallback,
    ): Promise<void> {
        try {
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
     * Disconnects the Redis client and the subscriber.
     * 
     * @returns { void }
     */
    public disconnect(

    ) {
        this.callbackMap.clear();
        this.subscriber.close();
        this.publisher.close();
    }
}
