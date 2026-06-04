import {
    type TAddress,
    type TChannelName,
    type TNetworkId_S,
    type TSubscription_S,
    AUTHORITY_ON_CREATE_CHANNEL,
    AUTHORITY_ON_EMPTY_CHANNEL,
} from '@flux/shared/types';
import { NetworkChannelService } from '@flux/mesh/store/redis/network-channel';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from '../../routing/redis/redis-connection.class';
import type { GlobalChannelPubsub } from '../../routing/global-channel/global-channel-pubsub.class';
import { canChannelHaveMoreMembers } from './channel-manager.utils';

interface IUsageCache {
    networkId: TNetworkId_S;
    usage: number;
};

export class NetworkChannelManager {
    private readonly channelUsageCount: Map<TChannelName, IUsageCache> = new Map();
    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly networkChannelHash: NetworkChannelService = new NetworkChannelService(
        this.redisConnection,
    );

    constructor(
        private readonly _globalChannelPubsub: GlobalChannelPubsub,
    ) {
        setInterval(() => {
            for (const [channelName, usage] of this.channelUsageCount) {

                if (usage.usage > 0) {
                    void this.networkChannelHash
                        .incrementUsage(
                            usage.networkId,
                            channelName,
                            usage.usage,
                        );
                }

                this.channelUsageCount.delete(channelName);
            }
        }, 5_000);
    }

    /**
     * Checks if a channel can have more members.
     *  
     * ! TODO Don't query the database repeatedly, implement local synced cache.
     */
    public async canHaveMembers(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        subscriptionType?: TSubscription_S,
    ): Promise<boolean> {
        const count: number = await this.networkChannelHash.readNetworkMemberCount(
            networkId,
            channelName,
        );

        return Promise.resolve(canChannelHaveMoreMembers(
            count,
            subscriptionType,
        ));
    }

    /**
     * Joins a network channel.
     */
    public async joinNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<number> {
        await this.createNetworkChannelIfNotExist(
            networkId,
            channelName,
        );

        const memberCount = await this.networkChannelHash.joinNetworkChannel(
            networkId,
            channelName,
            clientAddress,
        );

        return memberCount;
    }

    /**
     * Leaves a network channel.
     */
    public async leaveNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<void> {
        const state = await this.networkChannelHash
            .leaveNetworkChannel(
                networkId,
                channelName,
                clientAddress,
            );

        if (state.memberCount === 0) {
            void this._globalChannelPubsub
                .publish(
                    // Theres another event for this now, should this be replaced?
                    `~/networks/${networkId}/channel-empty`,
                    `${AUTHORITY_ON_EMPTY_CHANNEL}:${channelName}`,
                );
        }
    }

    /**
     * Leaves all network channels.
     */
    public async leaveAllNetworkChannels(
        networkId: TNetworkId_S,
        clientAddress: TAddress,
        channelNames: Set<TChannelName>,
    ): Promise<void> {
        return await this.networkChannelHash.leaveAllNetworkChannels(
            networkId,
            clientAddress,
            channelNames,
        );
    }

    // ****************************************************************************
    // *** Update
    // ****************************************************************************

    /**
     * Increases the usage count of a channel.
     */
    public increaseUsageCount(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        usage: number,
    ): void {
        const channelUsageCache: {
            networkId: TNetworkId_S;
            usage: number;
        } | undefined = this.channelUsageCount.get(channelName);

        this.channelUsageCount.set(
            channelName,
            channelUsageCache ? {
                ...channelUsageCache,
                usage: channelUsageCache.usage + usage,
            } : {
                networkId,
                usage: usage,
            },
        );
    }

    // ****************************************************************************
    // *** Internal Helpers
    // ****************************************************************************

    /**
     * Creates a network channel if it does not exist.
     */
    private async createNetworkChannelIfNotExist(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<void> {
        const wasCreated: boolean = await this.networkChannelHash
            .createNetworkChannelIfNotExist(
                networkId,
                channelName,
            );

        if (wasCreated) {
            void this._globalChannelPubsub
                .publish(
                    `~/networks/${networkId}/channel-created`,
                    `${AUTHORITY_ON_CREATE_CHANNEL}:${channelName}`,
                );
        }
    }

}
