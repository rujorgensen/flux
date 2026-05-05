import { RedisClient } from 'bun';

/**
 * Connects to a Redis server and flushes all data before starting.
 *  !NB This should not be necessary once multi/missing authorities are handled better.
 */
export const connectToRedisAndFlush = async (
    url: string,
): Promise<void> => {
    if (!url.includes('localhost')) {
        throw new Error('No way I\'m flushing a Redis server that is not running locally!');
    }

    const client = new RedisClient(url);
    console.log(`Connecting to Redis at '${url}' for flushing...`);
    await client.connect();
    if (!client.connected) {
        throw new Error(`Failed to connect to Redis at '${url}' for flushing!`);
    }

    console.warn(`Connection to Redis at '${url}' is open. Flushing data...`);
    await client.send('FLUSHALL', ['ASYNC']);

    console.warn(`Flushed all data from Redis at '${url}', disconnecting.`);
    client.close();
};

/**
 * Seeds valid network access token values into the persistent Redis Set that
 * the mesh's {@link NetworkTokenCache} falls back to on cold start.
 *
 * Call this in test `beforeAll` **after** any Redis flush, and **before** the
 * authority tries to register, so the cache can bootstrap itself.
 *
 * The key written matches `:flux:network-tokens/{networkId}/values`.
 */
export const seedNetworkTokens = async (
    url: string,
    networkId: string,
    tokenValues: string[],
): Promise<void> => {
    const client = new RedisClient(url);
    await client.connect();

    if (!client.connected) {
        throw new Error(`Failed to connect to Redis at '${url}' for seeding network tokens`);
    }

    const key = `:flux:network-tokens/${networkId}/values`;

    await client.send('DEL', [key]);

    if (tokenValues.length > 0) {
        await client.send('SADD', [key, ...tokenValues]);
    }

    client.close();
};

/**
 * Polls a URL until it responds with a successful status code or the timeout is reached.
 */
export const waitUntilAvailable = async (
    url: string,
    timeoutMs: number,
    intervalMs: number,
): Promise<void> => {
    const start: number = Date.now();
    // Accept any HTTP status as “available”; we only need a TCP accept
    while ((Date.now() - start) < timeoutMs) {
        try {
            const r: Response = await fetch(url);
            if (r.ok || r.status >= 200) {
                return;
            }
        } catch {
            // ignore until next retry
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error(`API did not become ready at '${url}' within ${timeoutMs}ms`);
};

const portsThisSession: Set<number> = new Set();
/**
 * Generates a random port number that is safe to use in the current test session.
 */
export const generateRandomSafePort = (

): number => {
    let port;
    let tries = 0;
    const triesLimit = 1_000;

    do {
        port = 30_000 + Math.floor(Math.random() * 35_535);
    } while (portsThisSession.has(port) && (++tries < triesLimit));

    if (tries >= triesLimit) {
        throw new Error(`Failed to generate a random safe port after ${triesLimit} tries`);
    }

    portsThisSession.add(port);

    return port;
};