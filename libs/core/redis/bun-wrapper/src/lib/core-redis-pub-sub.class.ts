import { BunRedisClient } from '@core/redis/bun';
import { RedisClient } from 'bun';
export type TRedisEventChannel = string & { __brand: 'redis-event-channel'; };
export type MessageCallback = (message: string, channel: TRedisEventChannel) => unknown;

export class BunRedisPubSub {
    // Needs two clients, one for publishing and one for subscribing
    private readonly publisher: BunRedisClient;
    private readonly subscriber: BunRedisClient;

    // Keeps track of subscriptions, for reconnections
    private readonly handlers: Map<string, Set<RedisClient.StringPubSubListener>> = new Map();

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
        this.publisher = new BunRedisClient(this._options);

        // Restore connections on reconnect
        this.publisher
            .on('ready', async () => {
                await this.restoreSubscriptions();
                console.log('Reconnected and subscriptions restored.');
            })
            .on('error', (error) => {
                console.error(`${this._options.name ? `[${this._options.name}]` : ''}❌ Redis pub/sub client error:`, error.message);
            })
            .on('reconnecting', () => {
                console.log(`${this._options.name ? `[${this._options.name}]` : ''}🔄 Redis pub/sub reconnecting...`);
            })
            .on('ready', () => {
                console.log(`${this._options.name ? `[${this._options.name}]` : ''}✅ Redis pub/sub client ready`);
            })
            .on('end', () => {
                console.warn(`${this._options.name ? `[${this._options.name}]` : ''}🚫 Redis pub/sub connection closed`);
            });

        // * Create Redis subscriber
        this.subscriber = this.publisher.clone();
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
        await this.connect();
        await this.publisher.getClient().publish(address, message);
    }

    /**
     * 
     * @param channel
     * @param message
     * 
     * @returns { void }
     */
    public async publishInternally(
        channel: string,
        message: string,
    ): Promise<void> {
        const listeners = this.handlers.get(channel);
        if (listeners) {
            for (const cb of listeners) {
                cb(channel, message);
            }
        }
    }

    public async subscribe(
        channelId: string,
        callback: RedisClient.StringPubSubListener,
    ) {
        await this.connect();

        if (!this.handlers.has(channelId)) {
            this.handlers.set(channelId, new Set());
        }

        await this.subscriber.getClient().subscribe(channelId, callback);

        this.handlers.get(channelId)?.add(callback);
    }

    public async unsubscribe(
        channel: string,
        handler?: RedisClient.StringPubSubListener,
    ) {

        if (this.subscriber.connected) {
            await this.subscriber.getClient().unsubscribe(channel);
        }

        const listeners = this.handlers.get(channel);
        if (!listeners) {
            return;
        };

        if (handler) {
            listeners.delete(handler);
        }

        if (!handler || listeners.size === 0) {
            this.handlers.delete(channel);
        }
    }

    public async disconnect(

    ) {
        this.handlers.clear();
        this.subscriber.disconnect();
        this.publisher.disconnect();
    }

    private async restoreSubscriptions(

    ) {
        for (const [channel, handlers] of this.handlers.entries()) {
            for (const handler of handlers) {
                await this.subscriber.getClient().subscribe(channel, handler);
            }
        }
    }

}