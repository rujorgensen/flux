import { RedisClient } from 'bun';
import { BunRedisPubSub } from './core-redis-pub-sub.class';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

describe('BunRedisPubSub', () => {
    let redisClient: RedisClient;
    let pubsub: BunRedisPubSub;

    beforeAll(async () => {
        const redisURL: string = globalThis['infrastructureRedisURL'];

        redisClient = new RedisClient(redisURL);
        await redisClient.connect();

        pubsub = new BunRedisPubSub({
            url: redisURL,
            socket: {
                reconnectStrategy: () => 100,
            },
        });

        await pubsub.connect();
    });

    afterAll(async () => {
        await redisClient?.close();
        await pubsub?.disconnect();
    });

    it('works', async () => {
        await redisClient.set('key', 'val');
        expect(await redisClient.get('key')).toBe('val');
    });

    it('should publish and receive messages', async () => {
        const messages: string[] = [];

        await pubsub.subscribe('test-channel', messages.push.bind(messages));

        await pubsub.publish('test-channel', 'hello world');

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(messages).toContain('hello world');
    });

});