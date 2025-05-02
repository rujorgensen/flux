import {
    type RedisClientType,
    createClient,
} from 'redis';


export type RedisEventChannel = string & { __brand: 'redis-event-channel'; };
export type MessageCallback = (message: string, channel: RedisEventChannel) => unknown;

export class BunRedisPubSub {

    // Needs two clients, one for publishing and one for subscribing
    private readonly publisher: RedisClientType;
    private readonly subscriber: RedisClientType;

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
        this.publisher = createClient(this._options);

        this.publisher
            .on('error', (error) => {
                console.error(`${this._options.name ? `[${this._options.name}]` : ''}❌ Redis client error:`, error.message);
            })
            .on('reconnecting', () => {
                console.log(`${this._options.name ? `[${this._options.name}]` : ''}🔄 Redis reconnecting...`);
            })
            .on('ready', () => {
                console.log(`${this._options.name ? `[${this._options.name}]` : ''}✅ Redis client ready`);
            })
            .on('end', () => {
                console.warn(`${this._options.name ? `[${this._options.name}]` : ''}🚫 Redis connection closed`);
            });

        // * Create Redis subscriber
        this.subscriber = this.publisher.duplicate();
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
            await this.subscriber.subscribe(channelId, callback);
        } catch {
            console.log('error caught #2');
        }
    }

    public unsubscribe(
        channelId: string,
        callback: MessageCallback,
    ): void {
        try {
            this.publisher.unsubscribe(channelId, callback);
        } catch {
            console.log('error caught #1');
        }
    }

    public disconnect(

    ) {
        this.subscriber.destroy();
        this.publisher.destroy();
    }
}

/*
export class BunRedisPubSub {
  private readonly subClient: BunRedisClient;
  private readonly pubClient: BunRedisClient;
  private readonly handlers: Map<string, Set<MessageHandler>> = new Map();

  constructor(
    private readonly _options: {
      url: string,
      socket: {
        reconnectStrategy: (
          retries: number,
        ) => number,
      },
    },
  ) {
    this.subClient = new BunRedisClient(this._options);
    this.pubClient = new BunRedisClient(this._options);

    // Restore connections on reconnect
    this.subClient
      .on('ready', async () => {
        await this.restoreSubscriptions();
        console.log('Reconnected and subscriptions restored.');
      });
  }

  public async connect(

  ) {
    await Promise.all([
      this.subClient.connect(),
      this.pubClient.connect(),
    ]);
  }

  public emit(
    channel: string,
    message: string,
  ) {
    const listeners = this.handlers.get(channel);
    if (listeners) {
      for (const cb of listeners) {
        cb(channel, message);
      }
    }
  }

  private async restoreSubscriptions(

  ) {
    for (const channel of this.handlers.keys()) {
      await this.subClient.getClient().send('SUBSCRIBE', [channel]);
    }
  }

  public async subscribe(
    channel: string,
    handler: MessageHandler,
  ) {
    await this.connect();

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.subClient.getClient().send('SUBSCRIBE', [channel]);
    }

    this.handlers.get(channel)?.add(handler);
  }

  public async unsubscribe(
    channel: string,
    handler?: MessageHandler,
  ) {
    const listeners = this.handlers.get(channel);
    if (!listeners) return;

    if (handler) {
      listeners.delete(handler);
    }

    if (!handler || listeners.size === 0) {
      this.handlers.delete(channel);
      if (this.subClient.connected) {
        await this.subClient.getClient().send('UNSUBSCRIBE', [channel]);
      }
    }
  }

  public async publish(
    channel: string,
    message: string,
  ) {
    await this.connect();
    await this.pubClient.getClient().send('PUBLISH', [channel, message]);
  }

  public async disconnect(

  ) {
    this.handlers.clear();
    this.subClient.disconnect();
    this.pubClient.disconnect();
  }
}
   */
