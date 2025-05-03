import {
    type TAddress,
    type TChannelName,
    type TNetworkId_S,
    AUTHORITY_ON_CREATE_CHANNEL,
    AUTHORITY_ON_EMPTY_CHANNEL,
} from '@flux/shared/types';
import { NetworkChannelHash } from '../../routing/redis/hash/network-channel.redis.hash';
import {
    type RedisConnection,
    getRedisConnection,
} from '../../routing/redis/redis-connection.class';
import type { GlobalChannelPubsub } from '../../routing/global-channel/global-channel-pubsub.class';

export class NetworkChannelManager {
    private readonly redisConnection: RedisConnection = getRedisConnection();
    private readonly networkChannelHash: NetworkChannelHash = new NetworkChannelHash(
        this.redisConnection,
    );

    constructor(
        private readonly _globalChannelPubsub: GlobalChannelPubsub,
    ) { }

    /**
     * Checks if a channel can have more members.
     * 
     * @param { TChannelName }  _channelName
     * 
     * @returns { Promise<boolean> } 
     */
    public async canHaveMembers(
        _channelName: TChannelName,
    ): Promise<boolean> {
        console.error('canHaveMembers not implemented.');

        return Promise.resolve(true);
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
        this.createNetworkChannelIfNowExist(
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
    private async createNetworkChannelIfNowExist(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<void> {
        console.error('! TODO: Check if the channel already exists');

        await this.networkChannelHash
            .createNetworkChannel(
                networkId,
                channelName,
            );

        this._globalChannelPubsub
            .publish(
                `~/networks/${networkId}/channel-created`,
                `${AUTHORITY_ON_CREATE_CHANNEL}:${channelName}`,
            );
    }

}