import {
    type RedisConnection,
    getMeshRedisConnection,
} from '../routing/redis/redis-connection.class';
import {
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

export class NetworkAgentRedisCache {
    public readonly networkAgentRedisService: NetworkAgentRedisService;
    public readonly networkUsageRedisCacheService: NetworkUsageRedisCacheService;

    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly cache: Map<`${TNetworkId_S}.${TAgentOwnUId}`, TAddress> = new Map(); // ! cleanup
    private readonly timers: Map<TClientId, ReturnType<typeof setInterval>> = new Map();

    constructor(

    ) {
        this.networkAgentRedisService = new NetworkAgentRedisService(this.redisConnection);
        this.networkUsageRedisCacheService = new NetworkUsageRedisCacheService(this.redisConnection['cacheClient'].client);
    }

    /**
     * Register an agent.
     * 
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TClientId } clientId - The client socket ID
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
        clientId: TClientId,
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
            clientId,
            setInterval(async () => {
                await this.networkAgentRedisService
                    .registerAgentThroughput(
                        networkId,
                        clientId,
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
                clientId,
                ip,
                address,
                uid,
                machineUID,
            );
    }

    /**
     * Unregisters a network agent UID and associated data from the Redis hash.
     * 
     * @param { TClientId } clientId
     * @param { TNetworkId_S } [networkId]
     * @param { TAgentOwnUId } [clientOwnUId] - Optional agent UID
     * 
     * @returns { void }
     */
    public async unregister(
        clientId: TClientId,
        networkId?: TNetworkId_S,
        clientOwnUId?: { clientOwnUId: TAgentOwnUId, networkId: TNetworkId_S; },
    ): Promise<void> {
        if (clientOwnUId) {
            // Unregisters a network client UID and address in the Redis hash.
            this.cache.delete(`${clientOwnUId.networkId}.${clientOwnUId.clientOwnUId}`);
        }

        await this.networkAgentRedisService
            .unregisterAgentOrThrow(
                clientId,
                networkId,
                clientOwnUId?.clientOwnUId,
            );

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
    public async resolveClientAddressByUid(
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

        const address: TAddress = await this.networkAgentRedisService
            .readClientAddressByUIDOrThrow(
                networkId,
                clientOwnUId
            );

        this.cache.set(`${networkId}.${clientOwnUId}`, address);

        return address;
    }
}
