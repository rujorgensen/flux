import type { RedisClient } from 'bun';
import {
    type TAddress,
    type TClientId,
    type TMachineAddress,
    type TNetworkAuthority,
    type TNetworkAuthorityCountAt,
    type TNetworkId_S,
    type TProcessId,
    splitAddressOrThrow,
    NetworkAuthorityNotFoundError,
} from '@flux/shared/types';
import {
    readMachineAddress,
    readProcessId,
} from '../../../../../../../../packages/flux/mesh/src/routing/addressing.utils';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';
import { RedisConnection } from '@flux/mesh';

export class NetworkAuthorityRedisSortedSet {
    private readonly processId: TProcessId = readProcessId();
    private readonly machineAddress: TMachineAddress = readMachineAddress();

    private readonly refreshNetworkExpiry: Map<TNetworkId_S, Set<TClientId>> = new Map();

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {
        setInterval(async () => {
            for (const networkId of this.refreshNetworkExpiry.keys()) {
                const key: string = `networks/${networkId}/authorities`;
                await this._redisConnection.hash.expire(key, 500);
            }
        }, 35_000);
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
        const key: string = `networks/${networkId}/authorities`;
        const address: TAddress = `${this.machineAddress}/${this.processId}/${clientId}`;

        await this._redisConnection.hash.sadd(key, address);

        await this._redisConnection.hash.expire(key, 500);

        // Add to global list
        await this._redisConnection.hash.hset(
            `~/authorities`,
            {
                [clientId]: networkId,
            }
        );

        // Add to authority
        await this._redisConnection.hash.hset(
            `networks/${networkId}/authorities/${clientId}`,
            {
                ...(machineUID ? {
                    'machineUID': typeof machineUID === 'string' ? machineUID : '',
                } : {}),
                'address': address,
                'connectedAt': new Date().toISOString(),
            },
        );

        // Update the refresh interval cache
        const refreshNetworkExpiry: Set<TClientId> | undefined = this.refreshNetworkExpiry.get(networkId);
        if (refreshNetworkExpiry) {
            refreshNetworkExpiry.add(clientId);
        } else {
            this.refreshNetworkExpiry.set(networkId, new Set([clientId]));
        }
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
        // Add to network
        const networkAuthorities: TAddress[] = await this._redisConnection.hash.smembers(`networks/${networkId}/authorities`) as TAddress[];

        // Add to authorities
        const authorities: TNetworkAuthority[] = [];

        for (const address of networkAuthorities) {
            const clientId: TClientId = splitAddressOrThrow(address)[2];

            const networkAuthority: TNetworkAuthority | null = await this.readAuthorityByClientId(
                networkId,
                clientId,
            );

            if (networkAuthority) {
                authorities.push(networkAuthority);
            }
        }

        return authorities;
    }

    /**
     * Reads the network authority address from the sorted set.
     */
    public async resolveAuthorityAddressesOrThrow(
        networkId: TNetworkId_S,
    ): Promise<TAddress[]> {
        let list: string[] = [];
        try {
            list = await this._redisConnection.hash.smembers(
                `networks/${networkId}/authorities`,
            );
        } catch {
            throw new Error('Redis client is not connected');
        }


        if (list.length === 0) {
            throw new NetworkAuthorityNotFoundError(networkId);
        }

        return list as TAddress[];
    }

    /**
     * Reads the current number of connected authorities on the given network.
     */
    public async readAuthorityCount(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAuthorityCountAt> {
        return {
            count: await this._redisConnection.hash.scard(`networks/${networkId}/authorities`),
            date: new Date(),
        };
    }

    public async readAuthorityByClientId(
        networkId: TNetworkId_S,
        clientId: TClientId,
    ): Promise<TNetworkAuthority | null> {
        const key: string = `networks/${networkId}/authorities/${clientId}`;

        const [address, connectedAt] = await this._redisConnection.hash.hmget(key, [
            'address',
            'connectedAt',
        ]);

        if (address && connectedAt) {
            return {
                id: clientId,
                connectedAt: new Date(connectedAt),
                address: address as TAddress,
            };
        }

        return null;
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
    ): Promise<{ networkId: TNetworkId_S; }> {
        const networkId_ = networkId ?? await this.readNetworkIdByClientIdOrThrow(clientId);

        const key: string = `networks/${networkId_}/authorities`;

        // Remove from global
        await this._redisConnection
            .hash
            .hdel(
                `~/authorities`,
                clientId,
            );

        // Remove from network
        await this._redisConnection.hash.srem(key, clientId);

        // Update the refresh interval cache
        const refreshNetworkExpiry: Set<TClientId> | undefined = this.refreshNetworkExpiry.get(networkId_);
        if (refreshNetworkExpiry) {
            refreshNetworkExpiry.delete(clientId);

            if (refreshNetworkExpiry.size === 0) {
                this.refreshNetworkExpiry.delete(networkId_);
            }
        }
        const address: TAddress = `${this.machineAddress}/${this.processId}/${clientId}`;

        // Remove from network
        await this._redisConnection.hash.srem(
            key,
            address,
        );

        return { networkId: networkId_ };
    }

    /**
     * Unregisters a network authority from the sorted set, even if it wasnt added by this worker.
     */
    public async unregisterGlobal(
        networkId: TNetworkId_S,
        address: TAddress,
    ): Promise<number> {
        const [_machineAddress, _processId, clientId] = splitAddressOrThrow(address);

        // Update the refresh interval cache
        const refreshNetworkExpiry: Set<TClientId> | undefined = this.refreshNetworkExpiry.get(networkId);
        if (refreshNetworkExpiry) {
            try {
                refreshNetworkExpiry.delete(clientId);

                if (refreshNetworkExpiry.size === 0) {
                    this.refreshNetworkExpiry.delete(networkId);
                }
            } catch {}
        }

        // Remove from global
        await this._redisConnection
            .hash
            .hdel(
                `~/authorities`,
                clientId,
            );

        return await this._redisConnection
            .hash
            .srem(
                `networks/${networkId}/authorities`,
                address,
            );
    }

    // ****************************************************************************
    // * Internal Helpers
    // ****************************************************************************
    private async readNetworkIdByClientIdOrThrow(
        clientId: TClientId,
    ): Promise<TNetworkId_S> {
        const networkId = await this._redisConnection.hash.hget(`~/authorities`, clientId);

        if (!networkId) {
            throw new Error(`Network authority not found for clientId: '${clientId}'`);
        }

        return networkId as TNetworkId_S;
    }
}
