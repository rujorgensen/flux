import type {
    TAddress,
    TClientId,
    TNetworkId_S,
    TNetworkAuthority,
    TNetworkAuthorityCountAt,
} from '@flux/shared/types';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';
import { NetworkAuthorityRedisSortedSet } from './network-authority.redis.sorted-set';
import { RedisClient } from 'bun';

export class NetworkAuthorityRedisService {

    private readonly _networkAuthorityRedisSortedSet: NetworkAuthorityRedisSortedSet;
    constructor(
        private readonly _client: RedisClient,
    ) {
        this._networkAuthorityRedisSortedSet = new NetworkAuthorityRedisSortedSet(this._client);
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
        machineUID?: TFluxClientUID,
    ): Promise<void> {
        return this._networkAuthorityRedisSortedSet
            .registerAuthority(
                networkId,
                clientId,
                machineUID,
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
        return this._networkAuthorityRedisSortedSet
            .unregisterAuthority(
                clientId,
                networkId,
            );
    }

    /**
     * Unregisters a network authority from the sorted set, even if it wasnt added by this worker.
     */
    public async unregisterGlobal(
        networkId: TNetworkId_S,
        address: TAddress,
    ): Promise<number> {
        return this._networkAuthorityRedisSortedSet
            .unregisterGlobal(
                networkId,
                address,
            );
    }

}
