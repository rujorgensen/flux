import { BunRedisClient } from './bun-redis-client-wrapper';

type MessageHandler = (channel: string, message: string) => void;

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