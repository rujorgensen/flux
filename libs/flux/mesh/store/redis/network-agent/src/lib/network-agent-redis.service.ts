/**
 * Loopkup a client address by UID
 */
import type {
    TAddress,
    TClientId,
    TAgentOwnUId,
    TNetworkId_S,
    TNetworkAgentCountAt,
} from '@flux/shared/types';
import type { TNetworkAgent } from './network-agent-cache.type';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';
import { NetworkAgentRedisRepository } from './network-agent-redis.repository';
import { NetworkAgentRedisEvents } from './network-agent-redis.events';
import { RedisClient } from 'bun';

export class NetworkAgentRedisService {

    private readonly _networkAgentRedisRepository: NetworkAgentRedisRepository;
    private readonly _networkAgentRedisEvents: NetworkAgentRedisEvents;

    constructor(
        private readonly _client: RedisClient,
    ) {
        this._networkAgentRedisRepository = new NetworkAgentRedisRepository(this._client);
        this._networkAgentRedisEvents = new NetworkAgentRedisEvents(this._client);
    }

    // ****************************************************************************
    // * Create
    // ****************************************************************************

    /**
     * Register an agent.
     */
    public async registerAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        ip: Bun.SocketAddress | null,
        address: TAddress,
        uid?: TAgentOwnUId,
        machineUID?: TFluxClientUID,
    ): Promise<void> {
        return this._networkAgentRedisRepository
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
     * Updates the throughput statistics for a registered agent.
     */
    public async registerAgentThroughput(
        networkId: TNetworkId_S,
        clientId: TClientId,
        bytes: number,
        packets: number,
    ): Promise<void> {
        return this._networkAgentRedisRepository
            .registerAgentThroughput(
                networkId,
                clientId,
                bytes,
                packets,
            );
    }

    // ****************************************************************************
    // * Read
    // ****************************************************************************

    /**
     * Returns all agents on a network.
     */
    public async readAgents(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAgent[]> {
        return this._networkAgentRedisRepository
            .readAgents(networkId);
    }

    /**
     * Reads the current number of connected agents on the given network.
     */
    public async readAgentCount(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAgentCountAt> {
        return this._networkAgentRedisRepository
            .readAgentCount(networkId);
    }

    /**
     * Resolves the network client address by an agent's UID or throws.
     */
    public async readClientAddressByUIDOrThrow(
        networkId: TNetworkId_S,
        clientOwnUId: TAgentOwnUId,
    ): Promise<TAddress> {
        return this._networkAgentRedisRepository
            .readClientAddressByUIDOrThrow(
                networkId,
                clientOwnUId,
            );
    }

    public async readAgentByClientId(
        networkId: TNetworkId_S,
        clientId: TClientId,
    ): Promise<TNetworkAgent | null> {
        return this._networkAgentRedisRepository
            .readAgentByClientId(
                networkId,
                clientId,
            );
    }

    // ****************************************************************************
    // * Delete
    // ****************************************************************************

    /**
     * Unregisters a network agent UID and address in the Redis hash.
     * 
     * @throws 'Network agent not found for clientId ...'
     */
    public async unregisterAgentOrThrow(
        clientId: TClientId,
        networkId?: TNetworkId_S,
        uid?: TAgentOwnUId,
    ): Promise<void> {
        return this._networkAgentRedisRepository
            .unregisterAgentOrThrow(
                clientId,
                networkId,
                uid,
            );
    }
}
