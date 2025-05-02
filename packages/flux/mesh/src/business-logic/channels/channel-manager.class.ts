import {
    type TAddress,
    type TChannelName,
    type TNetworkId_S,
    AUTHORITY_ON_CREATE_CHANNEL,
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

    public async canHaveMembers(

    ): Promise<boolean> {
        console.error('canHaveMembers not implemented.');

        return Promise.resolve(true);
    }

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