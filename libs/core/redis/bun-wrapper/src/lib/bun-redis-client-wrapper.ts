import { RedisClient } from 'bun';
import { EventEmitter } from '@flux/shared/utils';

type MessageHandler = (channel: string, message: string) => void;

export class BunRedisClient extends EventEmitter<{
    error: Error,
    reconnecting: unknown,
    ready: unknown,
    end: unknown,
}> {
    public connected = false;
    private client: RedisClient;
    private readonly handlers: Map<string, Set<MessageHandler>> = new Map();
    private reconnecting = false;
    private disconnected = false;

    private reconnectAttempts = 0;
    private readonly maxReconnects: number | null = null;
    private readonly baseDelayMilliseconds = 200;
    private readonly maxDelayMilliseconds = 2_000;

    constructor(
        private readonly options: {
            url: string,
            socket: {
                reconnectStrategy: (
                    retries: number,
                ) => number,
            },
        },
    ) {
        super();

        this.client = new RedisClient(
            this.options.url,
            {
                // We're providing our own implementation
                autoReconnect: false,
                idleTimeout: 0,
            },
        );
    }

    /**
     * Returns the raw Redis client.
     * 
     * ! Please note that this may be re-instantiated on reconnections,
     * ! so make sure to request this continuously, if used.
     */
    public getClient(

    ): RedisClient {
        return this.client;
    }

    /**
     * Creates a new independent instance of this client with the same options.
     */
    public clone(

    ): BunRedisClient {
        return new BunRedisClient(this.options);
    }

    /**
     * Returns the connection URL with the password masked for safe display.
     */
    public getUrl(

    ): string {
        try {
            const parsed = new URL(this.options.url);

            if (parsed.password) {
                parsed.password = '***';
            }

            return parsed.toString();
        } catch {
            return this.options.url;
        }
    }

    /**
     * Connects to the Redis server.
     */
    public async connect(

    ): Promise<void> {
        if (this.reconnecting) {
            return;
        }

        await this.connect_();
    }

    /**
     * Internal connection helper that handles the actual connection logic.
     */
    private async connect_(

    ): Promise<void> {
        if (this.connected) {
            return;
        }

        if (this.disconnected) {
            return;
        }

        try {
            await this.client.connect();

            if (!this.client.connected) {
                throw new Error('Unexpected error.');
            }

            this.connected = true;
            this.emit('ready', void 0);
            this.reconnectAttempts = 0;

            this.client.onclose = (error) => {
                if (this.disconnected) {
                    return;
                }
                console.error('⬇️ Redis client disconnected:', error);
                this.connected = false;
                this.emit('end', void 0);
                void this.retryReconnect();
            };
        } catch (error) {
            console.error('Initial Redis connection failed:', error);
            this.connected = false;
            this.emit('error', error instanceof Error ? error : new Error('Unknown error'));
            void this.retryReconnect();
        }
    }

    /**
     * Retries the connection with exponential backoff until the max reconnect attempts are reached.
     */
    private async retryReconnect(

    ) {
        if (this.reconnecting || this.disconnected) {
            return;
        }

        this.reconnecting = true;

        while (!this.connected && (this.reconnectAttempts <= (this.maxReconnects ?? Number.POSITIVE_INFINITY))) {
            // oxlint-disable-next-line typescript/no-unnecessary-condition
            const delay: number = this.options.socket.reconnectStrategy(this.reconnectAttempts) ?? Math.min(this.baseDelayMilliseconds * 2 ** this.reconnectAttempts, this.maxDelayMilliseconds);

            this.emit('reconnecting', void 0);
            console.log(this.options.url, `Reconnecting (${this.reconnectAttempts}) to Redis in ${delay}ms...`);

            await new Promise(res => setTimeout(res, delay));
            this.reconnectAttempts++;

            try {
                /**
                 * Bun v. 1.2.16 appears to have an issue causing requiring a new instance rather than being able to use client.connect() directly.
                 */
                this.client = new RedisClient(
                    this.options.url,
                    {
                        // We're providing our own implementation
                        autoReconnect: false,
                        connectionTimeout: 20_000,
                        // idleTimeout: 0,
                    },
                );
                await this.connect_();
                console.log('✅ Redis client reconnected');

                break;
            } catch (error) {
                this.emit('error', error instanceof Error ? error : new Error('Reconnection attempt failed: Unknown error'));
            }
        }

        if (!this.connected) {
            this.emit('error', new Error('Max reconnection attempts reached. Will not retry.'));
        }

        this.reconnecting = false;
    }

    /**
     * Disconnects the Redis client and clears all handlers.
     */
    public disconnect(

    ) {
        this.disconnected = true;
        this.handlers.clear();
        this.connected = false;
        // Do not call this.client.close() — Bun's RedisClient fires ERR_REDIS_CONNECTION_CLOSED
        // asynchronously (bypassing try/catch) when the connection is already closed.
        // Setting disconnected = true is sufficient: the onclose callback and retryReconnect
        // loop both check this flag and exit early, preventing any unhandled errors.
    }
}