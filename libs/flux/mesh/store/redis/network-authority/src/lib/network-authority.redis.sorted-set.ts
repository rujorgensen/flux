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
} from '@flux/shared/types';
import {
    readMachineAddress,
    readProcessId,
} from '../../../../../../../../packages/flux/mesh/src/routing/addressing.utils';
import type {
    TFluxClientUID,
} from '@flux/shared/utils';

export class NetworkAuthorityRedisSortedSet {
    private readonly processId: TProcessId = readProcessId();
    private readonly machineAddress: TMachineAddress = readMachineAddress();

    private readonly refreshNetworkExpiry: Map<TNetworkId_S, Set<TClientId>> = new Map();

    constructor(
        private readonly _client: RedisClient,
    ) {
        setInterval(async () => {
            for (const networkId of this.refreshNetworkExpiry.keys()) {
                const key: string = `networks/${networkId}/authorities`;
                await this._client.expire(key, 500);
            }
        }, 35_000);
    }

    // ****************************************************************************
    // *** Create
    // ****************************************************************************

    /**
     * Register a network authority.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TClientId }     clientId
     * 
     * @returns { Promise<void> }
     */
    public async registerNetworkAuthority(
        networkId: TNetworkId_S,
        clientId: TClientId,
        machineUID?: TFluxClientUID,
    ): Promise<void> {
        const key: string = `networks/${networkId}/authorities`;
        const address: TAddress = `${this.machineAddress}/${this.processId}/${clientId}`;

        await this._client.sadd(key, address);

        await this._client.expire(key, 500);

        // Add to authority
        await this._client.hmset(
            `networks/${networkId}/authorities/${clientId}`,
            [
                ...(machineUID ? [
                    'machineUID',
                    typeof machineUID === 'string' ? machineUID : '',
                ] : []),

                'address',
                address,

                'connectedAt',
                new Date().toISOString(),
            ],
        );

        // Update the refresh interval cache
        const refreshNetworkExpiry: Set<TClientId> | undefined = this.refreshNetworkExpiry.get(networkId);
        if (refreshNetworkExpiry) {
            refreshNetworkExpiry.add(clientId);
        } else {
            this.refreshNetworkExpiry.set(networkId, new Set([clientId]));
        }
    }

    /**
     * Unregisters a network authority from the sorted set.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TClientId }     clientId
     * 
     * @returns { Promise<number> } 
     */
    public async unregister(
        networkId: TNetworkId_S,
        clientId: TClientId,
    ): Promise<number> {
        const key: string = `networks/${networkId}/authorities`;

        const address: TAddress = `${this.machineAddress}/${this.processId}/${clientId}`;

        await this._client.srem(`networks/${networkId}/authorities`, clientId);

        // Update the refresh interval cache
        const refreshNetworkExpiry: Set<TClientId> | undefined = this.refreshNetworkExpiry.get(networkId);
        if (refreshNetworkExpiry) {
            refreshNetworkExpiry.delete(clientId);

            if (refreshNetworkExpiry.size === 0) {
                this.refreshNetworkExpiry.delete(networkId);
            }
        }

        return await this._client.srem(key, address);
    }

    /**
     * Unregisters a network authority from the sorted set, even if it wasnt added by this worker.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TClientId }     socketId
     * 
     * @returns { Promise<number> } 
     */
    public async unregisterGlobal(
        networkId: TNetworkId_S,
        address: TAddress,
    ): Promise<number> {
        const key: string = `networks/${networkId}/authorities`;

        // Update the refresh interval cache
        const refreshNetworkExpiry: Set<TClientId> | undefined = this.refreshNetworkExpiry.get(networkId);
        if (refreshNetworkExpiry) {
            try {
                const [_machineAddress, _processId, clientId] = splitAddressOrThrow(address);
                refreshNetworkExpiry.delete(clientId);

                if (refreshNetworkExpiry.size === 0) {
                    this.refreshNetworkExpiry.delete(networkId);
                }
            } catch { }
        }

        return await this._client.srem(key, address);
    }

