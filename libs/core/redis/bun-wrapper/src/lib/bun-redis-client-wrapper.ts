import {
  RedisClient
} from 'bun';
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

  private reconnectAttempts = 0;
  private readonly maxReconnects: number | null = null;
  private readonly baseDelay = 200; // ms
  private readonly maxDelay = 2000; // ms

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
      },
    );
  }

  /**
   * Returns the raw Redis client.
   * 
   * ! Please note that this may be re-instantiated on reconnections,
   * ! so make sure to request this continuously, if used.
   * 
   * @returns { RedisClient}
   */
  public getClient(

  ): RedisClient {
    return this.client;
  }

  public clone(

  ): BunRedisClient {
    return new BunRedisClient(this.options);
  }

  public async connect(

  ) {
    if (this.connected || this.reconnecting) {
      return;
    }

    try {
      await this.client.connect();

      this.connected = true;
      this.emit('ready', void 0);
      this.reconnectAttempts = 0;

      this.client.onclose = (error) => {
        console.error('⬇️ Redis client disconnected:', error);
        this.connected = false;
        this.retryReconnect();
        this.emit('end', void 0);
      };
    } catch (error) {
      console.error('Initial Redis connection failed:', error);
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'));
      this.retryReconnect();
    }
  }

  private async retryReconnect(

  ) {
    if (this.reconnecting) return;
    this.reconnecting = true;

    while (!this.connected && (this.reconnectAttempts <= (this.maxReconnects ?? Number.POSITIVE_INFINITY))) {
      const delay: number = this.options.socket.reconnectStrategy(this.reconnectAttempts) ?? Math.min(this.baseDelay * 2 ** this.reconnectAttempts, this.maxDelay);

      this.emit('reconnecting', void 0);
      console.log(`Reconnecting to Redis in ${delay}ms...`);

      await new Promise(res => setTimeout(res, delay));
      this.reconnectAttempts++;

      try {
        this.client = new RedisClient(
          this.options.url,
          {
            // We're providing our own implementation
            autoReconnect: false,
          },
        );
        await this.connect();
        this.connected = true;
        this.emit('ready', void 0);
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
   * 
   */
  public disconnect(

  ) {
    this.handlers.clear();
    this.connected = false;
    this.client.close();
  }
}