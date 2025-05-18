import { beforeAll, afterAll } from 'bun:test';
import {
    type StartedRedisContainer,
    RedisContainer,
} from '@testcontainers/redis';
import {
    Wait,
} from 'testcontainers';

beforeAll(async () => {
    // global setup
    console.log('🛠️\tSetting up test infrastructure...');

    if (process.env['FLUX_TEST_INFRASTRUCTURE'] !== 'local') {

        // * Start Redis container
        const redisContainer: StartedRedisContainer = await new RedisContainer('redis:7.4.3')
            .withExposedPorts(6379)
            .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
            .start();

        globalThis['infrastructureRedisURL'] = redisContainer.getConnectionUrl();
        globalThis['infrastructureRedisContainer'] = redisContainer;
    } else {
        globalThis['infrastructureRedisURL'] = 'redis://localhost:6381';
    }

    console.log(`✅\tRedis is ready at ${globalThis['infrastructureRedisURL']} for testing`);
});

afterAll(async () => {
    console.log('Tearing down test infrastructure...');
    await globalThis['infrastructureRedisContainer']?.stop();
}); 