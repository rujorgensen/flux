/**
 * Store data about network channels
 */
import {
    validateChannelNameOrThrow,
    type TAddress,
    type TChannelName,
    type TNetworkId_S,
} from '@flux/shared/types';
import type {
    RedisConnection,
} from '../../../../../../../../packages/flux/mesh/src/routing/redis/redis-connection.class';

export class NetworkChannelHash {

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) { }

    /**
     * Creates a channel on a network if it does not already exist.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TChannelName }  channelName
     * 
     * @returns { Promise<void> }
     */
    public async createNetworkChannelIfNotExist(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<void> {
        // Returns 1 if the member was added, 0 if it already existed
        const wasAdded: number = await this._redisConnection.hash.sadd(`networks/${networkId}/channels`, channelName);

        if (wasAdded === 1) {
            await this._redisConnection.hash.hmset(`networks/${networkId}/channels/${channelName}`, [
                'createdAt',
                new Date().toISOString(),
            ]);
        }
    }

    /**
     * Reads all channels on a network.
     *  
     * @param networkId
     *
     * @returns { Promise<TAddress> }
     */
    public async readNetworkChannels(
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
     * Reads all channels on a network.
     *  
     * @param networkId
     *
     * @returns { Promise<number> }
     */
    public async readNetworkChannelCount(
        networkId: TNetworkId_S,
    ): Promise<number> {
        return await this._redisConnection.hash.scard(`networks/${networkId}/channels`);
    }

    /**
     * Reads all channels on a network.
     *  
     * @param { TNetworkId_S } networkId
     * @param { TChannelName } channelName
     *
     * @returns { Promise<TAddress> }
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
     * Deletes a channel on a network.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TChannelName }  channelName
     * 
     * @returns { Promise<void> }
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
     * 
     * @param networkId 
     * @param channelName 
     * @param clientAddress 
     * @returns 
     */
    public async joinNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<number> {
        // * Add member
        await this._redisConnection.hash.sadd(`networks/${networkId}/channels/${channelName}/members`, clientAddress);

        // * Increment channel member count
        return await this._redisConnection.hash.hincrby(`networks/${networkId}/channels/${channelName}`, 'members', 1);
    }

    /**
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TChannelName }  channelName
     * @param { TAddress }      clientAddress
     * 
     * @returns { Promise<number> } 
     */
    public async leaveNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<number> {
        // * Remove member
        await this._redisConnection.hash.srem(`networks/${networkId}/channels/${channelName}/members`, clientAddress);

        // * Decrement channel member count
        const membersLeft: number = await this._redisConnection.hash.hincrby(`networks/${networkId}/channels/${channelName}`, 'members', -1);

        // * If no members left, delete the channel
        if (membersLeft < 1) {
            console.log(`Network channel "${channelName}" has no more members. Deleting...`);
            await this.deleteNetworkChannel(networkId, channelName);
        }

        return membersLeft;
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
}