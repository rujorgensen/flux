import {
    FluxAuthority
} from '@persistica/flux-authority';
import {
    type FluxAgentNetworkConnection,
    FluxAgent
} from '@persistica/flux-agent';
import * as jwt from 'jsonwebtoken';
import {
    describe,
    it,
    beforeAll,
    expect,
} from 'bun:test';
import { isClientId, TNetworkToken_S } from '@flux/shared/types';
import { $ } from 'bun';
import {
    waitUntilAvailable,
    connectToRedisAndFlush,
    seedNetworkTokens,
    generateRandomSafePort,
} from '@flux/mesh/test/setup/infrastructure';

const NETWORK_ID: string = 'agent-api-testing-network-id'; // Key to register a network, known to flux´
const NETWORK_ACCESS_TOKEN: TNetworkToken_S = 'network-access-token' as TNetworkToken_S; // Key to register an authority, known to flux
const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network'; // Key to connect to a network, unknown and irelevant to flux
const LIVE_UPDATES_NETWORK_ID: string = 'rAnD0M-network-id'; // Portal bootstraps its own status authority on this network

describe('persistica-flux-api-agents', () => {
    let portalDomain: string = '';
    let fluxDomain: string | undefined;

    beforeAll(async () => {
        const redisURL = globalThis['infrastructureRedisURL'];

        if (!redisURL) {
            throw new Error('Redis URL is not defined globally');
        }

        // Generate random port to avoid conflicts with other tests running in parallel
        const randomAPIPort = generateRandomSafePort();
        const randomMeshPort = generateRandomSafePort();

        portalDomain = `http://localhost:${randomAPIPort}`;

        process.env.PORTAL_MESH_SERVER_PORT = randomMeshPort.toString();
        process.env.PORT = randomAPIPort.toString();
        process.env.FLUX_PORTAL_REDIS_URL = redisURL;
        process.env.FLUX_MESH_REDIS_URL = redisURL; // Modify env so the Flux Mesh connects to the test Redis container

        fluxDomain = `http://localhost:${randomMeshPort}`;

        // * Clear the container
        await connectToRedisAndFlush(redisURL);

        // The portal starts its own live-updates mesh authority during boot, so
        // Redis must be clean and both required network tokens must exist before
        // the process starts.
        await Promise.all([
            seedNetworkTokens(redisURL, NETWORK_ID, [NETWORK_ACCESS_TOKEN]),
            seedNetworkTokens(redisURL, LIVE_UPDATES_NETWORK_ID, [NETWORK_ACCESS_TOKEN]),
        ]);

        console.log(`⚗️ Starting portal server on port ${randomAPIPort}`);

        // Use bun run directly (not bun nx run) to avoid NX task deduplication
        // when @flux/portal-api is already running as an NX infrastructure task.
        void $`bun run --watch apps/backend/portal/src/main.ts --tsconfig-override=apps/backend/portal/tsconfig.app.json`.then().catch();

        // 👉 Wait until the API is accepting connections
        await waitUntilAvailable(
            `${portalDomain}/api/ping`,
            30_000,
            300,
        );

        console.log(`⚗️ 🚀 Portal server is ready at port ${randomAPIPort}. Connecting FluxAuthority to Mesh server at '${fluxDomain}'`);

        if (!fluxDomain) {
            throw new Error('Flux domain is not defined');
        }

        await new FluxAuthority(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        )
            .registerAuthority({
                networkAccessToken: NETWORK_ACCESS_TOKEN,
                authorizeAgentConnection: () => Promise.resolve('allowed'),
                authorizeChannelAccess: () => Promise.resolve(true),
            });

        console.log(`⚗️ Authority is connected to Mesh at '${fluxDomain}'`);
    });

    it('should return the agent count', async () => {
        const res = await fetch(`${portalDomain}/api/networks/${NETWORK_ID}/agents/count?when=now`);
        const data = await res.json();

        expect(data.count).toBe(0);

        const fluxAgent = new FluxAgent(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        );

        await fluxAgent
            .connect(
                CODE_TO_ACCESS_NETWORK,
                'backend-agent-1',
            );

        const res_ = await fetch(`${portalDomain}/api/networks/${NETWORK_ID}/agents/count?when=now`);
        const data_ = await res_.json();

        expect(data_.count).toBe(1);
        expect(new Date(data_.date)).toBeDate();
    });

    it('should return a list of connected agents', async () => {
        const fluxAgent = new FluxAgent(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        );

        await fluxAgent
            .connect(
                CODE_TO_ACCESS_NETWORK,
                'backend-agent-2',
            );

        await (new FluxAgent(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        ))
            .connect(
                CODE_TO_ACCESS_NETWORK,
            );

        const res = await fetch(`${portalDomain}/api/networks/${NETWORK_ID}/agents/connected`);

        const { data, total } = await res.json();
        expect(total).toBe(3);
        expect(data).toHaveLength(3);
        expect(isClientId(data.at(0)?.id)).toBeTruthy();
        expect(data.at(0)?.ip).toBeDefined();
        expect(data.at(0)?.address).toBeDefined();
        expect(data.at(0)?.bytes).toBeDefined();
        expect(data.at(0)?.packets).toBeDefined();
        expect(data.filter((a) => a.uid).map((a) => a.uid).sort()).toEqual([
            'backend-agent-1',
            'backend-agent-2',
        ]);
    });

    /**
     * The DragonFly page reads `protected-*-redis-status`. The portal used to publish
     * those through its authority connection, and the mesh drops publishes from a
     * client that never joined — so the page spun forever, with no error anywhere.
     */
    it('publishes DragonFly status on the protected redis-status channel', async () => {
        const connection = await connectToInternalMesh(true, 'redis-status-reader');

        const channel = await connection
            .joinChannel('protected-portal-redis-status');

        const received: string = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('No DragonFly status published within 10s')), 10_000);

            channel.onPublish((message) => {
                clearTimeout(timeout);
                resolve(message as string);
            });
        });

        const status = JSON.parse(received);

        expect(status.url).toBeString();
        expect(status.memory.used).toBeNumber();
        expect(status.clients).toBeDefined();
    });

    /**
     * DragonFly health is for the flux admin who owns the deployment. `isFluxAdmin`
     * is read from the session when the claim is minted, so nobody else can subscribe.
     */
    it('refuses the protected redis-status channel to a non-admin', async () => {
        const connection = await connectToInternalMesh(false, 'non-admin-reader');

        expect(await didJoin(connection, 'protected-portal-redis-status')).toBeFalse();
    });

    /**
     * The network itself stays open so every portal user keeps receiving the dashboard
     * counts. Joining with the bare network code must not confer admin rights.
     */
    it('refuses the protected redis-status channel to a plain network claim', async () => {
        const connection = await new FluxAgent('internal-network', { domain: fluxDomain })
            .connect(CODE_TO_ACCESS_NETWORK, 'plain-claim-reader');

        expect(await didJoin(connection, 'protected-portal-redis-status')).toBeFalse();

        // ...but the unprotected dashboard channels still work for that same client.
        expect(await didJoin(connection, 'networks-some-network-channel-count-update')).toBeTrue();
    });

    const didJoin = (
        connection: FluxAgentNetworkConnection,
        channelName: string,
    ): Promise<boolean> =>
        connection
            .joinChannel(channelName)
            .then(() => true)
            .catch(() => false);

    /**
     * Mints the same claim `/api/internal-mesh/claim` hands the browser. Signed with
     * the shared `FLUX_AUTHORITY_JWT_SECRET`, so the portal process accepts it.
     */
    const connectToInternalMesh = (
        isFluxAdmin: boolean,
        agentUId: string,
    ): Promise<FluxAgentNetworkConnection> => {
        const claim = jwt.sign(
            isFluxAdmin ? { isFluxAdmin: true } : {},
            process.env['FLUX_AUTHORITY_JWT_SECRET']!,
            { expiresIn: '15m' },
        );

        return new FluxAgent('internal-network', { domain: fluxDomain })
            .connect(claim, agentUId);
    };

});
