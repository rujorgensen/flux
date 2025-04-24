import type { RedisClient } from 'bun';
import type {
    TAddress,
    TClientId,
    TMachineAddress,
    TNetworkId_S,
    TProcessId,
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

        await this.client.send('ZADD', [key, `${Date.now()}`, address]);

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
        socketId: TClientId
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

        return await this.client.send('ZREM', [key, address]);
    }

    /**
     * Reads the network authority address from the sorted set.
     * 
     * @param { TNetworkId_S }  networkId
     *
     * @returns { Promise<TAddress> }
     */
    public async resolveNetworkAuthorityAddressOrThrow(
        networkId: TNetworkId_S,
    ): Promise<TAddress> {
        const key: string = `networks/${networkId}/authorities`;
        const list = await this.client.zrandmember(
            key,
        ) as unknown as string[];

        // console.log('list', list, key);
        const data = list[0];

        if (!data) {
            console.error('data', data, 'key', key);

            throw new Error(`Network authority not found for networkId: '${networkId}'`);
        }

        return data as TAddress;
    }
}
