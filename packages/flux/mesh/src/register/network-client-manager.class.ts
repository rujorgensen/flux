import {
    type RedisConnection,
    getRedisConnection,
} from '../routing/redis/redis-connection.class';
import type {
    NetworkAgentRedisCacheService,
} from '@flux/mesh/store/redis/network-agent';
import {
    NetworkUsageRedisCacheService,
} from '@flux/mesh/store/redis/network-usage';
import type {
    TAddress,
    TClientId,
    TClientOwnUId,
    TNetworkId_S,
} from '@flux/shared/types';

export class NetworkClientManager {
    public readonly networkClientHash: NetworkAgentRedisCacheService;
    public readonly networkUsageRedisCacheService: NetworkUsageRedisCacheService;

    private readonly redisConnection: RedisConnection = getRedisConnection();
    private readonly cache: Map<`${TNetworkId_S}.${TClientOwnUId}`, TAddress> = new Map(); // ! cleanup
    private readonly timers: Map<TClientId, ReturnType<typeof setInterval>> = new Map();

    constructor(

    ) {
        this.networkClientHash = this.redisConnection.networkClientHash;
        this.networkUsageRedisCacheService = new NetworkUsageRedisCacheService(this.redisConnection['cacheClient'].getClient());
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
        throughput: {
            bytes: number,
            packets: number,
        },
    ): Promise<void> {
        this.timers.set(
            id,
            setInterval(async () => {
                await this.networkClientHash
                    .registerAgentThroughput(
                        networkId,
                        id,
                        throughput.bytes,
                        throughput.packets,
                    );

                if ((throughput.bytes > 0) || (throughput.packets > 0)) {
                    await this.networkUsageRedisCacheService
                        .increaseNetworkUsage(
                            networkId,
                            throughput.bytes,
                            throughput.packets,
                        );
                }

                throughput.bytes = 0;
                throughput.packets = 0;
            }, 1_000),
        );

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
            // Unregisters a network client UID and address in the Redis hash.
            this.cache.delete(`${networkId}.${clientOwnUId}`);

            this.networkClientHash.deleteNetworkAgent(
                networkId,
                clientId,
                clientOwnUId,
            );
        }

        // Cancel the timer
        clearInterval(this.timers.get(clientId));
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
