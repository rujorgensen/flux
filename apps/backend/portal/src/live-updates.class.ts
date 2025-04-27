import { FluxMeshServer } from '@flux/mesh';
import { FluxAuthority } from '@persistica/flux-authority';
import * as jjwt from 'jsonwebtoken';
import { FluxAgent } from '@persistica/flux-agent';
import type { FluxNetworkChannel, FluxNetworkConnection } from '@flux/shared/connection';
import type { RedisStatusService } from './_services/redis-status.service';
import { TNetworkId_S } from '@flux/shared/types';

const NETWORK_ID: string = 'rAnD0M-network-id'; // Key to register a network, known to flux´

// ****************************************************************************
// * Setup Mesh Server
// ****************************************************************************
export class LiveUpdates {

    constructor(
        portalRedisStatusService: RedisStatusService,
        meshRedisStatusService: RedisStatusService,
        AUTHORITY_JWT_SECRET: string,
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

                        return Promise.resolve(jjwt.sign({
                            userId: (<any>auth).user,
                        }, AUTHORITY_JWT_SECRET, { expiresIn: 120_000 }));
                    },

                    (
                        channelTopic: string,
                        identification: string,
                    ): Promise<boolean> => {

                        console.log(`🔒 A client is trying to subscribe to topic '${channelTopic}', using identification '${identification}'`);

                        console.log(`✅ Client suscribed to channel with topic '${channelTopic}'`);

                        if (channelTopic.startsWith('protected')) {
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

            const fluxNetworkConnection: FluxNetworkConnection = await fluxAgent
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

            console.log(`✅ Agent connected to network channel topics: 'portal-redis-health-alerts', 'mesh-redis-health-alerts'`);

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