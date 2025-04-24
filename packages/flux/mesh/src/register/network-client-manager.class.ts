import {
    type RedisConnection,
    getRedisConnection,
} from '../routing/redis/redis-connection.class';
import type {
    NetworkClientHash,
} from '../routing/redis/hash/network-client.redis.hash';
import type {
    TAddress,
    TClientOwnUId,
    TNetworkId_S,
} from '@flux/shared/types';

export class NetworkClientManager {
    private readonly redisConnection: RedisConnection = getRedisConnection();
    private readonly cache: Map<`${TNetworkId_S}.${TClientOwnUId}`, TAddress> = new Map(); // ! cleanup

    public readonly networkClientHash: NetworkClientHash;

    constructor(

    ) {
        this.networkClientHash = this.redisConnection.networkClientHash;
    }

    /**
     * Register a local client UID.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TAddress }         clientId
     * @param { TClientOwnUId }     uid
     */
    public registerClientUId(
        networkId: TNetworkId_S,
        clientId: TAddress,
        uid: TClientOwnUId
    ): void {
        this.networkClientHash.registerNetworkClient(networkId, clientId, uid);
    }

    public async resolveNetworkClientAddressByUid(
        networkId: TNetworkId_S,
        clientOwnUId: TClientOwnUId
        // retryWithDelay?: number,
    ): Promise<TAddress> {
        const cached: TAddress | undefined = this.cache.get(
            `${networkId}.${clientOwnUId}`
        );

        if (cached) {
            return cached;
        }

        const address: TAddress =
            await this.redisConnection.networkClientHash.resolveNetworkClientAddressOrThrow(
                networkId,
                clientOwnUId
            );

        this.cache.set(`${networkId}.${clientOwnUId}`, address);

        return address;
    }

    // public register(
    //     networkId: TNetworkId_S,
    //     socketId: TClientId,
    // ): void {
    //     this.redisConnection
    //         .networkAuthoritySet
    //         .registerNetworkAuthority(
    //             networkId,
    //             socketId,
    //         );
    // }

    // public unregister(
    //     networkId: TNetworkId_S,
    //     socketId: TClientId,
    // ): void {
    //     this.cache.delete(networkId);

    //     this.redisConnection
    //         .networkAuthoritySet
    //         .unregister(
    //             networkId,
    //             socketId,
    //         );
    // }

    // public async resolveNetworkAuthorityAddressOrThrow(
    //     networkId: TNetworkId_S,
    //     // retryWithDelay?: number,
    // ): Promise<TAddress> {
    //     const cached: TAddress | undefined = this.cache.get(networkId);

    //     if (cached) {
    //         return cached;
    //     }

    //     const address: TAddress = await this.redisConnection
    //         .networkAuthoritySet
    //         .resolveNetworkAuthorityAddressOrThrow(networkId);

    //     this.cache.set(networkId, address);

    //     return address;
    // }
}
