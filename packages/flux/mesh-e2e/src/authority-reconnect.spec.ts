import {
    FluxMeshServer
} from '@flux/mesh';
import {
    FluxAuthority,
} from '@persistica/flux-authority';
import {
    FluxAgent
} from '@persistica/flux-agent';
import {
    describe,
    it,
    beforeAll,
    afterAll,
    expect,
} from 'bun:test';
import {
    seedNetworkTokens,
    generateRandomSafePort,
} from '@flux/mesh/test/setup/infrastructure';

const NETWORK_ID: string = 'reconnect-network';
const NETWORK_ACCESS_TOKEN: string = 'reconnect-network-access-token';
const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network';

// Long enough to connect with, short enough for a test to outlive. In production
// this is 15 minutes — the point is only that the connection outlives the ticket
// that opened it.
const UPGRADE_TOKEN_TTL: string = '2s';

/**
 * Reaches through the Authority to the live WebSocket so the test can kill it
 * the way a proxy restart or NAT timeout does. There is no public API for
 * "drop the socket but keep reconnecting" — `disconnect()` deliberately stops
 * the retry loop, which is the opposite of what this reproduces.
 */
const killAuthoritySocket = (
    authority: FluxAuthority,
): void => {
    const connection = Reflect.get(authority, 'fluxWebSocketConnection') as object;
    const socket = Reflect.get(connection, 'socket') as object;
    const webSocket = Reflect.get(socket, 'ws') as WebSocket;

    webSocket.close();
};

const waitFor = async (
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

describe('authority reconnect after the upgrade token expired (#497)', () => {
    let fluxMeshServer: FluxMeshServer;
    const fluxServerPort: number = generateRandomSafePort();
    const fluxDomain: string = `http://localhost:${fluxServerPort}`;

    beforeAll(async () => {
        const redisURL: string = globalThis['infrastructureRedisURL']!;

        process.env.FLUX_MESH_REDIS_URL = redisURL;

        await seedNetworkTokens(redisURL, NETWORK_ID, [NETWORK_ACCESS_TOKEN]);

        fluxMeshServer = new FluxMeshServer({
            port: fluxServerPort,
            upgradeTokenTTL: UPGRADE_TOKEN_TTL,
        });

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
    });

    afterAll(async () => {
        await fluxMeshServer.stop();
    });

    it('re-authenticates and re-registers, so Agents can still join', async () => {
        // The whole failure in one test: an Authority connects, its upgrade ticket
        // expires while the socket is up, the socket then dies. Before the fix the
        // reconnect re-dialled the expired ticket forever ('jwt expired'), the
        // Authority never came back, and every Agent got
        // NetworkAuthorityNotFoundError until the process was restarted.
        const states: string[] = [];

        const fluxAuthority = new FluxAuthority(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        );

        fluxAuthority.onNetworkState((state: string) => {
            states.push(state);
        });

        await fluxAuthority.registerAuthority({
            networkAccessToken: NETWORK_ACCESS_TOKEN,
            authorizeAgentConnection: (
                auth: unknown,
            ): Promise<string> => {
                if (auth !== CODE_TO_ACCESS_NETWORK) {
                    return Promise.reject(new Error('Not allowed, bad agent claim'));
                }

                return Promise.resolve('allowed');
            },
            authorizeChannelAccess: (): Promise<boolean> => Promise.resolve(true),
        });

        await waitFor(() => states.includes('connected'), 2_000, 'the Authority to connect');

        // Outlive the ticket that opened the connection.
        await new Promise((resolve) => setTimeout(resolve, 2_500));

        const connectionsBeforeDrop: number = states.filter((state) => state === 'connected').length;

        killAuthoritySocket(fluxAuthority);

        await waitFor(
            () => states.filter((state) => state === 'connected').length > connectionsBeforeDrop,
            15_000,
            'the Authority to reconnect with a freshly minted ticket',
        );

        // The user-visible outcome: a network with a live Authority accepts Agents.
        const fluxAgent = new FluxAgent(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        );

        const connection = await fluxAgent.connect(
            CODE_TO_ACCESS_NETWORK,
            'reconnect-agent',
        );

        expect(connection).toBeTruthy();

        fluxAgent.disconnect();
        fluxAuthority.disconnect();
    }, 30_000);
});
