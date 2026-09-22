import {
    FluxMeshServer
} from '@flux/mesh';
import {
    FluxAuthority,
} from '@persistica/flux-authority';
import {
    FluxAgent,
} from '@persistica/flux-agent';
import {
    describe,
    it,
    beforeAll,
    afterAll,
    expect,
} from 'bun:test';
import {
    generateRandomSafePort,
} from '@flux/mesh/test/setup/infrastructure';
import {
    killSocket,
    startMesh,
    waitFor,
} from './reconnect-helpers';

const NETWORK_ID: string = 'channel-reconnect-network';
const NETWORK_ACCESS_TOKEN: string = 'channel-reconnect-network-access-token';
const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network';
const CHANNEL_NAME: string = 'reconnect-channel';

/**
 * Publishes the same message until it arrives. A publish sent right after a
 * re-sign-on races the channel re-subscribe's authority round-trip — the mesh
 * drops a publish for a channel it has not finished subscribing — so a single
 * attempt proves nothing. Delivery of the first copy is the assertion.
 */
const publishUntilReceived = async (
    publish: (message: string) => void,
    message: string,
    received: string[],
    timeoutMs: number,
): Promise<void> => {
    const startedAt: number = Date.now();
    let lastPublishAt: number = 0;

    while (!received.includes(message)) {
        if ((Date.now() - startedAt) > timeoutMs) {
            throw new Error(`Timed out waiting for message "${message}" to arrive`);
        }

        if ((Date.now() - lastPublishAt) >= 200) {
            publish(message);
            lastPublishAt = Date.now();
        }

        await new Promise((resolve) => setTimeout(resolve, 25));
    }
};

describe('channels survive an agent re-sign-on (#536)', () => {
    let fluxMeshServer: FluxMeshServer;
    const fluxServerPort: number = generateRandomSafePort();
    const fluxDomain: string = `http://localhost:${fluxServerPort}`;

    beforeAll(async () => {
        fluxMeshServer = await startMesh(fluxServerPort, NETWORK_ID, NETWORK_ACCESS_TOKEN);
    });

    afterAll(async () => {
        await fluxMeshServer.stop();
    });

    it('a cached channel still publishes and still receives after the socket drops', async () => {
        const authorityStates: string[] = [];

        const fluxAuthority = new FluxAuthority(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        );

        fluxAuthority.onNetworkState((state: string) => {
            authorityStates.push(state);
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

        await waitFor(() => authorityStates.includes('connected'), 2_000, 'the Authority to connect');

        // Agent A holds a long-lived channel handle — the backend publisher from
        // the issue.
        const agentAStates: string[] = [];

        const fluxAgentA = new FluxAgent(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        );

        fluxAgentA.onNetworkState((state: string) => {
            agentAStates.push(state);
        });

        const connectionA = await fluxAgentA.connect(CODE_TO_ACCESS_NETWORK, 'agent-a');
        const channelA = await connectionA.joinChannel(CHANNEL_NAME);

        // Agent B holds a long-lived onPublish listener — the browser tab from
        // the issue.
        const agentBStates: string[] = [];
        const received: string[] = [];

        const fluxAgentB = new FluxAgent(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        );

        fluxAgentB.onNetworkState((state: string) => {
            agentBStates.push(state);
        });

        const connectionB = await fluxAgentB.connect(CODE_TO_ACCESS_NETWORK, 'agent-b');
        const channelB = await connectionB.joinChannel(CHANNEL_NAME);

        channelB.onPublish<string>((message: string) => {
            received.push(message);
        });

        // Baseline: the channel works before anything drops.
        await publishUntilReceived(
            (message: string) => channelA.publish(message),
            'before-drop',
            received,
            2_000,
        );

        // A's socket drops and the SDK signs on again. The cached handle must
        // keep publishing — over the new socket, once it has re-subscribed.
        killSocket(fluxAgentA);

        await waitFor(
            () => agentAStates.filter((state) => state === 'connected').length >= 2,
            15_000,
            'agent A to sign on again',
        );

        await publishUntilReceived(
            (message: string) => channelA.publish(message),
            'after-publisher-reconnect',
            received,
            2_000,
        );

        // B's socket drops and the SDK signs on again. The cached listener must
        // keep receiving — the re-subscribe re-established mesh-side routing.
        killSocket(fluxAgentB);

        await waitFor(
            () => agentBStates.filter((state) => state === 'connected').length >= 2,
            15_000,
            'agent B to sign on again',
        );

        await publishUntilReceived(
            (message: string) => channelA.publish(message),
            'after-listener-reconnect',
            received,
            2_000,
        );

        // All three arrived, and in order. The retry helper may deliver extra
        // copies of a retry message, so order — not strict equality — is the
        // assertion on the tail.
        expect(received[0]).toBe('before-drop');
        expect(received.indexOf('after-publisher-reconnect')).toBeGreaterThan(0);
        expect(received.indexOf('after-listener-reconnect')).toBeGreaterThan(received.indexOf('after-publisher-reconnect'));

        fluxAgentA.disconnect();
        fluxAgentB.disconnect();
        fluxAuthority.disconnect();
    }, 60_000);
});
