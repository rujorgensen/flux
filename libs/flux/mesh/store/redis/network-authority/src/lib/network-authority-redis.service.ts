import {
    type TAddress,
    type TClientId,
    type TNetworkId_S,
    type TNetworkAuthority,
    type TNetworkAuthorityCountAt,
    splitAddressOrThrow,
} from '@flux/shared/types';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';
import { NetworkAuthorityRedisSortedSet } from './network-authority.redis.sorted-set';
import { NetworkAuthorityRedisEvents } from './network-authority-redis.events';
import { RedisConnection } from '@flux/mesh';

export class NetworkAuthorityRedisService {

    private readonly _networkAuthorityRedisSortedSet: NetworkAuthorityRedisSortedSet;
    private readonly _networkAuthorityRedisEvents: NetworkAuthorityRedisEvents;

    constructor(
        redisConnection: RedisConnection,
    ) {
        this._networkAuthorityRedisSortedSet = new NetworkAuthorityRedisSortedSet(redisConnection);
        this._networkAuthorityRedisEvents = new NetworkAuthorityRedisEvents(redisConnection);
    }

    // ****************************************************************************
    // *** Create
    // ****************************************************************************

    /**
     * Register a network authority.
     */
    public async registerAuthority(
        networkId: TNetworkId_S,
        clientId: TClientId,
        ip: Bun.SocketAddress | null,
        machineUID?: TFluxClientUID,
    ): Promise<void> {
        await this._networkAuthorityRedisSortedSet
            .registerAuthority(
                networkId,
                clientId,
                ip,
                machineUID,
            );

        await this._networkAuthorityRedisEvents
            .advertiseAuthorityCreated(
                networkId,
                clientId,
            );

        await this._networkAuthorityRedisEvents
            .advertiseAuthorityCountChange(
                networkId,
                await this.readAuthorityCount(networkId).then(c => c.count),
            );
    }

    // ****************************************************************************
    // *** Read
    // ****************************************************************************

    /**
     * Returns all network authorities.
     */
    public async readAuthorities(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAuthority[]> {
        return this._networkAuthorityRedisSortedSet
            .readAuthorities(networkId);
    }

    /**
     * Reads the network authority address from the sorted set.
     */
    public async resolveAuthorityAddressesOrThrow(
        networkId: TNetworkId_S,
    ): Promise<TAddress[]> {
        return this._networkAuthorityRedisSortedSet
            .resolveAuthorityAddressesOrThrow(networkId);

    }

    /**
     * Reads the current number of connected authorities on the given network.
     */
    public async readAuthorityCount(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAuthorityCountAt> {
        return this._networkAuthorityRedisSortedSet
            .readAuthorityCount(networkId);
    }

    public async readAuthorityByClientId(
        networkId: TNetworkId_S,
        clientId: TClientId,
    ): Promise<TNetworkAuthority | null> {
        return this._networkAuthorityRedisSortedSet
            .readAuthorityByClientId(networkId, clientId);
    }

    // ****************************************************************************
    // *** Update
    // ****************************************************************************

    // ****************************************************************************
    // *** Delete
    // ****************************************************************************

    /**
     * Unregisters a network authority from the sorted set.
     */
    public async unregisterAuthority(
        clientId: TClientId,
        networkId?: TNetworkId_S,
    ): Promise<void> {
        const ret: { networkId: TNetworkId_S; } = await this._networkAuthorityRedisSortedSet
            .unregisterAuthority(
                clientId,
                networkId,
            );

        await this._networkAuthorityRedisEvents
            .advertiseAuthorityDeleted(
                ret.networkId,
                clientId,
            );

        await this._networkAuthorityRedisEvents
            .advertiseAuthorityCountChange(
                ret.networkId,
                await this.readAuthorityCount(ret.networkId).then(c => c.count),
            );
    }

    /**
     * Unregisters a network authority from the sorted set, even if it wasnt added by this worker.
     */
    public async unregisterGlobal(
        networkId: TNetworkId_S,
        address: TAddress,
    ): Promise<number> {
        const result = await this._networkAuthorityRedisSortedSet
            .unregisterGlobal(
                networkId,
                address,
            );

        const [_machineAddress, _processId, clientId] = splitAddressOrThrow(address);
        await this._networkAuthorityRedisEvents
            .advertiseAuthorityDeleted(
                networkId,
                clientId,
            );

        await this._networkAuthorityRedisEvents
            .advertiseAuthorityCountChange(
                networkId,
                await this.readAuthorityCount(networkId).then(c => c.count),
            );

        return result;
    }

    // ****************************************************************************
    // * Events
    // ****************************************************************************
    public onAuthorityCountChange(
        networkId: TNetworkId_S,
        callback: (
            authorityCount: number,
        ) => void,
    ): Promise<void> {
        return this._networkAuthorityRedisEvents
            .onAuthorityCountChange(
                networkId,
                callback,
            );
    }

    public onAuthorityCreated(
        networkId: TNetworkId_S,
        callback: (
            clientId: TClientId,
        ) => void,
    ): Promise<void> {
        return this._networkAuthorityRedisEvents
            .onAuthorityCreated(
                networkId,
                callback,
            );
    }

    public onAuthorityDeleted(
        networkId: TNetworkId_S,
        callback: (
            clientId: TClientId,
        ) => void,
    ): Promise<void> {
        return this._networkAuthorityRedisEvents
            .onAuthorityDeleted(
                networkId,
                callback,
            );
    }

}
