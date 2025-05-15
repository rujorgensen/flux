import { BunRedisClient } from '@core/redis/bun';

const FLUX_MESH_REDIS_URL: string | undefined = process.env['FLUX_MESH_REDIS_URL'];

if (!FLUX_MESH_REDIS_URL) {
    throw new Error('Missing FLUX_MESH_REDIS_URL in .env');
}

// ****************************************************************************
// * Connections to Stores
// ****************************************************************************

let meshRedis: BunRedisClient | undefined;

/**
 * Singleton function to get the Redis connection
 *
 * @returns
 */
export const getMeshBunRedisConnection = async (

) => {
    // * Connect to Redis
    if (!meshRedis) {
        meshRedis = new BunRedisClient({
            url: FLUX_MESH_REDIS_URL,
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
        await meshRedis.connect();

        if (!meshRedis.connected) {
            console.error('❌ Mesh Redis connection failed, will retry');
        } else {
            console.log('✅ Mesh Redis connected');
        }
    }

    return meshRedis;
};
