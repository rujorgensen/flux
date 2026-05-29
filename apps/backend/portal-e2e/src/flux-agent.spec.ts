import {
    FluxAuthority
} from '@persistica/flux-authority';
import {
    FluxAgent
} from '@persistica/flux-agent';
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
        $`bun run --watch apps/backend/portal/src/main.ts --tsconfig-override=apps/backend/portal/tsconfig.app.json`.then().catch();

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

});