    // ****************************************************************************
    // *** Read
    // ****************************************************************************

    /**
     * Returns all network authorities.
     * 
     * @param { TNetworkId_S }  networkId
     *
     * @returns { Promise<TNetworkAuthority> }
     */
    public async readNetworkAuthorities(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAuthority[]> {
        // Add to network
        const networkAuthorities = await this._client.smembers(`networks/${networkId}/authorities`);

        // Add to authority
        const authorityData: TNetworkAuthority[] = [];

        for (const address of networkAuthorities) {
            try {
                const [_machineAddress, _processId, clientId] = splitAddressOrThrow(address as TAddress);
                const key: string = `networks/${networkId}/authorities/${clientId}`;

                const [connectedAt] = await this._client.hmget(key, [
                    'connectedAt',
                ]);

                if (connectedAt) {
                    authorityData.push({
                        id: clientId as TClientId,
                        connectedAt: new Date(connectedAt as unknown as Date),
                    });
                }
            } catch (error) {
                // Skip invalid addresses
                continue;
            }
        }

        return authorityData;
    }

    /**
     * Returns paginated network authorities for improved performance.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { number }        page - Page number (1-based)
     * @param { number }        pageSize - Number of items per page
     *
     * @returns { Promise<{ data: TNetworkAuthority[], total: number }> }
     */
    public async readNetworkAuthoritiesPaginated(
        networkId: TNetworkId_S,
        page: number = 1,
        pageSize: number = 10,
    ): Promise<{ data: TNetworkAuthority[], total: number }> {
        // Get all authority addresses (lightweight operation)
        const networkAuthorities = await this._client.smembers(`networks/${networkId}/authorities`);
        const total = networkAuthorities.length;

        // Apply pagination to addresses only
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedAddresses = networkAuthorities.slice(startIndex, endIndex);

        // Only fetch full data for the paginated subset
        const authorityData: TNetworkAuthority[] = [];

        for (const address of paginatedAddresses) {
            try {
                const [_machineAddress, _processId, clientId] = splitAddressOrThrow(address as TAddress);
                const key: string = `networks/${networkId}/authorities/${clientId}`;

                const [connectedAt] = await this._client.hmget(key, [
                    'connectedAt',
                ]);

                if (connectedAt) {
                    authorityData.push({
                        id: clientId as TClientId,
                        connectedAt: new Date(connectedAt as unknown as Date),
                    });
                }
            } catch (error) {
                // Skip invalid addresses
                continue;
            }
        }

        return { data: authorityData, total };
    }

    /**
     * Reads the network authority address from the sorted set.
     * 
     * @param { TNetworkId_S }  networkId
     *
     * @returns { Promise<TAddress[]> }
     */
    public async resolveNetworkAuthorityAddressesOrThrow(
        networkId: TNetworkId_S,
    ): Promise<TAddress[]> {
        if (!this._client.connected) {
            throw new Error('Redis client is not connected');
        }

        const list: string[] = await this._client.smembers(
            `networks/${networkId}/authorities`,
        );

        if (list.length === 0) {
            throw new Error(`Network authority not found for networkId: '${networkId}'`);
        }

        return list as TAddress[];
    }

    /**
     * Reads the current number of connected authorities on the given network.
     * 
     * @param { TNetworkId_S }  networkId
     *
     * @returns { Promise<TNetworkAuthorityCountAt> }
     */
    public async readNetworkAuthorityCount(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAuthorityCountAt> {
        return {
            count: await this._client.scard(`networks/${networkId}/authorities`) ?? 0,
            date: new Date(),
        };
    }

    // ****************************************************************************
    // *** Update
    // ****************************************************************************

    // ****************************************************************************
    // *** Delete
    // ****************************************************************************

}
