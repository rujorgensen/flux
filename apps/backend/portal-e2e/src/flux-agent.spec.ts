import { RedisClient } from 'bun';
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
import { isNanoId } from 'libs/flux/shared/types/src/lib/client-id.type';
import { $ } from 'bun';
import {
    waitUntilAvailable,
    connectToRedisAndFlush,
    generateRandomSafePort,
} from '@flux/mesh/test/setup/infrastructure';

const NETWORK_ID: string = 'agent-api-testing-network-id'; // Key to register a network, known to flux´
const NETWORK_AUTHORITY_KEY: string = 'network-authority-key'; // Key to register an authority, known to flux
const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network'; // Key to connect to a network, unknown and irelevant to flux

describe('persistica-flux-api-agents', () => {
    let portalDomain: string = '';
    let fluxDomain: string | undefined;

    beforeAll(async () => {
        const redisURL = globalThis['infrastructureRedisURL'];

        // Generate random port to avoid conflicts with other tests running in parallel
        const randomAPIPort = generateRandomSafePort();
        const randomMeshPort = generateRandomSafePort();

        portalDomain = `http://localhost:${randomAPIPort}`;

        process.env.PORTAL_MESH_SERVER_PORT = randomMeshPort.toString();
        process.env.PORT = randomAPIPort.toString();
        process.env.FLUX_PORTAL_REDIS_URL = redisURL;
        process.env.FLUX_MESH_REDIS_URL = redisURL; // Modify env so the Flux Mesh connects to the test Redis container

        fluxDomain = `http://localhost:${randomMeshPort}`;

        console.log(`⚗️ Starting portal server on port ${randomAPIPort}`);

        //$`bun nx run @flux/portal-api:serve`.nothrow();
        $`bun nx run @flux/portal-api:serve`.then().catch();

        // 👉 Wait until the API is accepting connections
        await waitUntilAvailable(
            `${portalDomain}/api/ping`,
            30_000,
            300,
        );

        console.log(`⚗️ 🚀 Portal server is ready at port ${randomAPIPort}. Connecting FluxAuthority to Mesh server at '${fluxDomain}'`);

        // * Clear the container
        await connectToRedisAndFlush(redisURL);

        if (!fluxDomain) {
            throw new Error('Flux domain is not defined');
        }

        await new FluxAuthority(
            NETWORK_ID,
            {
                domain: fluxDomain,
            },
        )
            .registerAuthority(
                NETWORK_AUTHORITY_KEY,
                () => Promise.resolve('allowed'),
                () => Promise.resolve(true),
            );

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
        expect(isNanoId(data.at(0)?.id)).toBeTruthy();
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
