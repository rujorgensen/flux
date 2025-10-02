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

const NETWORK_ID: string = 'agent-api-testing-network-id'; // Key to register a network, known to flux´
const NETWORK_AUTHORITY_KEY: string = 'network-authority-key'; // Key to register an authority, known to flux
const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network'; // Key to connect to a network, unknown and irelevant to flux

describe('persistica-flux-api-agents', () => {
    let fluxServerPort: number = 5100;
    let domain: string = `localhost:${fluxServerPort}`;

    beforeAll(async () => {
        let redisURL: string = 'redis://localhost:6381';

        if (process.env.FLUX_TEST_INFRASTRUCTURE !== 'local') {
            // * Start Redis container
            redisURL = globalThis['infrastructureRedisURL'];
        }

        // Modify env so the Flux Mesh connects to the test Redis container
        process.env.FLUX_MESH_REDIS_URL = redisURL;

        console.log(`Redis is ready at '${redisURL}'`);

        $`bun nx run backend-portal:serve`.then().catch();

        // * Clear the container
        if (
            redisURL.includes('localhost') &&
            (process.env.FLUX_TEST_INFRASTRUCTURE === 'local')
        ) {
            await connectToRedisAndFlush(redisURL);
        }

        await new FluxAuthority(
            NETWORK_ID,
            {
                domain,
            },
        )
            .registerAuthority(
                NETWORK_AUTHORITY_KEY,
                () => Promise.resolve('allowed'),
                () => Promise.resolve(true),
            );

        console.log(`Authority is connected to Mesh at '${domain}'`);
    });

    it('should return the agent count', async () => {
        const res = await fetch(`http://localhost:3000/api/networks/${NETWORK_ID}/agents/count?when=now`);
        const data = await res.json();

        expect(data.count).toBe(0);

        const fluxAgent = new FluxAgent(
            NETWORK_ID,
        );

        await fluxAgent
            .connect(
                CODE_TO_ACCESS_NETWORK,
                'backend-agent-1',
            );

        const res_ = await fetch(`http://localhost:3000/api/networks/${NETWORK_ID}/agents/count?when=now`);
        const data_ = await res_.json();

        expect(data_.count).toBe(1);
        expect(new Date(data_.date)).toBeDate();
    });

    it('should return a list of connected agents', async () => {
        const fluxAgent = new FluxAgent(
            NETWORK_ID,
        );

        await fluxAgent
            .connect(
                CODE_TO_ACCESS_NETWORK,
                'backend-agent-2',
            );

        await (new FluxAgent(
            NETWORK_ID,
        ))
            .connect(
                CODE_TO_ACCESS_NETWORK,
            );

        const res = await fetch(`http://localhost:3000/api/networks/${NETWORK_ID}/agents/connected`);

        const data = await res.json();
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

/**
 * Connects to a Redis server and flushes all data before starting.
 *  !NB This should not be necessary once multi/missing authorities are handled better.
 * 
 * @param { string } url
 * 
 * @returns { Promise<void> }
 */
async function connectToRedisAndFlush(
    url: string,
): Promise<void> {
    if (!url.includes('localhost')) {
        throw new Error('No way I\'m flushing a Redis server which is not running locally!');
    }

    const client = new RedisClient(url);
    console.log(`Connecting to Redis at '${url}' for flushing...`);
    await client.connect();
    expect(client.connected).toBeTruthy();
    console.warn(`Connection to Redis at '${url}' is open. Flushing data...`);
    await client.send('FLUSHALL', ['ASYNC']);

    console.warn(`Flushed all data from Redis at '${url}', disconnecting.`);
    client.close();
}
