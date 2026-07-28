import { FluxMeshServer, RedisConnection } from '@flux/mesh';
import { FluxAuthority, type FluxAuthorityNetworkConnection } from '@persistica/flux-authority';
import * as jwt from 'jsonwebtoken';
import type {
    FluxAgentNetworkConnection,
    FluxNetworkChannel,
} from '@flux/shared/connection';
import type { RedisStatusService } from './_services/redis-status.service';
import type { TNetworkAgentCountAt, TNetworkChannelCountAt, TNetworkId_S, TNetworkToken_S } from '@flux/shared/types';
import { randomUUIDv7 } from 'bun';
import { NetworkChannelService } from '@flux/mesh/store/redis/network-channel';
import { NetworkAuthorityRedisService } from '@flux/mesh/store/redis/network-authority';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { NetworkUsageRedisCacheService } from '@flux/mesh/store/redis/network-usage';
import {
    FluxAgent,
} from '@persistica/flux-agent';
interface IAgentJWTPayload extends jwt.JwtPayload {
    user: {
        isFluxAdmin?: true;
    };
}

interface IInternalMeshClaim extends jwt.JwtPayload {
    isFluxAdmin?: true;
}

const NETWORK_ID: TNetworkId_S = 'internal-network' as TNetworkId_S; // Key to register a network, known to flux
const NETWORK_ACCESS_TOKEN: TNetworkToken_S = randomUUIDv7() as TNetworkToken_S; // Key to register an authority, known to flux
// Stable across restarts when configured, so already-issued claims keep verifying.
const FLUX_AUTHORITY_JWT_SECRET: string = process.env['FLUX_AUTHORITY_JWT_SECRET'] ?? randomUUIDv7();
// Pinned on both sign and verify, so a token cannot pick a weaker algorithm.
const JWT_ALGORITHM: jwt.Algorithm = 'HS256';

/**
 * Mints the claim an agent presents to join the internal network. Only the Portal
 * can issue one, so `isFluxAdmin` cannot be forged by the browser.
 */
export const signInternalMeshClaim = (
    isFluxAdmin: boolean,
): string =>
    jwt.sign(
        isFluxAdmin ? { isFluxAdmin: true } : {},
        FLUX_AUTHORITY_JWT_SECRET,
        { expiresIn: '15m', algorithm: JWT_ALGORITHM },
    );

const subscribedNetworkChannels: Set<TNetworkId_S> = new Set();

