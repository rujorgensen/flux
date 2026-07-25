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

/**
 * Reaches through the Authority to the live WebSocket so the test can kill it the
 * way a mesh redeploy or a NAT timeout does. There is no public API for "drop the
 * socket but come back" — `disconnect()` deliberately stays down.
 */
const killAuthoritySocket = (
    authority: FluxAuthority,
): void => {
    const connection = Reflect.get(authority, 'fluxWebSocketConnection') as object;
    const socket = Reflect.get(connection, 'socket') as object;

    (Reflect.get(socket, 'ws') as WebSocket).close();
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

describe('authority sign-on after a dropped socket (#497)', () => {
    let fluxMeshServer: FluxMeshServer;
    const fluxServerPort: number = generateRandomSafePort();
    const fluxDomain: string = `http://localhost:${fluxServerPort}`;

    beforeAll(async () => {
        const redisURL: string = globalThis['infrastructureRedisURL']!;

        process.env.FLUX_MESH_REDIS_URL = redisURL;

        await seedNetworkTokens(redisURL, NETWORK_ID, [NETWORK_ACCESS_TOKEN]);

        fluxMeshServer = new FluxMeshServer(fluxServerPort);

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

    it('comes back after a dropped socket, so Agents can still join', async () => {
        // A smoke test, not the regression test — the ticket is still valid this
        // soon, so the old code recovered here too. What broke in production was
        // recovery *after* the ticket expired; that is pinned in
        // flux-ws-connection.spec.ts, where a close must start a new sign-on.
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

        const connectionsBeforeDrop: number = states.filter((state) => state === 'connected').length;

        killAuthoritySocket(fluxAuthority);

        await waitFor(
            () => states.filter((state) => state === 'connected').length > connectionsBeforeDrop,
            15_000,
            'the Authority to sign on again',
        );

        // The user-visible outcome: a network with a live Authority accepts Agents.
        const fluxAgent = new FluxAgent(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        );

        expect(await fluxAgent.connect(CODE_TO_ACCESS_NETWORK, 'reconnect-agent')).toBeTruthy();

        fluxAgent.disconnect();
        fluxAuthority.disconnect();
    }, 30_000);
});
