import {
    type RedisConnection,
    getRedisConnection,
} from '../routing/redis/redis-connection.class';
import type {
    NetworkAgentRedisCacheService,
} from '../routing/redis/hash/network-agent-redis-cache.service';
import type {
    TAddress,
    TClientOwnUId,
    TNetworkId_S,
} from '@flux/shared/types';

export class NetworkClientManager {
    private readonly redisConnection: RedisConnection = getRedisConnection();
    private readonly cache: Map<`${TNetworkId_S}.${TClientOwnUId}`, TAddress> = new Map(); // ! cleanup

    public readonly networkClientHash: NetworkAgentRedisCacheService;

    constructor(

    ) {
        this.networkClientHash = this.redisConnection.networkClientHash;
    }

    /**
     * Register a local client UID.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TAddress }          clientId
     * @param { TClientOwnUId }     uid
     * 
     * @returns { void }
     */
    public registerClientUId(
        networkId: TNetworkId_S,
        clientId: TAddress,
        uid: TClientOwnUId,
    ): void {
        this.networkClientHash.registerNetworkClient(networkId, clientId, uid);
    }

    /**
     * Unregisters a network client UID and address in the Redis hash.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TClientOwnUId }     clientOwnUId
     * 
     * @returns { void }
     */
    public unregisterNetworkClient(
        networkId: TNetworkId_S,
        clientOwnUId: TClientOwnUId,
    ): void {
        this.cache.delete(`${networkId}.${clientOwnUId}`);

        this.networkClientHash.unregisterNetworkClient(networkId, clientOwnUId);
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

        const address: TAddress = await this.redisConnection
            .networkClientHash
            .resolveNetworkClientAddressOrThrow(
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

}
