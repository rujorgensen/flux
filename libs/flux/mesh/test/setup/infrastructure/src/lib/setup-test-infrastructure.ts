import { beforeAll, afterAll } from 'bun:test';
import {
    type StartedRedisContainer,
    RedisContainer,
} from '@testcontainers/redis';
import {
    Wait,
} from 'testcontainers';
import {
    createClient,
} from 'redis';

declare global {
    var infrastructureRedisURL: string | null;
    var infrastructureRedisContainer: StartedRedisContainer | null;
}

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

    if (await testRedisConnection(globalThis['infrastructureRedisURL'])) {
        console.log(`✅\tRedis is ready at ${globalThis['infrastructureRedisURL']} for testing`);
    } else {
        throw new Error(`💀\tRedis is NOT running ${globalThis['infrastructureRedisURL']}`);
    }
});

afterAll(async () => {
    console.log('Tearing down test infrastructure...');
    await globalThis['infrastructureRedisContainer']?.stop();
});

/**
 * Test if Redis is running at url.
 * 
 * @param { string } url
 * 
 * @returns { Promise<void> }
 */
async function testRedisConnection(
    url: string,
): Promise<boolean> {
    try {
        const client = createClient({
            url,
        });

        await client.connect();

        if (client.isOpen) {
            client.destroy();

            return true;
        }

        return false;
    } catch (e) {
        console.error(e instanceof Error ? e.message : e);

        return false;
    }
}