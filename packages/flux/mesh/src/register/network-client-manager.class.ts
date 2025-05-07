import {
    type RedisConnection,
    getRedisConnection,
} from '../routing/redis/redis-connection.class';
import type {
    NetworkAgentRedisCacheService,
} from '@flux/mesh/store/redis/network-agent';
import type {
    TAddress,
    TClientId,
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
     * Register an agent.
     *
     * @param { TNetworkId_S }              networkId
     * @param { TClientId }                 id
     * @param { Bun.SocketAddress | null }  ip
     * @param { TAddress }                  address
     * 
     * @returns { void }
     */
    public registerAgent(
        networkId: TNetworkId_S,
        id: TClientId,
        ip: Bun.SocketAddress | null,
        address: TAddress,
    ): Promise<void> {
        return this.networkClientHash.registerAgent(networkId, id, ip, address);
    }

    /**
     * Register a local client UID.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TAddress }          clientAddress
     * @param { TClientOwnUId }     uid
     * 
     * @returns { void }
     */
    public registerClientUId(
        networkId: TNetworkId_S,
        clientAddress: TAddress,
        uid: TClientOwnUId,
    ): void {
        this.networkClientHash.registerAgentUID(networkId, clientAddress, uid);
    }

    /**
     * Unregisters a network client UID and associated data from the Redis hash.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TClientId }         clientId
     * @param { TClientOwnUId }     clientOwnUId
     * 
     * @returns { void }
     */
    public unregisterNetworkClient(
        networkId: TNetworkId_S,
        clientId: TClientId,
        clientOwnUId?: TClientOwnUId,
    ): void {
        if (clientOwnUId) {
            this.unregisterNetworkClientUID(networkId, clientId, clientOwnUId);
        }
    }

    /**
     * Unregisters a network client UID and address in the Redis hash.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TClientId }         clientId
     * @param { TClientOwnUId }     clientOwnUId
     * 
     * @returns { void }
     */
    private unregisterNetworkClientUID(
        networkId: TNetworkId_S,
        clientId: TClientId,
        clientOwnUId: TClientOwnUId,
    ): void {
        this.cache.delete(`${networkId}.${clientOwnUId}`);

        this.networkClientHash.deleteNetworkAgent(networkId, clientId, clientOwnUId);
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
            .readNetworkClientAddressOrThrow(
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
