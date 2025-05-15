import {
    type RedisClientType,
    createClient,
} from 'redis';
import {
    type StartedRedisContainer,
    RedisContainer,
} from '@testcontainers/redis';
import { BunRedisPubSub } from './core-redis-pub-sub.class';
import {
    Wait,
} from 'testcontainers';

describe('BunRedisPubSub', () => {
    let redisContainer: StartedRedisContainer;
    let redisClient: RedisClientType;
    let pubsub: BunRedisPubSub;

    beforeAll(async () => {
        redisContainer = await new RedisContainer('redis:6.2.7')
            .withExposedPorts(6379)
            .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
            .start();

        const url: string = redisContainer.getConnectionUrl();

        console.log(`Redis is ready at ${url}`);

        redisClient = createClient({
            url,
        });

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
        await redisClient?.disconnect();
        await pubsub?.disconnect();
        await redisContainer?.stop();
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