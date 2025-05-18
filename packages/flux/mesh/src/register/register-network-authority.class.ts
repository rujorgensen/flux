import { splitAddressOrThrow, type TAddress, type TClientId, type TNetworkId_S } from '@flux/shared/types';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from '../routing/redis/redis-connection.class';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';

export class NetworkAuthorityManager {
    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly cache: Map<TNetworkId_S, Set<TAddress>> = new Map();

    public register(
        networkId: TNetworkId_S,
        socketId: TClientId,
        machineUID?: TFluxClientUID,
    ): void {
        this.redisConnection.networkAuthoritySet
            .registerNetworkAuthority(
                networkId,
                socketId,
                machineUID,
            );
    }

    public unregister(
        networkId: TNetworkId_S,
        networkAuthorityAddress: TAddress,
    ): void {
        const cached: Set<TAddress> | undefined = this.cache.get(networkId);
        if (cached) {
            cached.delete(networkAuthorityAddress);
        }

        const [_machineAddress, _processId, clientId] = splitAddressOrThrow(networkAuthorityAddress);

        this.redisConnection.networkAuthoritySet.unregister(
            networkId,
            clientId,
        );
    }

    /**
     * Used for cleanup, in case of discovering an idle authority.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TAddress }      networkAuthorityAddress
     * 
     * @returns { void }
     */
    public unregisterGlobal(
        networkId: TNetworkId_S,
        networkAuthorityAddress: TAddress,
    ): void {
        const cached: Set<TAddress> | undefined = this.cache.get(networkId);
        if (cached) {
            cached.delete(networkAuthorityAddress);
        }

        this.redisConnection.networkAuthoritySet
            .unregisterGlobal(
                networkId,
                networkAuthorityAddress,
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

        const address: TAddress[] = await this.redisConnection
            .networkAuthoritySet
            .resolveNetworkAuthorityAddressesOrThrow(
                networkId,
            );

        if (cached) {
            for (const a of address) {
                cached.add(a);
            }
        } else {
            this.cache.set(networkId, new Set(address));
        }

        const cached_: Set<TAddress> = this.cache.get(networkId) as Set<TAddress>;
        const randomItem = [...cached_][Math.floor(Math.random() * [...cached_].length)];

        return randomItem;
    }

    /**
     * Removes a client.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TAddress }      networkAuthorityAddress
     * 
     * @returns { void }
     */
    public removeUnresponsiveClient(
        networkId: TNetworkId_S,
        networkAuthorityAddress: TAddress,
    ): void {
        this.unregisterGlobal(networkId, networkAuthorityAddress);
    }
}
