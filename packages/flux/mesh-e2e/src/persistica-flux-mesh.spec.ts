import {
    createClient,
} from 'redis';
import {
    type StartedRedisContainer,
    RedisContainer,
} from '@testcontainers/redis';
import {
    Wait,
} from 'testcontainers';
import {
    FluxMeshServer
} from '@flux/mesh';
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
    afterAll,
    expect,
} from 'bun:test';
import type {
    FluxAgentNetworkConnection,
} from '@flux/shared/connection';
import type { FluxAuthorityNetworkConnection } from 'packages/flux/authority/src/lib/flux-authority-network.class';

const NETWORK_ID: string = 'rAnD0M-network-id'; // Key to register a network, known to flux´
const NETWORK_AUTHORITY_KEY: string = 'network-authority-key'; // Key to register an authority, known to flux
const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network'; // Key to connect to a network, unknown and irelevant to flux

describe('persistica-flux-mesh', () => {
    let redisContainer: StartedRedisContainer;
    let fluxMeshServer: FluxMeshServer;
    let fluxServerPort: number = 8080;
    let fluxDomain: string = `localhost:${fluxServerPort}`;

    beforeAll(async () => {
        let redisURL: string = 'redis://localhost:6381';

        if (process.env.FLUX_TEST_INFRASTRUCTURE !== 'local') {
            // * Start Redis container
            redisContainer = await new RedisContainer('redis:7.4.3')
                .withExposedPorts(6379)
                .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
                .start()
                ;

            redisURL = redisContainer.getConnectionUrl();
        }

        // Modify env so the Flux Mesh connects to the test Redis container
        process.env.FLUX_MESH_REDIS_URL = redisURL;

        console.log(`Redis is ready at '${redisURL}'`);

        // * Clear the container
        if (
            redisURL.includes('localhost') &&
            (process.env.FLUX_TEST_INFRASTRUCTURE === 'local')
        ) {
            await connectToRedisAndFlush(redisURL);
        }

        // * Start mesh server
        fluxMeshServer = new FluxMeshServer(fluxServerPort);

        let timeout: ReturnType<typeof setTimeout> | undefined;
        await new Promise((resolve, reject) => {
            timeout = setTimeout(reject, 1_000);

            fluxMeshServer.onReady(() => {
                clearTimeout(timeout);
                timeout = null;
                resolve(void 0);
            });
        });

        if (timeout !== null) {
            throw new Error('Timeout waiting for Mesh server to be ready');
        }

        // if (process.env.FLUX_TEST_INFRASTRUCTURE !== 'local') {
        //     const queryResult = await redisContainer.executeCliCmd('info', ['clients']);
        //     if (queryResult !== expect.stringContaining('connected_clients:1')) {
        //         throw new Error(`Expected 1 client connected to Redis, got queryResult: '${queryResult}'`);
        //     }
        // }

        console.log(`Client is connected at '${redisURL}'`);
    });

    afterAll(async () => {
        await fluxMeshServer?.stop();
        await redisContainer?.stop();
    });

    describe('network-connection', () => {
        let fluxAgent: FluxAgent;
        let fluxAgentNetworkConnection: FluxAgentNetworkConnection;
        let fluxAuthority: FluxAuthority;
        let fluxAuthorityNetworkConnection: FluxAuthorityNetworkConnection;

        it('should allow an authority to connect to a network', async () => {
            fluxAuthority = new FluxAuthority(
                NETWORK_ID,
                {
                    domain: fluxDomain,
                },
            );

            fluxAuthorityNetworkConnection = await fluxAuthority
                .registerAuthority(
                    NETWORK_AUTHORITY_KEY,
                    (
                        auth: unknown,
                    ): Promise<string> => {

                        // Test the agents claim to access network
                        if (
                            (auth !== CODE_TO_ACCESS_NETWORK)
                        ) {
                            return Promise.reject(new Error('Not allowed, wrong agent claim'));
                        }

                        return Promise.resolve('allowed');
                    },

                    (
                        _channelTopic: string,
                        _identification: string,
                    ): Promise<boolean> => {
                        return Promise.resolve(true);
                    },
                );

            expect(true).toBeTrue();
        });

        it('should allow an agent to connect to a network', async () => {

            fluxAgent = new FluxAgent(
                NETWORK_ID,
            );

            fluxAgentNetworkConnection = await fluxAgent
                .connect(
                    CODE_TO_ACCESS_NETWORK,
                    'backend-agent',
                );

            expect(fluxAgentNetworkConnection).toBeTruthy();
        });

        it('should allow network agents to connect to channels', async () => {
            // * Connect to network
            fluxAgentNetworkConnection = await fluxAgent
                .connect(
                    CODE_TO_ACCESS_NETWORK,
                    'backend-agent',
                );

            // * Connect to channel
            await fluxAgentNetworkConnection
                .joinChannel('channel-a');

            await fluxAgentNetworkConnection
                .joinChannel('channel-b');

            expect(fluxAgentNetworkConnection.readConnectedChannels()).toEqual(['channel-a', 'channel-b']);
        });

    });

    describe('authority-capabilities', async () => {

        it('should notify authority on new network channel', async () => {
            const fluxAuthority = new FluxAuthority(
                NETWORK_ID,
                {
                    domain: fluxDomain,
                },
            );

            const fluxAuthorityNetworkConnection: FluxAuthorityNetworkConnection = await fluxAuthority
                .registerAuthority(
                    NETWORK_AUTHORITY_KEY,
                    (
                        auth: unknown,
                    ): Promise<string> => {

                        // Test the agents claim to access network
                        if (
                            (auth !== CODE_TO_ACCESS_NETWORK)
                        ) {
                            return Promise.reject(new Error('Not allowed, wrong agent claim'));
                        }

                        return Promise.resolve('allowed');
                    },

                    (
                        _channelTopic: string,
                        _identification: string,
                    ): Promise<boolean> => {
                        return Promise.resolve(true);
                    },
                );

            const fluxAgent = new FluxAgent(
                NETWORK_ID,
            );

            const fluxAgentNetworkConnection = await fluxAgent
                .connect(
                    CODE_TO_ACCESS_NETWORK,
                    'backend-agent',
                );

            const createChannelPromise = new Promise<string>((resolve, reject) => {
                fluxAuthorityNetworkConnection
                    .networkChannelEventEmitter
                    .on('createChannel', resolve);

                setTimeout(reject, 1_000);
            });

            // * Connect to channel
            await fluxAgentNetworkConnection
                .joinChannel('channel-c');

            expect(fluxAgentNetworkConnection.readConnectedChannels()).toEqual(['channel-c']);
            const detectedCreatedChanenl: string = await createChannelPromise;

            expect(detectedCreatedChanenl).toBe('channel-c');

            // * Leave to channel
            await fluxAgentNetworkConnection
                .leaveChannel('channel-c');

            expect(fluxAgentNetworkConnection.readConnectedChannels()).toEqual([]);

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

    const client = createClient({
        url,
    });
    console.log(`Connecting to Redis at '${url}' for flushing...`);
    await client.connect();
    expect(client.isOpen).toBeTruthy();
    console.warn(`Connection to Redis at '${url}' is open. Flushing data...`);
    await client.flushAll();

    console.warn(`Flushed all data from Redis at '${url}', disconnecting.`);
    await client.disconnect();
}