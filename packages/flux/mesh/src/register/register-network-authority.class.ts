import type { TAddress, TClientId, TNetworkId_S } from '@flux/shared/types';
import {
    type RedisConnection,
    getRedisConnection,
} from '../routing/redis/redis-connection.class';

export class NetworkAuthorityManager {
    private readonly redisConnection: RedisConnection = getRedisConnection();
    private readonly cache: Map<TNetworkId_S, Set<TAddress>> = new Map();

    public register(
        networkId: TNetworkId_S,
        socketId: TClientId,
    ): void {
        this.redisConnection.networkAuthoritySet
            .registerNetworkAuthority(
                networkId,
                socketId,
            );
    }

    public unregister(
        networkId: TNetworkId_S,
        socketId: TClientId,
    ): void {
        this.cache.delete(networkId);

        this.redisConnection.networkAuthoritySet.unregister(
            networkId,
            socketId,
        );
    }

    /**
     * Resolves a random network authority address for a given network ID.
     * 
     * @param { TNetworkId_S }  networkId
     * 
     * @returns { Promise<TAddress> }
     */
    public async resolveNetworkAuthorityAddressOrThrow(
        networkId: TNetworkId_S
        // retryWithDelay?: number,
    ): Promise<TAddress> {
        const cached: Set<TAddress> | undefined = this.cache.get(networkId);

        if (cached && (cached.size > 0)) {
            const randomItem = [...cached][Math.floor(Math.random() * [...cached].length)];

            if (randomItem) {
                return randomItem;
            }
        }

        const address: TAddress = await this.redisConnection
            .networkAuthoritySet
            .resolveNetworkAuthorityAddressOrThrow(
                networkId,
            );

        if (cached) {
            cached.add(address);
        } else {
            this.cache.set(networkId, new Set([address]));
        }

        return address;
    }
}
