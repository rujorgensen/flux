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

        await this.networkAgentRedisCache
            .unregister(
                clientId,
                networkId_,
                clientOwnUId,
            );

        const channelNames_ = networkChannels ?? await this.networkChannelManager
            .readChannelNamesForClientId(
                networkId_,
                clientId,
            );

        if (!clientAddress) {
            throw new Error('Resolve client address if not provided.');
        }

        await this.networkChannelManager
            .leaveAllNetworkChannels(
                networkId_,
                clientAddress,
                channelNames_,
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
