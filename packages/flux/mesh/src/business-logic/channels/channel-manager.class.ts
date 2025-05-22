import {
    type TAddress,
    type TChannelName,
    type TNetworkId_S,
    AUTHORITY_ON_CREATE_CHANNEL,
    AUTHORITY_ON_EMPTY_CHANNEL,
    ON_NETWORK_CHANNEL_PUBLISH,
} from '@flux/shared/types';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from '../../routing/redis/redis-connection.class';
import type { GlobalChannelPubsub } from '../../routing/global-channel/global-channel-pubsub.class';

// ! TODO Hardcoded for now, take from network config in the future
const MAX_CHANNEL_MEMBERS = 25;

interface IUsageCache {
    networkId: TNetworkId_S;
    usage: number;
};
export class NetworkChannelManager {
    private readonly channelUsageCount: Map<TChannelName, IUsageCache> = new Map();
    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly networkChannelHash: NetworkChannelHash = new NetworkChannelHash(
        this.redisConnection,
    );

    constructor(
        private readonly _globalChannelPubsub: GlobalChannelPubsub,
    ) {
        setInterval(() => {
            for (const [channelName, usage] of this.channelUsageCount) {

                if (usage.usage > 0) {
                    this.networkChannelHash
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
     * @param { TConnectedClientSocket | undefined } clientSocket - Optional client socket to emit latest value
     * 
     * @returns { void } 
     */
    public joinNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
        clientSocket?: any, // Using any to avoid cyclic dependency
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

        // If client wants the latest value, try to get it
        if (clientSocket) {
            this.networkChannelHash.getLatestChannelValue(networkId, channelName)
                .then(latestValue => {
                    if (latestValue && clientSocket.send) {
                        const messageString: string = latestValue;
                        clientSocket.send(`${ON_NETWORK_CHANNEL_PUBLISH}:${channelName}:${messageString}`);
                    }
                })
                .catch(error => {
                    console.warn(`Failed to get latest value for channel ${channelName}:`, error);
                });
        }
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

    // ****************************************************************************
    // *** Update
    // ****************************************************************************

    /**
     * Stores the latest value for a channel.
     * 
     * @param { TNetworkId_S } networkId
     * @param { TChannelName } channelName
     * @param { string } value
     * 
     * @returns { Promise<void> }
     */
    public storeLatestChannelValue(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        value: string,
    ): void {
        this.networkChannelHash.setLatestChannelValue(
            networkId,
            channelName,
            value,
        );
    }

    /**
     * Increases the usage count of a channel.
     * 
     * @param { TNetworkId_S } networkId
     * @param { TChannelName } channelName
     * @param { number } usage
     * 
     * @returns { void }
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
}