// ****************************************************************************
// * Setup Mesh Server 
// ****************************************************************************
export const liveUpdates = (
    localMeshServerPort: number,
    portalRedisStatusService: RedisStatusService,
    meshRedisStatusService: RedisStatusService,
    meshRedisConnection: RedisConnection,
): void => {
    const networkChannelService: NetworkChannelService = new NetworkChannelService(meshRedisConnection);
    const networkAuthorityRedisService: NetworkAuthorityRedisService = new NetworkAuthorityRedisService(meshRedisConnection);
    const networkAgentRedisService: NetworkAgentRedisService = new NetworkAgentRedisService(meshRedisConnection);
    // Reads real cumulative per-network byte usage (fed by real WS traffic).
    // The service needs the raw Bun RedisClient, accessed the same way the mesh
    // does in `network-agent-redis-cache.class.ts`.
    const networkUsageRedisCacheService: NetworkUsageRedisCacheService = new NetworkUsageRedisCacheService(
        meshRedisConnection['cacheClient'].client,
    );

    new FluxMeshServer({
        port: localMeshServerPort,
        hardcodedNetworkCredentials: new Map([
            [NETWORK_ID, NETWORK_ACCESS_TOKEN],
        ]),
    })
        .onReady(async () => {

            // ****************************************************************************
            // * Setup Authority
            // ****************************************************************************

            console.log('🔑 Registering authority');

            // Key to connect to the internal network, unknown and irelevant to flux (the flux server is not exposed)
            const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network'; // randomUUIDv7();

            const fluxAuthority = new FluxAuthority(
                NETWORK_ID,
                {
                    domain: `http://localhost:${localMeshServerPort}`,
                },
            );

            const fluxAuthorityNetworkConnection: FluxAuthorityNetworkConnection = await fluxAuthority
                .registerAuthority({
                    networkAccessToken: NETWORK_ACCESS_TOKEN,

                    /**
                     * The network itself is open — it only carries internal Portal events.
                     * The claim decides admin rights; the channel authorizer enforces them.
                     */
                    authorizeAgentConnection: (
                        auth: unknown,
                    ): Promise<string> => {
                        console.log('🔑 A client is trying to access the network');

                        let isFluxAdmin: boolean = false;

                        if (auth !== CODE_TO_ACCESS_NETWORK) {
                            try {
                                isFluxAdmin = (jwt.verify(
                                    auth as string,
                                    FLUX_AUTHORITY_JWT_SECRET,
                                    { algorithms: [JWT_ALGORITHM] },
                                ) as IInternalMeshClaim).isFluxAdmin === true;
                            } catch {
                                return Promise.reject(new Error('Not allowed, bad agent claim'));
                            }
                        }

                        console.log(`✅ Network access authorized (flux admin: ${isFluxAdmin})`);

                        return Promise.resolve(jwt.sign({
                            user: isFluxAdmin ? { isFluxAdmin: true } : {},
                        }, FLUX_AUTHORITY_JWT_SECRET, { expiresIn: '15m', algorithm: JWT_ALGORITHM }));
                    },

                    // * Authorize channel
                    authorizeChannelAccess: (
                        channelTopic: string,
                        identification: string,
                    ): Promise<boolean> => {
                        // The signing secret is per-process: a JWT held across a restart
                        // no longer verifies. Deny rather than throw out of the RPC.
                        let agentJWT: IAgentJWTPayload | undefined;

                        try {
                            agentJWT = jwt.verify(
                                identification,
                                FLUX_AUTHORITY_JWT_SECRET,
                                { algorithms: [JWT_ALGORITHM] },
                            ) as IAgentJWTPayload;
                        } catch (error) {
                            console.error(`❌ Rejecting channel '${channelTopic}': could not verify the agent claim.`, error);

                            return Promise.resolve(false);
                        }

                        console.log(`🔒 A client is attempting to subscribe to channel name '${channelTopic}', using identification '${JSON.stringify(agentJWT.user)}'`);

                        // console.error(`✅ Client suscribed to channel with identification`);

                        // Redis health and any other 'protected' channel is admin-only.
                        if (channelTopic.startsWith('protected')) {
                            if (agentJWT.user.isFluxAdmin) {
                                console.log('✅ Agent is a flux admin');
                                return Promise.resolve(true);
                            }

                            console.log(`⛔ Rejecting '${channelTopic}': agent is not a flux admin`);
                            return Promise.resolve(false);
                        }

                        const networkIdMatch = channelTopic.match(/^networks-(.+)-(agent|authority|channel)-count-update$/);
                        if (networkIdMatch) {
                            console.log('TODO: pass the real network ID, and proof of association');
                            manageChannelSubscriptions(networkIdMatch[1] as TNetworkId_S);
                        }

                        return Promise.resolve(true);
                    },
                })
                .catch((error) => {
                    console.error(`❌ Failed to register authority: ${error instanceof Error ? error.message : String(error)}`);

                    throw new Error('Failed to register authority');
                })
                ;

            // ****************************************************************************
            // * Setup Agent
            // ****************************************************************************

            const fluxNetworkConnection: FluxAgentNetworkConnection = await new FluxAgent(
                NETWORK_ID,
                {
                    domain: `http://localhost:${localMeshServerPort}`,
                },
            )
                .connect(
                    // The Portal publishes on the protected channels, so it joins as admin.
                    signInternalMeshClaim(true),
                    'backend-agent',
                );

            console.log(`✅ Agent connected to network ID: '${NETWORK_ID}'`);

            // * Emit connected agents
            const fluxConnectedAgentNetworkChannel: FluxNetworkChannel = fluxAuthorityNetworkConnection
                .getChannel('connected-agents');

            setInterval(() => {
                const networkAgentCountAt: TNetworkAgentCountAt = {
                    count: 0,
                    date: new Date(),
                };

                fluxConnectedAgentNetworkChannel.publish(networkAgentCountAt);
            }, 3_000);

            // * Emit active channels
            const fluxActiveChannels: FluxNetworkChannel = fluxAuthorityNetworkConnection
                .getChannel('active-channels');

            setInterval(() => {
                const fluxActiveChannelsAt: TNetworkChannelCountAt = {
                    count: 0,
                    date: new Date(),
                };

                fluxActiveChannels.publish(fluxActiveChannelsAt);
            }, 3_000);

            // * Emit connected authorities
            const fluxNetworkChannel: FluxNetworkChannel = fluxAuthorityNetworkConnection
                .getChannel('connected-authorities');

            setInterval(() => {
                fluxNetworkChannel.publish({
                    count: 0,
                    date: new Date(),
                });
            }, 3_000);

            // Must join: the mesh drops publishes from non-members, and the authority's
            // `getChannel()` never subscribes. One at a time — the subscribe timeout is 2s.
            const portalRedisHealthChannel: FluxNetworkChannel = await fluxNetworkConnection
                .joinChannel('protected-portal-redis-health-alerts');
            const meshRedisHealthAlertChannel: FluxNetworkChannel = await fluxNetworkConnection
                .joinChannel('protected-mesh-redis-health-alerts');
            const portalRedisStatusChannel: FluxNetworkChannel = await fluxNetworkConnection
                .joinChannel('protected-portal-redis-status');
            const meshRedisStatusChannel: FluxNetworkChannel = await fluxNetworkConnection
                .joinChannel('protected-mesh-redis-status');

            // * Listen to Redis health
            portalRedisStatusService
                .onAlert((alerts: string[]) => {
                    portalRedisHealthChannel.publish(JSON.stringify(alerts));
                });

            meshRedisStatusService
                .onAlert((alerts: string[]) => {
                    meshRedisHealthAlertChannel.publish(JSON.stringify(alerts));
                });

            const publishRedisStatus = async (
                service: RedisStatusService,
                channel: FluxNetworkChannel,
            ): Promise<void> => {
                try {
                    const status = await service.getRedisStatusOrThrow();
                    channel.publish(JSON.stringify(status));
                } catch (error) {
                    // In self-hosted setups one of the DragonFly instances may be
                    // unavailable; don't let it block the other from publishing.
                    console.error('Failed to read Redis status:', error);
                }
            };

            const publishBothRedisStatuses = (): void => {
                void publishRedisStatus(portalRedisStatusService, portalRedisStatusChannel);
                void publishRedisStatus(meshRedisStatusService, meshRedisStatusChannel);
            };

            publishBothRedisStatuses();
            setInterval(publishBothRedisStatuses, 1_000);

            const manageChannelSubscriptions = (
                networkId: TNetworkId_S,
            ): void => {

                if (subscribedNetworkChannels.has(networkId)) {
                    console.log('The channel is already subscribed to');
                    return;
                }

                subscribedNetworkChannels.add(networkId);

                // TODO Use fluxAuthorityNetworkConnection instead
                void Promise.all([
                    fluxNetworkConnection.joinChannel(`networks-${networkId}-agent-count-update`),
                    fluxNetworkConnection.joinChannel(`networks-${networkId}-authority-count-update`),
                    fluxNetworkConnection.joinChannel(`networks-${networkId}-channel-count-update`),
                    fluxNetworkConnection.joinChannel(`networks-${networkId}-total-data-usage`),
                ])
                    .then(([
                        agentCountUpdateChannel,
                        authorityCountUpdateChannel,
                        channelUpdateChannel,
                        totalDataUsageChannel,
                    ]: [FluxNetworkChannel, FluxNetworkChannel, FluxNetworkChannel, FluxNetworkChannel]) => {
                        void networkAgentRedisService
                            .onAgentCountChange(
                                networkId,
                                agentCountUpdateChannel.publish.bind(agentCountUpdateChannel),
                            );

                        void networkAuthorityRedisService
                            .onAuthorityCountChange(
                                networkId,
                                authorityCountUpdateChannel.publish.bind(authorityCountUpdateChannel),
                            );

                        void networkChannelService
                            .onChannelCount(
                                networkId,
                                channelUpdateChannel.publish.bind(channelUpdateChannel),
                            );

                        // Relay the real cumulative byte usage. Unlike the counts,
                        // network usage has no pub/sub change event yet, so poll the
                        // Redis cache and publish the latest value periodically.
                        const publishNetworkUsage = (): void => {
                            void networkUsageRedisCacheService
                                .readNetworkUsageBytes(networkId)
                                .then((bytes: number) => {
                                    totalDataUsageChannel.publish(bytes);
                                })
                                .catch((error: unknown) => {
                                    console.error(`❌ Failed to read network usage for '${networkId}':`, error);
                                });
                        };

                        publishNetworkUsage();
                        setInterval(publishNetworkUsage, 3_000);
                    })
                    .catch((error: unknown) => {
                        subscribedNetworkChannels.delete(networkId);
                        console.error(`❌ Failed to subscribe to network channels for '${networkId}':`, error);
                    });
            };
        });
};