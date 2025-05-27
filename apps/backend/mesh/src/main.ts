import { FluxMeshServer } from '@persistica/mesh';

const FLUX_MESH_REDIS_URL: string | undefined = process.env.FLUX_MESH_REDIS_URL;
if (!FLUX_MESH_REDIS_URL) {
    throw new Error('Missing FLUX_MESH_REDIS_URL in .env');
}

export const fluxMeshServer: FluxMeshServer = new FluxMeshServer(
    {
        redisConnectionString: FLUX_MESH_REDIS_URL,
    },
);