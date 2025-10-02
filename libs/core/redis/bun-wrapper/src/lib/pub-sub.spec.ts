import { RedisClient } from 'bun';
import { BunRedisPubSub } from './core-redis-pub-sub.class';

describe('BunRedisPubSub', () => {
    let redisClient: RedisClient;
    let pubsub: BunRedisPubSub;

    beforeAll(async () => {
        const url: string = globalThis['infrastructureRedisURL'];

        console.log(`Redis is ready at ${url}`);

        redisClient = new RedisClient(url);

        pubsub = new BunRedisPubSub({
            url,
            socket: {
                reconnectStrategy: () => 100,
            },
        });

        await pubsub.connect();
        await redisClient.connect();
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