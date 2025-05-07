import { FluxMeshServer } from '@flux/mesh';
import { FluxAuthority } from '@persistica/flux-authority';
import * as jwt from 'jsonwebtoken';
import { FluxAgent } from '@persistica/flux-agent';
import type {
    FluxNetworkChannel,
    FluxAgentNetworkConnection,
} from '@flux/shared/connection';
import type { RedisStatusService } from './_services/redis-status.service';
import type { TNetworkId_S } from '@flux/shared/types';

const NETWORK_ID: string = 'rAnD0M-network-id'; // Key to register a network, known to flux´

// ****************************************************************************
// * Setup Mesh Server
// ****************************************************************************
export class LiveUpdates {

    constructor(
        private readonly portalRedisStatusService: RedisStatusService,
        private readonly meshRedisStatusService: RedisStatusService,
        private readonly AUTHORITY_JWT_SECRET: string,
    ) {
        const fluxMeshServer: FluxMeshServer = new FluxMeshServer();

        fluxMeshServer.onReady(async () => {

            // ****************************************************************************
            // * Setup Authority
            // ****************************************************************************

            console.log('🔑 Registering authority');

            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network'; // Key to connect to a network, unknown and irelevant to flux
            const NETWORK_AUTHORITY_KEY: string = 'network-authority-key'; // Key to register an authority, known to flux

            const fluxAuthority = new FluxAuthority(
                NETWORK_ID,
                {
                    //         domain?: string,
                    //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
                    //         retries?: number; // Number of times to retry a failed message
                },
            );

            await fluxAuthority
                .registerAuthority(
                    NETWORK_AUTHORITY_KEY,
                    (
                        auth: unknown,
                    ): Promise<string> => {
                        console.log('🔑 A client is trying to access the network', auth);

                        // Test the agents claim to access network
                        if (
                            (auth !== CODE_TO_ACCESS_NETWORK)
                        ) {
                            return Promise.reject(new Error('Not allowed'));
                        }

                        // console.log('✅ Network access authorized');

                        return Promise.resolve(jwt.sign({
                            user: {
                                allowAllChannels: true,
                            },
                        }, AUTHORITY_JWT_SECRET, { expiresIn: 120_000 }));
                    },

                    // * Authorize channel
                    (
                        channelTopic: string,
                        identification: string,
                    ): Promise<boolean> => {

                        const agentJWT = jwt.verify(identification, AUTHORITY_JWT_SECRET) as jwt.JwtPayload;

                        console.log(`🔒 A client is trying to subscribe to channel name '${channelTopic}', using identification '${JSON.stringify(agentJWT.user)}'`);

                        // console.error(`✅ Client suscribed to channel with identification`);

                        if (channelTopic.startsWith('protected')) {
                            if (agentJWT.user.allowAllChannels) {
                                console.log('✅ Agent is allowed on all channels');
                                return Promise.resolve(true);
                            }

                            console.log('TODO: chcek if this agent is allowed to access the channel');
                            return Promise.resolve(false);
                        }

                        return Promise.resolve(true);
                    },
                );

            // ****************************************************************************
            // * Setup Agent
            // ****************************************************************************

            const fluxAgent = new FluxAgent(
                NETWORK_ID,
                {
                    //         domain?: string,
                    //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
                    //         retries?: number; // Number of times to retry a failed message
                },
            );

            const fluxNetworkConnection: FluxAgentNetworkConnection = await fluxAgent
                .connect(
                    CODE_TO_ACCESS_NETWORK,
                    'backend-agent',
                );

            console.log(`✅ Agent connected to network ID: '${fluxNetworkConnection.id}'`);

            const fluxNetworkChannel: FluxNetworkChannel = await fluxNetworkConnection
                .joinChannel('connected-authorities');

            console.log(`✅ Agent connected to network channel topic: 'connected-authorities'`);
            let num: number = 0;

            setInterval(() => {
                num++;
                fluxNetworkChannel
                    .publish(`${num++}`);
            }, 3_000);

            // * Listen to Redis health
            const portalRedisHealthChannel: FluxNetworkChannel = await fluxNetworkConnection
                .joinChannel('protected-portal-redis-health-alerts');

            const meshRedisHealthAlertChannel: FluxNetworkChannel = await fluxNetworkConnection
                .joinChannel('protected-mesh-redis-health-alerts');

            console.log(`✅ Agent connected to network channel topics: "${fluxNetworkConnection.readConnectedChannels().join('","')}"`);

            portalRedisStatusService
                .onAlert((alerts: string[]) => {
                    portalRedisHealthChannel.publish(JSON.stringify(alerts));
                });

            meshRedisStatusService
                .onAlert((alerts: string[]) => {
                    meshRedisHealthAlertChannel.publish(JSON.stringify(alerts));
                });
        });
    }

    public subscribeToNetworkUpdates(
        networkId: TNetworkId_S,
    ): void {

    }
}