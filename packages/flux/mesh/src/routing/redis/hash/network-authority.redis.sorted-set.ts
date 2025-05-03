import type { RedisClient } from 'bun';
import {
    type TAddress,
    type TClientId,
    type TMachineAddress,
    type TNetworkId_S,
    type TProcessId,
    splitAddressOrThrow,
} from '@flux/shared/types';
import { readMachineAddress, readProcessId } from '../../addressing.utils';

export class NetworkAuthorityRedisSortedSet {
    private readonly processId: TProcessId = readProcessId();
    private readonly machineAddress: TMachineAddress = readMachineAddress();

    private readonly refreshNetworkExpiry: Map<TNetworkId_S, Set<TClientId>> = new Map();

    constructor(
        private readonly client: RedisClient,
    ) {
        setInterval(async () => {
            for (const networkId of this.refreshNetworkExpiry.keys()) {
                const key: string = `networks/${networkId}/authorities`;
                await this.client.expire(key, 500);
            }
        }, 35_000);
    }

    /**
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TClientId }     socketId
     * 
     * @returns { Promise<void> }
     */
    public async registerNetworkAuthority(
        networkId: TNetworkId_S,
        socketId: TClientId,
    ): Promise<void> {
        const key: string = `networks/${networkId}/authorities`;
        const address: TAddress = `${this.machineAddress}/${this.processId}/${socketId}`;

        await this.client.sadd(key, address);

        await this.client.expire(key, 500);

        // Update the refresh interval cache
        const refreshNetworkExpiry: Set<TClientId> | undefined = this.refreshNetworkExpiry.get(networkId);
        if (refreshNetworkExpiry) {
            refreshNetworkExpiry.add(socketId);
        } else {
            this.refreshNetworkExpiry.set(networkId, new Set([socketId]));
        }
    }

    /**
     * Unregisters a network authority from the sorted set.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TClientId }     socketId
     * 
     * @returns { Promise<number> } 
     */
    public async unregister(
        networkId: TNetworkId_S,
        socketId: TClientId,
    ): Promise<number> {
        const key: string = `networks/${networkId}/authorities`;

        const address: TAddress = `${this.machineAddress}/${this.processId}/${socketId}`;

        // Update the refresh interval cache
        const refreshNetworkExpiry: Set<TClientId> | undefined = this.refreshNetworkExpiry.get(networkId);
        if (refreshNetworkExpiry) {
            refreshNetworkExpiry.delete(socketId);

            if (refreshNetworkExpiry.size === 0) {
                this.refreshNetworkExpiry.delete(networkId);
            }
        }

        return await this.client.srem(key, address);
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

        return await this.client.srem(key, address);
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
        if (!this.client.connected) {
            throw new Error('Redis client is not connected');
        }

        const list: string[] = await this.client.smembers(
            `networks/${networkId}/authorities`,
        );

        if (list.length === 0) {
            throw new Error(`Network authority not found for networkId: '${networkId}'`);
        }

        return list as TAddress[];
    }
}
