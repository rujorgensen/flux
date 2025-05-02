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
} from '../redis-connection.class';

export class NetworkChannelHash {

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) { }

    /**
     * Creates a channel on a network.
     * 
     * @param networkId 
     * @param channelName 
     */
    public async createNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<void> {
        await this._redisConnection.hash.sadd(`networks/${networkId}/channels`, channelName);

        const key_: string = `networks/${networkId}/channels/${channelName}/`;
        await this._redisConnection.hash.hmset(key_, [
            'createdAt',
            new Date().toISOString(),
        ]);
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
     * 
     * @param networkId 
     * @param channelName 
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
     * @param networkId 
     * @param channelName 
     * @param clientAddress 
     * @returns 
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
            Array.from(channelNames).map(async (channelName) => {
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