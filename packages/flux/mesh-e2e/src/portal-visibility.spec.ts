import {
    FluxMeshServer,
    getMeshRedisConnection,
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
    seedNetworkTokens,
    generateRandomSafePort,
} from '@flux/mesh/test/setup/infrastructure';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { NetworkAuthorityRedisService } from '@flux/mesh/store/redis/network-authority';
import { NetworkChannelService } from '@flux/mesh/store/redis/network-channel';
import type { TNetworkId_S } from '@flux/shared/types';

const NETWORK_ID = 'njord-repro' as TNetworkId_S;
const NETWORK_ACCESS_TOKEN = 'network-access-token';
const CODE_TO_ACCESS_NETWORK = 'code-to-access-network';

describe('portal-visibility', () => {
    let fluxMeshServer: FluxMeshServer;
    const fluxServerPort: number = generateRandomSafePort();
    const fluxDomain: string = `http://localhost:${fluxServerPort}`;

    beforeAll(async () => {
        const redisURL: string = globalThis['infrastructureRedisURL']!;
        process.env.FLUX_MESH_REDIS_URL = redisURL;

        await seedNetworkTokens(redisURL, NETWORK_ID, [NETWORK_ACCESS_TOKEN]);

        fluxMeshServer = new FluxMeshServer(fluxServerPort);
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(reject, 2_000);
            fluxMeshServer.onReady(() => {
                clearTimeout(timeout);
                resolve(void 0);
            });
        });
    });

    afterAll(async () => {
        await fluxMeshServer.stop();
    });

    /**
     * The portal's `/connection-status` endpoint reads the agent, authority and
     * channel records back from the mesh Redis. All three must be visible after a
     * realistic connect + join + publish, matching what portal.persistica.io shows.
     */
    it('connection-status sees the agent, authority and channel', async () => {
        const authority = new FluxAuthority(NETWORK_ID, { domain: fluxDomain });
        await authority.registerAuthority({
            networkAccessToken: NETWORK_ACCESS_TOKEN,
            authorizeAgentConnection: (auth: unknown): Promise<string> =>
                auth === CODE_TO_ACCESS_NETWORK
                    ? Promise.resolve('allowed')
                    : Promise.reject(new Error('bad claim')),
            authorizeChannelAccess: (): Promise<boolean> => Promise.resolve(true),
        });

        const agent = new FluxAgent(NETWORK_ID, { domain: fluxDomain });
        const connection = await agent.connect(CODE_TO_ACCESS_NETWORK, 'backend-agent');
        const channel = await connection.joinChannel('njord-topic');
        channel.publish({ hello: 'world' });

        // Give the mesh a moment to flush all redis writes
        await new Promise((r) => setTimeout(r, 250));

        const redis = getMeshRedisConnection();
        const agents = await new NetworkAgentRedisService(redis).readAgents(NETWORK_ID);
        const authorities = await new NetworkAuthorityRedisService(redis).readAuthorities(NETWORK_ID);
        const channelCount = await new NetworkChannelService(redis).readNetworkChannelCount(NETWORK_ID);

        expect(agents.length).toBeGreaterThan(0);
        expect(authorities.length).toBeGreaterThan(0);
        expect(channelCount.count).toBeGreaterThan(0);

        // Crash fallback: both the agent and the authority must be tracked on
        // their owning process so the orphan reaper can clean them up if a node
        // dies without disconnecting. (The authority no longer relies on a TTL.)
        const [agentMachine, agentPid] = agents[0]!.address.split('/');
        const [authMachine, authPid] = authorities[0]!.address.split('/');

        const trackedAgents = await redis.hash.smembers(`~/machines/processes/${agentMachine}/${agentPid}/clients`);
        const trackedAuthorities = await redis.hash.smembers(`~/machines/processes/${authMachine}/${authPid}/authorities`);

        expect(trackedAgents).toContain(agents[0]!.id);
        expect(trackedAuthorities).toContain(authorities[0]!.id);
    });

    /**
     * Cross-node cleanup path: when the process owning a socket is gone,
     * `GlobalClientManager.kickClient` removes the record using only the clientId
     * (no networkId). That resolves the networkId from the global `~/clients` hash.
     * Regression guard for the `~/authorities` / `~/agents` rename leftover.
     */
    it('unregisters an authority by clientId alone', async () => {
        const redis = getMeshRedisConnection();
        const authorityService = new NetworkAuthorityRedisService(redis);

        const [authority] = await authorityService.readAuthorities(NETWORK_ID);
        expect(authority).toBeTruthy();

        // No networkId passed — forces the `~/clients` lookup that was broken.
        await authorityService.unregisterAuthority(authority!.id);

        expect((await authorityService.readAuthorities(NETWORK_ID)).some((a) => a.id === authority!.id)).toBeFalse();
    });

    /**
     * The reaper knows only a dead process's clientIds. If it can't resolve the rest,
     * the portal keeps listing channels (with members!) on a network with no agents.
     */
    it('reaping an agent by clientId alone deletes the channels it was the last member of', async () => {
        const redis = getMeshRedisConnection();
        const agentService = new NetworkAgentRedisService(redis);
        const channelService = new NetworkChannelService(redis);

        const [agent] = await agentService.readAgents(NETWORK_ID);
        expect(agent).toBeTruthy();
        expect((await channelService.readNetworkChannelCount(NETWORK_ID)).count).toBeGreaterThan(0);

        // Backdate the heartbeat past the 10s liveness window: the reaper now sees a
        // crashed node and must clean up from the clientId alone.
        const [machineAddress, processId] = agent!.address.split('/');
        await redis.sortedSet.zadd('~machines/processes', 0, `${machineAddress}/${processId}`);

        await fluxMeshServer.cleanupOrphans();

        expect((await agentService.readAgents(NETWORK_ID)).some((a) => a.id === agent!.id)).toBeFalse();
        expect(await channelService.readChannelNamesForClientId(NETWORK_ID, agent!.id)).toBeEmpty();
        expect((await channelService.readNetworkChannelCount(NETWORK_ID)).count).toBe(0);
    });
});
