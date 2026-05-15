import { FluxMeshServer } from '@flux/mesh';
import { FluxAuthority } from '@persistica/flux-authority';
import * as jwt from 'jsonwebtoken';
import { FluxAgent } from '@persistica/flux-agent';
import type {
    FluxNetworkChannel,
    FluxAgentNetworkConnection,
} from '@flux/shared/connection';
import type { RedisStatusService } from './_services/redis-status.service';
import type { TNetworkAgentCountAt, TNetworkChannelCountAt, TNetworkId_S } from '@flux/shared/types';
import { randomUUIDv7 } from 'bun';

interface IAgentJWTPayload extends jwt.JwtPayload {
    user: {
        allowAllChannels: boolean;
    };
}

const NETWORK_ID: TNetworkId_S = 'internal-network' as TNetworkId_S; // Key to register a network, known to flux
const NETWORK_AUTHORITY_KEY: string = randomUUIDv7(); // Key to register an authority, known to flux

// ****************************************************************************
// * Setup Mesh Server 
// ****************************************************************************
export class LiveUpdates {

    constructor(
        private readonly localMeshServerPort: number,
        private readonly portalRedisStatusService: RedisStatusService,
        private readonly meshRedisStatusService: RedisStatusService,
        private readonly FLUX_AUTHORITY_JWT_SECRET: string,
    ) {
        new FluxMeshServer({
            port: this.localMeshServerPort,
            hardcodedNetworkCredentials: new Map([
                [NETWORK_ID, NETWORK_AUTHORITY_KEY],
            ]),
        })
            .onReady(async () => {

                // ****************************************************************************
                // * Setup Authority
                // ****************************************************************************

                console.log('🔑 Registering authority');

                // Key to connect to the internal network, unknown and irelevant to flux (the flux server is not exposed)
                const CODE_TO_ACCESS_NETWORK: string = randomUUIDv7();

                const fluxAuthority = new FluxAuthority(
                    NETWORK_ID,
                    {
                        domain: `http://localhost:${this.localMeshServerPort}`,
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
                                return Promise.reject(new Error('Not allowed, bad agent claim'));
                            }

                            // console.log('✅ Network access authorized');

                            return Promise.resolve(jwt.sign({
                                user: {
                                    allowAllChannels: true,
                                },
                            }, this.FLUX_AUTHORITY_JWT_SECRET, { expiresIn: 120_000 }));
                        },

                        // * Authorize channel
                        (
                            channelTopic: string,
                            identification: string,
                        ): Promise<boolean> => {

                            const agentJWT = jwt.verify(identification, this.FLUX_AUTHORITY_JWT_SECRET) as IAgentJWTPayload;

                            console.log(`🔒 A client is attempting to subscribe to channel name '${channelTopic}', using identification '${JSON.stringify(agentJWT.user)}'`);

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
                    )
                    .catch((error) => {
                        console.error(`❌ Failed to register authority: ${error instanceof Error ? error.message : String(error)}`);
                    })
                    ;

                // ****************************************************************************
                // * Setup Agent
                // ****************************************************************************

                const fluxNetworkConnection: FluxAgentNetworkConnection = await new FluxAgent(
                    NETWORK_ID,
                    {
                        domain: `http://localhost:${this.localMeshServerPort}`,
                    },
                )
                    .connect(
                        CODE_TO_ACCESS_NETWORK,
                        'backend-agent',
                    );

                console.log(`✅ Agent connected to network ID: '${NETWORK_ID}'`);

                // * Emit connected agents
                const fluxConnectedAgentNetworkChannel: FluxNetworkChannel = await fluxNetworkConnection
                    .joinChannel('connected-agents');

                let num2: number = 0;
                setInterval(() => {
                    num2++;
                    const networkAgentCountAt: TNetworkAgentCountAt = {
                        count: num2,
                        date: new Date(),
                    };

                    fluxConnectedAgentNetworkChannel.publish(networkAgentCountAt);
                }, 3_000);

                // * Emit active channels
                const fluxActiveChannels: FluxNetworkChannel = await fluxNetworkConnection
                    .joinChannel('active-channels');

                let num3: number = 0;
                setInterval(() => {
                    num3++;
                    const fluxActiveChannelsAt: TNetworkChannelCountAt = {
                        count: num3,
                        date: new Date(),
                    };

                    fluxActiveChannels.publish(fluxActiveChannelsAt);
                }, 3_000);

                // * Emit connected authorities
                const fluxNetworkChannel: FluxNetworkChannel = await fluxNetworkConnection
                    .joinChannel('connected-authorities');

                let num4: number = 0;
                setInterval(() => {
                    num4++;
                    const fluxActiveChannelsAt: TNetworkChannelCountAt = {
                        count: num4,
                        date: new Date(),
                    };

                    fluxNetworkChannel.publish(fluxActiveChannelsAt);
                }, 3_000);


                // * Emit data usage
                const fluxDataUsageNetworkChannel: FluxNetworkChannel = await fluxNetworkConnection
                    .joinChannel('data-usage');

                let num5: number = -100;
                setInterval(() => {
                    num5++;
                    fluxDataUsageNetworkChannel.publish(num5);
                }, 3_000);

                // * Listen to Redis health
                const portalRedisHealthChannel: FluxNetworkChannel = await fluxNetworkConnection
                    .joinChannel('protected-portal-redis-health-alerts');

                const meshRedisHealthAlertChannel: FluxNetworkChannel = await fluxNetworkConnection
                    .joinChannel('protected-mesh-redis-health-alerts');

                console.log(`✅ Agent connected to network channel topics: "${fluxNetworkConnection.readConnectedChannels().join('","')}"`);

                this.portalRedisStatusService
                    .onAlert((alerts: string[]) => {
                        portalRedisHealthChannel.publish(JSON.stringify(alerts));
                    });

                this.meshRedisStatusService
                    .onAlert((alerts: string[]) => {
                        meshRedisHealthAlertChannel.publish(JSON.stringify(alerts));
                    });

                // * Listen to status
                const portalRedisStatusChannel: FluxNetworkChannel = await fluxNetworkConnection
                    .joinChannel('protected-portal-redis-status');
                const meshRedisStatusChannel: FluxNetworkChannel = await fluxNetworkConnection
                    .joinChannel('protected-mesh-redis-status');

                setInterval(async () => {
                    const portalRedisStatus = await this.portalRedisStatusService.getRedisStatusOrThrow();
                    portalRedisStatusChannel.publish(JSON.stringify(portalRedisStatus));

                    const meshRedisStatus = await this.meshRedisStatusService.getRedisStatusOrThrow();
                    meshRedisStatusChannel.publish(JSON.stringify(meshRedisStatus));
                }, 100);
            });
    }
}