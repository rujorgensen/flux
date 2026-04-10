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
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TClientId } id - The client socket ID
     * @param { Bun.SocketAddress | null } ip - The client IP address
     * @param { TAddress } address - The client address
     * @param { object } throughput - The throughput tracking object
     * @param { TAgentOwnUId } [uid] - Optional agent UID
     * @param { TFluxClientUID } [machineUID] - Optional machine UID
     * 
     * @returns { Promise<void> }
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
            }, 1_000),
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
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TClientId } clientId - The client socket ID
     * @param { TAgentOwnUId } [clientOwnUId] - Optional agent UID
     * 
     * @returns { void }
     */
    public unregisterNetworkAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        clientOwnUId?: TAgentOwnUId,
    ): void {
        if (clientOwnUId) {
            // Unregisters a network client UID and address in the Redis hash.
            this.cache.delete(`${networkId}.${clientOwnUId}`);

            this.networkAgentRedisService.unregisterNetworkAgent(
                networkId,
                clientId,
                clientOwnUId,
            );
        }

        // Cancel the timer
        clearInterval(this.timers.get(clientId));
        this.timers.delete(clientId);
    }

    /**
     * Resolves the network client address by an agent's UID, using a local cache to avoid unnecessary Redis calls.
     * 
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TAgentOwnUId } clientOwnUId - The agent UID to look up
     * 
     * @returns { Promise<TAddress> } The resolved address
     */
    public async resolveNetworkClientAddressByUid(
        networkId: TNetworkId_S,
        clientOwnUId: TAgentOwnUId,
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
