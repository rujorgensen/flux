import {
    type TAddress,
    type TClientId,
    type TNetworkId_S,
    splitAddressOrThrow,
} from '@flux/shared/types';
import {
    getMeshRedisConnection,
} from '../routing/redis/redis-connection.class';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';
import {
    NetworkAuthorityRedisService
} from '@flux/mesh/store/redis/network-authority';
export class NetworkAuthorityCache {
    private readonly redisConnection: NetworkAuthorityRedisService = new NetworkAuthorityRedisService(getMeshRedisConnection());
    private readonly cache: Map<TNetworkId_S, Set<TAddress>> = new Map();
    private readonly clientCache: Map<TClientId, { networkId: TNetworkId_S, address: TAddress; }> = new Map();

    /**
     * Registers a network authority.
     * 
     * @param { TNetworkId_S } networkId - The network ID to register on
     * @param { TClientId } clientId - The socket ID of the authority
     * @param { TFluxClientUID } [machineUID] - Optional machine UID
     * 
     * @returns { Promise<void> }
     */
    public async register(
        networkId: TNetworkId_S,
        clientId: TClientId,
        machineUID?: TFluxClientUID,
    ): Promise<void> {
        await this.redisConnection
            .registerAuthority(
                networkId,
                clientId,
                machineUID,
            );
    }

    /**
     * Unregisters a network authority from the local network.
     * 
     * @param { TClientId } clientId
     * @param { TNetworkId_S } [networkId]
     * 
     * @returns { Promise<void> }
     */
    public async unregister(
        clientId: TClientId,
        networkId?: TNetworkId_S,
    ): Promise<void> {
        const clientInfo: { networkId: TNetworkId_S, address: TAddress; } | undefined = this.clientCache.get(clientId);

        if (clientInfo) {
            const cached: Set<TAddress> | undefined = this.cache.get(clientInfo.networkId);
            if (cached) {
                cached.delete(clientInfo.address);
                if (cached.size === 0) {
                    this.cache.delete(clientInfo.networkId);
                }
            }

            this.clientCache.delete(clientId);
        }

        await this.redisConnection
            .unregisterAuthority(
                clientId,
                networkId,
            );
    }

    /**
     * Resolves a random network authority address for a given network ID.
     * 
     * @param { TNetworkId_S } networkId - The network ID to resolve an authority for
     * 
     * @returns { Promise<TAddress> } The resolved authority address
     */
    public async resolveAuthorityAddressOrThrow(
        networkId: TNetworkId_S
        // retryWithDelay?: number,
    ): Promise<TAddress> {
        const cached: Set<TAddress> | undefined = this.cache.get(networkId);

        if (cached && (cached.size > 0)) {
            const randomItem = [...cached][Math.floor(Math.random() * cached.size)];

            if (randomItem) {
                return randomItem;
            }
        }

        const addresses: TAddress[] = await this.redisConnection
            .resolveAuthorityAddressesOrThrow(
                networkId,
            );

        for (const address of addresses) {
            const [_machineAddress, _processId, clientId] = splitAddressOrThrow(address);
            this.clientCache.set(clientId, { networkId, address });
        }

        // Update the local cache
        this.cache.set(networkId, new Set(addresses));

        const randomItem = addresses[Math.floor(Math.random() * addresses.length)];

        return randomItem;
    }

    /**
     * Removes a client from the cache and unregisters it globally.
     * 
     * @param { TNetworkId_S } networkId
     * @param { TAddress } networkAuthorityAddress - The address of the unresponsive client
     */
    public removeUnresponsiveClient(
        networkId: TNetworkId_S,
        networkAuthorityAddress: TAddress,
    ): Promise<boolean> {
        const cached: Set<TAddress> | undefined = this.cache.get(networkId);
        if (cached) {
            cached.delete(networkAuthorityAddress);
            if (cached.size === 0) {
                this.cache.delete(networkId);
            }
        }

        const [_machineAddress, _processId, clientId] = splitAddressOrThrow(networkAuthorityAddress);
        this.clientCache.delete(clientId);

        return this.redisConnection
            .unregisterGlobal(
                networkId,
                networkAuthorityAddress,
            )
            .then((count: number) => count === 1)
            ;
    }
}
