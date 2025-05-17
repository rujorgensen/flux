import {
    type TAddress,
    type TChannelName,
    type TNetworkId_S,
    AUTHORITY_ON_CREATE_CHANNEL,
    AUTHORITY_ON_EMPTY_CHANNEL,
} from '@flux/shared/types';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from '../../routing/redis/redis-connection.class';
import type { GlobalChannelPubsub } from '../../routing/global-channel/global-channel-pubsub.class';

// ! TODO Hardcoded for now, take from network config in the future
const MAX_CHANNEL_MEMBERS = 25;

export class NetworkChannelManager {
    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly networkChannelHash: NetworkChannelHash = new NetworkChannelHash(
        this.redisConnection,
    );

    constructor(
        private readonly _globalChannelPubsub: GlobalChannelPubsub,
    ) { }

    /**
     * Checks if a channel can have more members.
     *  
     * ! TODO Don't query the database repeatedly, implement local synced cache.
     * 
     * @param { TNetworkId_S } networkId
     * @param { TChannelName } channelName
     *
     * @returns { Promise<boolean> }
     */
    public async canHaveMembers(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<boolean> {
        const count: number = await this.networkChannelHash.readNetworkMemberCount(
            networkId,
            channelName,
        );

        return Promise.resolve(count < MAX_CHANNEL_MEMBERS);
    }

    /**
     * Joins a network channel.
     * 
     * @param { TNetworkId_S }  networkId 
     * @param { TChannelName }  channelName 
     * @param { TAddress }      clientAddress
     * 
     * @returns { void } 
     */
    public joinNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): void {
        this.createNetworkChannelIfNotExist(
            networkId,
            channelName,
        );

        this.networkChannelHash.joinNetworkChannel(
            networkId,
            channelName,
            clientAddress,
        );
    }

    /**
     * Leaves a network channel.
     * 
     * @param { TNetworkId_S }  networkId 
     * @param { TChannelName }  channelName 
     * @param { TAddress }      clientAddress
     * 
     * @returns { Promise<void> } 
     */
    public async leaveNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<void> {
        const membersLeft: number = await this.networkChannelHash
            .leaveNetworkChannel(
                networkId,
                channelName,
                clientAddress,
            );

        if (membersLeft === 0) {
            this._globalChannelPubsub
                .publish(
                    `~/networks/${networkId}/channel-empty`,
                    `${AUTHORITY_ON_EMPTY_CHANNEL}:${channelName}`,
                );
        }
    }

    /**
     * Leaves all network channels.
     * 
     * @param { TNetworkId_S }          networkId
     * @param { TAddress }              clientAddress
     * @param { Set<TChannelName> }     channelNames
     * 
     * @returns { void } 
     */
    public leaveAllNetworkChannels(
        networkId: TNetworkId_S,
        clientAddress: TAddress,
        channelNames: Set<TChannelName>,
    ): void {
        this.networkChannelHash.leaveAllNetworkChannels(
            networkId,
            clientAddress,
            channelNames,
        );
    }

    /**
     * Creates a network channel if it does not exist.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TChannelName }  channelName
     * 
     * @returns { void } 
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
            this._globalChannelPubsub
                .publish(
                    `~/networks/${networkId}/channel-created`,
                    `${AUTHORITY_ON_CREATE_CHANNEL}:${channelName}`,
                );
        }
    }

}