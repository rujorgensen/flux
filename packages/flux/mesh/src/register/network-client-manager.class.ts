import {
    type RedisConnection,
    getMeshRedisConnection,
} from '../routing/redis/redis-connection.class';
import type {
    NetworkAgentRedisService,
} from '@flux/mesh/store/redis/network-agent';
import {
    NetworkUsageRedisCacheService,
} from '@flux/mesh/store/redis/network-usage';
import type {
    TAddress,
    TClientId,
    TAgentOwnUId,
    TNetworkId_S,
} from '@flux/shared/types';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';

export class NetworkAgentManager {
    public readonly networkAgentRedisService: NetworkAgentRedisService;
    public readonly networkUsageRedisCacheService: NetworkUsageRedisCacheService;

    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly cache: Map<`${TNetworkId_S}.${TAgentOwnUId}`, TAddress> = new Map(); // ! cleanup
    private readonly timers: Map<TClientId, ReturnType<typeof setInterval>> = new Map();

    constructor(

    ) {
        this.networkAgentRedisService = this.redisConnection.networkAgentRedisService;
        this.networkUsageRedisCacheService = new NetworkUsageRedisCacheService(this.redisConnection['cacheClient'].getClient());
    }

    /**
     * Register an agent.
     *
     * @param { TNetworkId_S }              networkId
     * @param { TClientId }                 id
     * @param { Bun.SocketAddress | null }  ip
     * @param { TAddress }                  address
     * @param { TAgentOwnUId }              [uid]
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
        uid?: TAgentOwnUId,
        machineUID?: TFluxClientUID,
    ): Promise<void> {
        this.timers.set(
            id,
            setInterval(async () => {
                await this.networkAgentRedisService
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
            }, 2_000),
        );

        return this.networkAgentRedisService
            .registerAgent(
                networkId,
                id,
                ip,
                address,
                uid,
                machineUID,
            );
    }

    /**
     * Unregisters a network agent UID and associated data from the Redis hash.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TClientId }         clientId
     * @param { TAgentOwnUId }     clientOwnUId
     * 
     * @returns { void }
     */
    public unregisterNetworkAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        address: TAddress,
        clientOwnUId?: TAgentOwnUId,
    ): void {
        if (clientOwnUId) {
            // Unregisters a network client UID and address in the Redis hash.
            this.cache.delete(`${networkId}.${clientOwnUId}`);

            this.networkAgentRedisService.unregisterNetworkAgent(
                networkId,
                clientId,
                clientOwnUId,
                address,
            );
        }

        // Cancel the timer
        clearInterval(this.timers.get(clientId));
    }

    public async resolveNetworkClientAddressByUid(
        networkId: TNetworkId_S,
        clientOwnUId: TAgentOwnUId
        // retryWithDelay?: number,
    ): Promise<TAddress> {
        const cached: TAddress | undefined = this.cache.get(
            `${networkId}.${clientOwnUId}`
        );

        if (cached) {
            return cached;
        }

        const address: TAddress = await this.redisConnection
            .networkAgentRedisService
            .readNetworkClientAddressByUIDOrThrow(
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
