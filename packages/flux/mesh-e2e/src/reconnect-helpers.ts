import {
    FluxMeshServer
} from '@flux/mesh';
import {
    seedNetworkTokens,
} from '@flux/mesh/test/setup/infrastructure';

/**
 * Reaches through an Agent or Authority to the live WebSocket so a test can kill
 * it the way a network blip, a mesh redeploy or a laptop sleep does. There is no
 * public API for "drop the socket but come back" — `disconnect()` deliberately
 * stays down.
 */
export const killSocket = (
    client: object,
): void => {
    const connection = Reflect.get(client, 'fluxWebSocketConnection') as object;
    const socket = Reflect.get(connection, 'socket') as object;

    (Reflect.get(socket, 'ws') as WebSocket).close();
};

export const waitFor = async (
    predicate: () => boolean,
    timeoutMs: number,
    description: string,
): Promise<void> => {
    const startedAt: number = Date.now();

    while (!predicate()) {
        if ((Date.now() - startedAt) > timeoutMs) {
            throw new Error(`Timed out waiting for: ${description}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 25));
    }
};

/**
 * Seeds the network's access token and starts a mesh on `port`, resolving once
 * it is ready.
 */
export const startMesh = async (
    port: number,
    networkId: string,
    networkAccessToken: string,
): Promise<FluxMeshServer> => {
    const redisURL: string = globalThis['infrastructureRedisURL']!;

    process.env.FLUX_MESH_REDIS_URL = redisURL;

    await seedNetworkTokens(redisURL, networkId, [networkAccessToken]);

    const fluxMeshServer: FluxMeshServer = new FluxMeshServer(port);

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(
            () => reject(new Error('Timeout waiting for Mesh server to be ready')),
            2_000,
        );

        fluxMeshServer.onReady(() => {
            clearTimeout(timeout);
            resolve(void 0);
        });
    });

    return fluxMeshServer;
};
