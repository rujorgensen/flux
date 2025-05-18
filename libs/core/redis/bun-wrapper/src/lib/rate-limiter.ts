import type { BunRedisClient } from './bun-redis-client-wrapper';
import type { BunRedisPubSub } from './core-redis-pub-sub.class';

export class GlobalRateLimiter {
    private readonly localCount: Map<string, number> = new Map();
    private readonly redisClient;

    constructor(
        private readonly _bunRedisClient: BunRedisClient,
        private readonly _bunRedisPubSub: BunRedisPubSub,
        // private readonly refreshRate: number = 1_000, // How often to cacth up with
    ) {
        this.redisClient = {
            incr: (key: string): Promise<number> =>
                this._bunRedisClient.getClient().incr(key),

            expire: (key: string, seconds: number): Promise<number> =>
                this._bunRedisClient.getClient().expire(key, seconds),

            publish: this._bunRedisPubSub.publish.bind(this._bunRedisPubSub),
            subscribe: this._bunRedisPubSub.subscribe.bind(this._bunRedisPubSub),
        };

        this.redisClient
            .subscribe('ratelimit:exceeded', (
                message: string,
            ) => {
                const { ip, limit, windowSecs } = JSON.parse(message);
                this.onGlobalRateLimitExceeded(ip, limit, windowSecs);
            });
    }

    public async createRateLimiter(
        ip: string,
        limit: number = 100,
        windowSecs: number = 3_600,
    ): Promise<{ limited: boolean, remaining: number; }> {
        const key = `ratelimiter:${ip}`;

        // Increment counter
        const count = await this.redisClient.incr(key);

        // Set expiry if this is the first request in window
        if (count === 1) {
            await this.redisClient.expire(key, windowSecs);
        }

        // Check if limit exceeded
        return {
            limited: count > limit,
            remaining: Math.max(0, limit - count),
        };
    }

    private syncLocalCount(

    ): void {

    }

    private emitGlobalRateLimitExceeded(
        ip: string,
        limit: number,
        windowSecs: number,
    ): void {
        this.redisClient.publish('ratelimit:exceeded', JSON.stringify({
            ip,
            limit,
            windowSecs,
        }));
    }

    /**
     * 
     * @param { string } ip
     * @param { number } limit
     * @param { number } windowSecs
     * 
     * @returns { void }
     */
    private onGlobalRateLimitExceeded(
        ip: string,
        limit: number,
        windowSecs: number,
    ): void {
        // this.redisClient.subscribe('ratelimit:exceeded', (
        //     opts: {
        //         ip: string,
        //         limit: number,
        //         windowSecs: number,
        //     },
        // ) => {

        // });
    }

}