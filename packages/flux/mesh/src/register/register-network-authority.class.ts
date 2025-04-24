import type { TAddress, TClientId, TNetworkId_S } from '@flux/shared/types';
import {
    type RedisConnection,
    getRedisConnection,
} from '../routing/redis/redis-connection.class';

export class NetworkAuthorityManager {
    private readonly redisConnection: RedisConnection = getRedisConnection();
    private readonly cache: Map<TNetworkId_S, TAddress> = new Map(); // ! TODO MANY RESOLVERS

    public register(
        networkId: TNetworkId_S,
        socketId: TClientId,
    ): void {
        this.redisConnection.networkAuthoritySet.registerNetworkAuthority(
            networkId,
            socketId
        );
    }

    public unregister(
        networkId: TNetworkId_S,
        socketId: TClientId,
    ): void {
        this.cache.delete(networkId);

        this.redisConnection.networkAuthoritySet.unregister(
            networkId,
            socketId
        );
    }

    public async resolveNetworkAuthorityAddressOrThrow(
        networkId: TNetworkId_S
        // retryWithDelay?: number,
    ): Promise<TAddress> {
        const cached: TAddress | undefined = this.cache.get(networkId);

        if (cached) {
            return cached;
        }

        const address: TAddress =
            await this.redisConnection.networkAuthoritySet.resolveNetworkAuthorityAddressOrThrow(
                networkId
            );

        this.cache.set(networkId, address);

        return address;
    }
}
