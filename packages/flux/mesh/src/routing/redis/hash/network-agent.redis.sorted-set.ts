import type { RedisClient } from 'bun';
import type {
    TAddress,
    TClientId,
    TMachineAddress,
    TNetworkId_S,
    TProcessId,
} from '@flux/shared/types';
import { readMachineAddress, readProcessId } from '../../addressing.utils';

export class NetworkAgentRedisSortedSet {
    private readonly processId: TProcessId = readProcessId();
    private readonly machineAddress: TMachineAddress = readMachineAddress();

    constructor(
        private readonly client: RedisClient,
    ) { }

    /**
     * Registers a network agent in the sorted set.
     * 
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TClientId } socketId - The socket/client ID
     * 
     * @returns { Promise<void> }
     */
    public async registerAgent(
        networkId: TNetworkId_S,
        socketId: TClientId,
    ): Promise<void> {
        const address: TAddress = `${this.machineAddress}/${this.processId}/${socketId}`;

        await this.client.send('ZADD', [
            `networks/${networkId}/agents`, // Key
            `${Date.now()}`, // Score
            address, // Member
        ]);
    }

    /**
     * Unregisters a network agent from the sorted set.
     * 
     * @param { TNetworkId_S } networkId - The network ID
     * @param { TClientId } socketId - The socket/client ID
     * 
     * @returns { Promise<number> } The number of elements removed
     */
    public async unregisterAgent(
        networkId: TNetworkId_S,
        socketId: TClientId
    ): Promise<number> {
        const address: TAddress = `${this.machineAddress}/${this.processId}/${socketId}`;

        return await this.client.send('ZREM', [
            `networks/${networkId}/agents`,
            address, // Member
        ]);
    }

}
