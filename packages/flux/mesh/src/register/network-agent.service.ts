import type {
    TAddress,
    TClientId,
    TAgentOwnUId,
    TNetworkId_S,
    TChannelName,
} from '@flux/shared/types';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';
import { NetworkAgentRedisCache } from './network-agent-redis-cache.class';
import { NetworkAgentRedisRepository } from '../../../../../libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository';
import { NetworkChannelManager } from '../business-logic/channels/channel-manager.class';
import { RedisConnection } from '../routing/redis/redis-connection.class';
import { PicoLogger } from '@utils/pico-logger';

export class NetworkAgentService {
    private readonly networkAgentRedisRepository: NetworkAgentRedisRepository;

    constructor(
        private readonly networkAgentRedisCache: NetworkAgentRedisCache,
        private readonly redisConnection: RedisConnection,
        private readonly networkChannelManager: NetworkChannelManager,
    ) {
        this.networkAgentRedisRepository = new NetworkAgentRedisRepository(
            this.redisConnection,
        );
    }

    /**
     * Register an agent.
     */
    public registerAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        ip: Bun.SocketAddress | null,
        address: TAddress,
        throughput: {
            bytes: number,
            packets: number,
        },
        uid?: TAgentOwnUId,
        machineUID?: TFluxClientUID,
    ): Promise<void> {
        return this.networkAgentRedisCache
            .registerAgent(
                networkId,
                clientId,
                ip,
                address,
                throughput,
                uid,
                machineUID,
            );
    }

    /**
     * Unregisters a network agent UID and associated data from the Redis hash.
     */
    public async unregister(
        clientId: TClientId,
        clientAddress?: TAddress,
        networkId?: TNetworkId_S,
        networkChannels?: Set<TChannelName>,
        clientOwnUId?: { clientOwnUId: TAgentOwnUId, networkId: TNetworkId_S; },
    ): Promise<void> {
        const networkId_: TNetworkId_S = networkId ?? await this.networkAgentRedisRepository
            .readAgentNetworkIdByClientIdOrThrow(clientId);

        // The orphan reaper has no socket, so no address. Read it back from the agent
        // hash, which still exists until we unregister below.
        const clientAddress_: TAddress | undefined = clientAddress
            ?? (await this.networkAgentRedisRepository
                .readAgentByClientId(
                    networkId_,
                    clientId,
                ))?.address;

        const channelNames_ = networkChannels ?? await this.networkChannelManager
            .readChannelNamesForClientId(
                networkId_,
                clientId,
            );

        if (clientAddress_) {
            // Leave channels before unregistering: on failure the agent stays visible
            // for the next reaper pass, rather than orphaning its memberships forever.
            await this.networkChannelManager
                .leaveAllNetworkChannels(
                    networkId_,
                    clientAddress_,
                    channelNames_,
                );
        } else if (channelNames_.size > 0) {
            PicoLogger.warn(`Could not resolve an address for client '${clientId}' on network '${networkId_}'; leaving ${channelNames_.size} channel membership(s) behind.`, 'network-agent');
        }

        await this.networkAgentRedisCache
            .unregister(
                clientId,
                networkId_,
                clientOwnUId,
            );
    }

    /**
     * Resolves the network client address by an agent's UID, using a local cache to avoid unnecessary Redis calls.
     */
    public async resolveClientAddressByUid(
        networkId: TNetworkId_S,
        clientOwnUId: TAgentOwnUId,
    ): Promise<TAddress> {
        return this.networkAgentRedisCache
            .resolveClientAddressByUid(
                networkId,
                clientOwnUId,
            );
    }
}
