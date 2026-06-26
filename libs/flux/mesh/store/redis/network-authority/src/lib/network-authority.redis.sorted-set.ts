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

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {}

    /**
     * The per-process Set key tracking which authorities a given mesh process
     * owns. The orphan reaper ({@link ProcessClass.cleanupOrphans}) reads this
     * to remove authorities left behind when a process crashes — the crash
     * fallback that replaces the previous TTL on the authority set.
     */
    private processAuthoritiesKey(
        machineAddress: TMachineAddress,
        processId: TProcessId,
    ): string {
        return `~/machines/processes/${machineAddress}/${processId}/authorities`;
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
        const key: string = `networks/${networkId}/authorities`;
        const address: TAddress = `${this.machineAddress}/${this.processId}/${clientId}`;

        await this._redisConnection.hash.sadd(key, address);

        // Add to global list
        await this._redisConnection.hash.hset(
            `~/clients`,
            {
                [clientId]: networkId,
            }
        );

        // Track on the owning process so the orphan reaper can clean up the
        // authority if this process crashes without disconnecting cleanly.
        await this._redisConnection.hash.sadd(
            this.processAuthoritiesKey(this.machineAddress, this.processId),
            clientId,
        );

        // Add to authority
        await this._redisConnection.hash.hset(
            `networks/${networkId}/authorities/${clientId}`,
            {
                ...(ip ? {
                    'ip': ip.address,
                } : {}),
                ...(machineUID ? {
                    'machineUID': typeof machineUID === 'string' ? machineUID : '',
                } : {}),
                'address': address,
                'connectedAt': new Date().toISOString(),
            },
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
                `~/clients`,
                clientId,
            );

        // Remove from network
        await this._redisConnection.hash.srem(key, clientId);

        // Stop tracking on the owning process
        await this._redisConnection.hash.srem(
            this.processAuthoritiesKey(this.machineAddress, this.processId),
            clientId,
        );

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
        const [machineAddress, processId, clientId] = splitAddressOrThrow(address);

        // Stop tracking on the process that owned the authority
        await this._redisConnection.hash.srem(
            this.processAuthoritiesKey(machineAddress, processId),
            clientId,
        );

        // Remove from global
        await this._redisConnection
            .hash
            .hdel(
                `~/clients`,
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
        const networkId = await this._redisConnection.hash.hget(`~/clients`, clientId);

        if (!networkId) {
            throw new Error(`Network authority not found for clientId: '${clientId}'`);
        }

        return networkId as TNetworkId_S;
    }
}
