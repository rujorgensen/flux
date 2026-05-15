import { BunRedisClient } from '@core/redis/bun';

const FLUX_PORTAL_REDIS_URL: string | undefined = process.env['FLUX_PORTAL_REDIS_URL'];

if (!FLUX_PORTAL_REDIS_URL) {
    throw new Error('Missing FLUX_PORTAL_REDIS_URL in .env');
}

// ****************************************************************************
// * Connections to Stores
// ****************************************************************************

let portalRedis: BunRedisClient | undefined;

/**
 * Singleton function to get the Redis connection
 */
export const getPortalRedisConnection = async (

): Promise<BunRedisClient> => {
    // * Connect to Redis
    if (!portalRedis) {

        portalRedis = new BunRedisClient({
            url: FLUX_PORTAL_REDIS_URL,
            socket: {
                reconnectStrategy: (
                    retries: number,
                ) => {
                    console.warn(`🔄 Redis reconnection attempt #${retries}`);

                    // Backoff in ms
                    return Math.min(retries * 100, 3_000);
                },
            },
        });

        await portalRedis.connect();

        if (!portalRedis.connected) {
            console.error('❌ Portal Redis connection failed, will retry');
        } else {
            console.log('✅ Portal Redis connected');
        }
    }

    return portalRedis;
};
