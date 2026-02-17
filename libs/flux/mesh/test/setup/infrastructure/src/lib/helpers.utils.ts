import { RedisClient } from 'bun';

/**
 * Connects to a Redis server and flushes all data before starting.
 *  !NB This should not be necessary once multi/missing authorities are handled better.
 * 
 * @param { string } url
 * 
 * @returns { Promise<void> }
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