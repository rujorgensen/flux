import { RedisClient } from 'bun';
import { beforeAll, afterAll } from 'bun:test';
import {
    type StartedRedisContainer,
    RedisContainer,
} from '@testcontainers/redis';
import {
    Wait,
} from 'testcontainers';

declare global {
    var infrastructureRedisURL: string | null;
    var infrastructureRedisContainer: StartedRedisContainer | null;
}

let globalRedisContainer: StartedRedisContainer | null = null;
beforeAll(async () => {
    // global setup
    console.info('🛠️\tSetting up test infrastructure...');

    if (globalRedisContainer === null) {

        // * Start Redis container
        const redisContainer: StartedRedisContainer = await new RedisContainer('redis:8.6.0')
            .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
            .start();

        globalThis['infrastructureRedisURL'] = redisContainer.getConnectionUrl();
        globalRedisContainer = redisContainer;
    } else {
        globalThis['infrastructureRedisURL'] = globalRedisContainer.getConnectionUrl();
    }

    if (await testRedisConnection(globalThis['infrastructureRedisURL'])) {
        console.info(`✅\tRedis is ready at ${globalThis['infrastructureRedisURL']} for testing`);
    } else {
        throw new Error(`💀\tRedis is NOT running ${globalThis['infrastructureRedisURL']}`);
    }

    // Allow pulling the image if needed
}, { timeout: 60_000 });

afterAll(async () => {
    console.log('Tearing down test infrastructure...');
    await globalRedisContainer?.stop();

    globalRedisContainer = null;
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
        const client = new RedisClient(url);

        await client.connect();

        if (client.connected) {
            client.close();

            return true;
        }

        return false;
    } catch (e) {
        console.error(e instanceof Error ? e.message : e);

        return false;
    }
}