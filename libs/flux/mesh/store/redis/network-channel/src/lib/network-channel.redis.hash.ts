/**
 * Store data related to network channels
 */

import {
    type INetworkChannel,
    type TAddress,
    type TChannelName,
    type TNetworkChannelCountAt,
    type TNetworkId_S,
    validateChannelNameOrThrow,
} from '@flux/shared/types';
import type {
    RedisConnection,
} from '../../../../../../../../packages/flux/mesh/src/routing/redis/redis-connection.class';
import {
    type TMemberDistribution,
    checkMemberDistribution,
} from './utils/derive-member-distribution.fn';
import { PicoLogger } from '@utils/pico-logger';

export class NetworkChannelHash {

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {}

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
        // Returns 1 if the member was added, 0 if it already existed
        const wasAdded: number = await this._redisConnection.hash.sadd(`networks/${networkId}/channels`, channelName);

        if (wasAdded === 1) {
            const defaultMemberDistribution: TMemberDistribution = 'same-process';

            await this._redisConnection.hash.hset(
                `networks/${networkId}/channels/${channelName}`,
                {
                    'createdAt': new Date().toISOString(),
                    'memberDistribution': defaultMemberDistribution,
                    'usage': '0',
                });
        }

        return wasAdded === 1;
    }

    // ****************************************************************************
    // * Read
    // ***************************************************************************

    /**
     * Reads all channels on a network.
     */
    public async readNetworkChannels(
        networkId: TNetworkId_S,
    ): Promise<INetworkChannel[]> {
        const channelNames: TChannelName[] = await this.readNetworkChannelNames(networkId);

        // Add to channel list
        const channels: INetworkChannel[] = [];

        for (const channelName of channelNames) {
            const [createdAt, memberDistribution, members, usage] = await this._redisConnection.hash.hmget(
                `networks/${networkId}/channels/${channelName}`,
                [
                    'createdAt',
                    'memberDistribution',
                    'members',
                    'usage',
                ],
            );

            if (createdAt && memberDistribution && usage) {
                channels.push({
                    channelName,
                    memberDistribution: memberDistribution,
                    members: Number.parseInt((members) ?? '0', 10),
                    bytes: Number.parseInt(usage || '0', 10),
                    createdAt: new Date(createdAt),
                });
            }
        }

        return channels;
    }

    /**
     * Reads all channel names on a network.
     */
    public async readNetworkChannelNames(
        networkId: TNetworkId_S,
    ): Promise<TChannelName[]> {
        const data = await this._redisConnection.hash.smembers(`networks/${networkId}/channels`);

        try {
            if (!data.every(validateChannelNameOrThrow)) {
                throw new Error('This will never happen');
            }
        } catch (error) {
            throw new Error(`Caught error while reading networks (${networkId}) from Redis: ${error instanceof Error ? error.message : 'unknown error'}`);
        }

        return data;
    }

    /**
     * Reads the total number of active channels on a network.
     */
    public async readNetworkChannelCount(
        networkId: TNetworkId_S,
    ): Promise<TNetworkChannelCountAt> {
        return {
            count: await this._redisConnection.hash.scard(`networks/${networkId}/channels`),
            date: new Date(),
        };
    }

    /**
     * Reads the number of members in a channel on a network.
     */
    public async readNetworkMemberCount(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<number> {
        const [members] = await this._redisConnection.hash.hmget(`networks/${networkId}/channels/${channelName}`, ['members']);

        if (!members) {
            return 0;
        }

        return Number.parseInt(members, 10);
    }

    /**
     * Reads all members of a channel on a network.
     */
    public async readNetworkChannelMemberAddresses(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<TAddress[]> {
        return await this._redisConnection.hash.smembers(`networks/${networkId}/channels/${channelName}/members`) as TAddress[];
    }

    /**
     * Deletes a channel on a network.
     */
    public async deleteNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<void> {
        await this._redisConnection.hash.srem(`networks/${networkId}/channels`, channelName);
        await this._redisConnection.hash.del(`networks/${networkId}/channels/${channelName}`);
        await this._redisConnection.hash.del(`networks/${networkId}/channels/${channelName}/members`);
    }

    /**
     * Adds a client to a channel on a network.
     */
    public async joinNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<number> {
        // * Add member
        const membersAdded = await this._redisConnection.hash.sadd(
            `networks/${networkId}/channels/${channelName}/members`,
            clientAddress,
        );

        // * Check member distribution
        await this.checkAndUpdateChannelMemberDistribution(
            networkId,
            channelName,
        );

        if (membersAdded === 0) {
            // The member must already be a member of this channel
            PicoLogger.warn(`Unexpected existing member on network / channel "${networkId}"/"${channelName}". The member appears to already be part of the channel and cannot be added again.`, 'network-channel');

            return Promise.reject(new Error(`Client ${clientAddress} is already a member of channel "${channelName}" on network "${networkId}".`));
        }

        // * Increment channel member count
        return await this._redisConnection.hash.hincrby(
            `networks/${networkId}/channels/${channelName}`,
            'members',
            1,
        );
    }

    /**
     * Removes a client from a channel on a network.
     * Deletes the channel if there are no members left.
     */
    public async leaveNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<number> {
        // * Remove member
        const membersRemoved = await this._redisConnection.hash.srem(
            `networks/${networkId}/channels/${channelName}/members`,
            clientAddress,
        );

        if (membersRemoved === 0) {
            // The member must not be a member of this channel
            PicoLogger.warn(`Unexpected non-existing member on network / channel "${networkId}"/"${channelName}". The client does not appear to be a member of the channel and can not be removed.`, 'network-channel');

            return Promise.reject(new Error(`Client ${clientAddress} is not a member of channel "${channelName}" on network "${networkId}".`));
        }

        // * Decrement channel member count
        const membersLeft: number = await this._redisConnection.hash.hincrby(
            `networks/${networkId}/channels/${channelName}`,
            'members',
            -1,
        );

        // * If no members left, delete the channel
        if (membersLeft === 0) {
            PicoLogger.log(`Network channel "${channelName}" has no more members. Deleting...`, 'network-channel');
            await this.deleteNetworkChannel(networkId, channelName);
        } else {
            // * Check member distribution, but don't bother if there are no members left.
            await this.checkAndUpdateChannelMemberDistribution(networkId, channelName);
        }

        return membersLeft;
    }

    /**
     * Leaves all network channels.
     */
    public async leaveAllNetworkChannels(
        networkId: TNetworkId_S,
        clientAddress: TAddress,
        channelNames: Set<TChannelName>,
    ): Promise<void> {
        return Promise.all(
            [...channelNames].map(async (channelName) => {
                await this.leaveNetworkChannel(
                    networkId,
                    channelName,
                    clientAddress,
                );
            }),
        )
            .then(() => void 0);
    }

    // ****************************************************************************
    // * Update
    // ****************************************************************************
    /**
     * Increments the usage counter of a channel.
     */
    public async incrementUsage(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        usage: number,
    ): Promise<number> {
        // * Increment channel usage
        return await this._redisConnection.hash.hincrby(`networks/${networkId}/channels/${channelName}`, 'usage', usage);
    }

    // ****************************************************************************
    // * Internal Helpers
    // ****************************************************************************

    /**
     * Checks if the connected members are all on the same process, same machine or distributed, and updates the channel's hash.
     * 
     * Optimal is 'same-process', then 'same-machine' and finally 'distributed'.
     */
    private async checkAndUpdateChannelMemberDistribution(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<void> {
        const memberAddresses: TAddress[] = await this.readNetworkChannelMemberAddresses(networkId, channelName);

        const memberDistribution: TMemberDistribution = checkMemberDistribution(memberAddresses);

        await this._redisConnection.hash.hset(
            `networks/${networkId}/channels/${channelName}`,
            {
                'memberDistribution': memberDistribution,
            },
        );
    }
}
