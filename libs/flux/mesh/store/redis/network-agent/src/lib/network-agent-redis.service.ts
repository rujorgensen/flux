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
import { RedisConnection } from '@flux/mesh';

export class NetworkAgentRedisService {

    private readonly _networkAgentRedisRepository: NetworkAgentRedisRepository;
    private readonly _networkAgentRedisEvents: NetworkAgentRedisEvents;

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {
        this._networkAgentRedisRepository = new NetworkAgentRedisRepository(this._redisConnection);
        this._networkAgentRedisEvents = new NetworkAgentRedisEvents(this._redisConnection);
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
        fluxClientUID?: TFluxClientUID,
    ): Promise<void> {
        await this._networkAgentRedisRepository
            .registerAgent(
                networkId,
                clientId,
                ip,
                address,
                uid,
                fluxClientUID,
            );

        await this._networkAgentRedisEvents
            .advertiseAgentCreated(
                networkId,
                clientId,
            );

        await this._networkAgentRedisEvents
            .advertiseAgentCountChange(
                networkId,
                await this.readAgentCount(networkId).then(c => c.count),
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
        await this._networkAgentRedisRepository
            .registerAgentThroughput(
                networkId,
                clientId,
                bytes,
                packets,
            );

        await this._networkAgentRedisEvents
            .advertiseAgentThroughput(
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

    /**
     * Resolves which network an agent belongs to, from its client ID alone.
     *
     * @throws 'Network agent not found for clientId ...'
     */
    public async readAgentNetworkIdByClientIdOrThrow(
        clientId: TClientId,
    ): Promise<TNetworkId_S> {
        return this._networkAgentRedisRepository
            .readAgentNetworkIdByClientIdOrThrow(clientId);
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
        const networkId_: TNetworkId_S = networkId ?? await this._networkAgentRedisRepository
            .readAgentNetworkIdByClientIdOrThrow(clientId);

        await this._networkAgentRedisRepository
            .unregisterAgent(
                clientId,
                networkId_,
                uid,
            );

        await this._networkAgentRedisEvents
            .advertiseAgentDeleted(
                networkId_,
                clientId,
            );

        await this._networkAgentRedisEvents
            .advertiseAgentCountChange(
                networkId_,
                await this.readAgentCount(networkId_).then(c => c.count),
            );
    }

    // ****************************************************************************
    // * Events
    // ****************************************************************************
    public onAgentCountChange(
        networkId: TNetworkId_S,
        callback: (
            agentCount: number,
        ) => void,
    ): Promise<void> {
        return this._networkAgentRedisEvents
            .onAgentCountChange(
                networkId,
                callback,
            );
    }

    public onAgentThroughput(
        networkId: TNetworkId_S,
        callback: (
            clientId: TClientId,
            bytes: number,
            packets: number,
        ) => void,
    ): Promise<void> {
        return this._networkAgentRedisEvents
            .onAgentThroughput(
                networkId,
                callback,
            );
    }

    public onAgentCreated(
        networkId: TNetworkId_S,
        callback: (
            clientId: TClientId,
        ) => void,
    ): Promise<void> {
        return this._networkAgentRedisEvents
            .onAgentCreated(
                networkId,
                callback,
            );
    }

    public onAgentDeleted(
        networkId: TNetworkId_S,
        callback: (
            clientId: TClientId,
        ) => void,
    ): Promise<void> {
        return this._networkAgentRedisEvents
            .onAgentDeleted(
                networkId,
                callback,
            );
    }
}
