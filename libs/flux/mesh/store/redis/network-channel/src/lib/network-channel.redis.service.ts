/**
 * Store data related to network channels
 */

import type {
    TAddress,
    TNetworkId_S,
    TChannelName,
    INetworkChannel,
    INetworkChannelState,
    TNetworkChannelCountAt,
} from '@flux/shared/types';
import { NetworkChannelHash } from './network-channel.redis.hash';
import { RedisConnection } from '../../../../../../../../packages/flux/mesh/src/routing/redis/redis-connection.class';
import { NetworkChannelRedisEvents } from './network-channel.redis.events';
import { TMemberDistribution } from './utils/derive-member-distribution.fn';

export class NetworkChannelService {

    private readonly _networkChannelHash: NetworkChannelHash;
    private readonly _networkChannelRedisEvents: NetworkChannelRedisEvents;

    constructor(
        private readonly _redisConnection: RedisConnection,

    ) {
        this._networkChannelHash = new NetworkChannelHash(this._redisConnection);
        this._networkChannelRedisEvents = new NetworkChannelRedisEvents(this._redisConnection);
    }

    // ****************************************************************************
    // * Create
    // ****************************************************************************

    /**
     * Creates a channel on a network if it does not already exist.
     * Returns true if the channel was created, false if it already existed.
     */
    public async createNetworkChannelIfNotExist(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<boolean> {
        const wasCreated = await this._networkChannelHash
            .createNetworkChannelIfNotExist(
                networkId,
                channelName,
            );

        if (wasCreated) {
            // Emit to listeners
            await this._networkChannelRedisEvents
                .advertiseChannelCreate(
                    networkId,
                    channelName,
                );

            await this._networkChannelRedisEvents
                .advertiseChannelCount(
                    networkId,
                    await this._networkChannelHash.readNetworkChannelCount(networkId),
                );
        }

        return wasCreated;
    }

    // ****************************************************************************
    // * Read
    // ****************************************************************************

    /**
     * Reads all channels on a network.
     */
    public async readNetworkChannels(
        networkId: TNetworkId_S,
    ): Promise<INetworkChannel[]> {
        return this._networkChannelHash
            .readNetworkChannels(
                networkId,
            );
    }

    /**
     * Reads all channel names on a network.
     */
    public async readNetworkChannelNames(
        networkId: TNetworkId_S,
    ): Promise<TChannelName[]> {
        return this._networkChannelHash
            .readNetworkChannelNames(
                networkId,
            );
    }

    /**
     * Reads the total number of active channels on a network.
     */
    public async readNetworkChannelCount(
        networkId: TNetworkId_S,
    ): Promise<TNetworkChannelCountAt> {
        return this._networkChannelHash
            .readNetworkChannelCount(
                networkId,
            );
    }

    /**
     * Reads the number of members in a channel on a network.
     */
    public async readNetworkMemberCount(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<number> {
        return this._networkChannelHash
            .readNetworkMemberCount(
                networkId,
                channelName,
            );
    }

    /**
     * Reads all members of a channel on a network.
     */
    public async readNetworkChannelMemberAddresses(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<TAddress[]> {
        return this._networkChannelHash
            .readNetworkChannelMemberAddresses(
                networkId,
                channelName,
            );
    }

    // ****************************************************************************
    // * Update
    // ****************************************************************************

    /**
     * Adds a client to a channel on a network and returns the total number of members in the channel.
     */
    public async joinNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<number> {
        // Store
        const memberCount = await this._networkChannelHash
            .joinNetworkChannel(
                networkId,
                channelName,
                clientAddress,
            );

        // Emit to listeners
        await this._networkChannelRedisEvents
            .advertiseChannelStateChange(
                networkId,
                {
                    channelName,
                    memberDistribution: memberCount.memberDistribution,
                    members: memberCount.memberCount,
                },
            );

        return memberCount.memberCount;
    }

    /**
     * Removes a client from a channel on a network.
     * Deletes the channel if there are no members left.
     */
    public async leaveNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<{ memberCount: number; memberDistribution?: TMemberDistribution; }> {
        const state = await this._networkChannelHash
            .leaveNetworkChannel(
                networkId,
                channelName,
                clientAddress,
            );

        if ((state.memberCount > 0) && state.memberDistribution) {
            await this._networkChannelRedisEvents
                .advertiseChannelStateChange(
                    networkId,
                    {
                        channelName,
                        memberDistribution: state.memberDistribution,
                        members: state.memberCount,
                    },
                );
        } else {
            await this._networkChannelRedisEvents
                .advertiseChannelDelete(
                    networkId,
                    channelName,
                );
        }

        return state;
    }

    /**
     * Leaves all network channels.
     */
    public async leaveAllNetworkChannels(
        networkId: TNetworkId_S,
        clientAddress: TAddress,
        channelNames: Set<TChannelName>,
    ): Promise<void> {
        await Promise.all(
            [...channelNames]
                .map((channelName) =>
                    this.leaveNetworkChannel(
                        networkId,
                        channelName,
                        clientAddress,
                    ),
                ),
        );
    }

    /**
     * Increments the usage counter of a channel.
     */
    public async incrementUsage(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        usage: number,
    ): Promise<number> {
        // Store
        const newUsage = await this._networkChannelHash
            .incrementUsage(
                networkId,
                channelName,
                usage,
            );

        // Emit to listeners
        await this._networkChannelRedisEvents
            .advertiseChannelUsage(
                networkId,
                channelName,
                newUsage,
            );

        return newUsage;
    }

    // ****************************************************************************
    // * Delete
    // ****************************************************************************

    /**
     * Deletes a channel on a network.
     */
    public async deleteNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<void> {
        const deletedChannel = await this._networkChannelHash
            .deleteNetworkChannel(
                networkId,
                channelName,
            );

        await this._networkChannelRedisEvents
            .advertiseChannelDelete(
                networkId,
                channelName,
            );

        await this._networkChannelRedisEvents
            .advertiseChannelCount(
                networkId,
                await this._networkChannelHash.readNetworkChannelCount(networkId),
            );

        return deletedChannel;
    }

    // ****************************************************************************
    // * Events
    // ****************************************************************************
    public onChannelCreate(
        networkId: TNetworkId_S,
        callback: (
            channelName: TChannelName,
        ) => void,
    ): Promise<void> {
        return this._networkChannelRedisEvents
            .onChannelCreate(
                networkId,
                callback,
            );
    }

    public onChannelUsage(
        networkId: TNetworkId_S,
        callback: (
            channelName: TChannelName,
            usageBytes: number,
        ) => void,
    ): Promise<void> {
        return this._networkChannelRedisEvents
            .onChannelUsage(
                networkId,
                callback,
            );
    }

    public onChannelCount(
        networkId: TNetworkId_S,
        callback: (
            channelCount: TNetworkChannelCountAt,
        ) => void,
    ): Promise<void> {
        return this._networkChannelRedisEvents
            .onChannelCount(
                networkId,
                callback,
            );
    }

    public onChannelStateChange(
        networkId: TNetworkId_S,
        callback: (
            channelState: INetworkChannelState,
        ) => void,
    ): Promise<void> {
        return this._networkChannelRedisEvents
            .onChannelStateChange(
                networkId,
                callback,
            );
    }

    public onChannelDelete(
        networkId: TNetworkId_S,
        callback: (
            channelName: TChannelName,
        ) => void,
    ): Promise<void> {
        return this._networkChannelRedisEvents
            .onChannelDelete(
                networkId,
                callback,
            );
    }
}
