import type { RedisClient } from 'bun';
import type {
    TAddress,
    TClientId,
    TMachineAddress,
    TNetworkId_S,
    TProcessId,
} from '@flux/shared/types';
import { readMachineAddress, readProcessId } from '../../addressing.utils';

export class RedisSortedSet {
    private readonly processId: TProcessId = readProcessId();
    private readonly machineAddress: TMachineAddress = readMachineAddress();

    constructor(
        private readonly client: RedisClient,
    ) { }

    public async registerNetworkAuthority(
        networkId: TNetworkId_S,
        socketId: TClientId
    ): Promise<void> {
        const key: string = `networks/${networkId}/authorities`;
        //  await this.client
        //      .set([address], '1', { EX: 5 });
        // console.log('setting', new Date().toISOString());

        const address: TAddress = `${this.machineAddress}/${this.processId}/${socketId}`;

        await this.client.send("ZADD", [key, `${Date.now()}`, address]);

        await this.client.expire(key, 500);
    }

    /**
     * Unregisters a network authority from the sorted set.
     * 
     * @param networkId 
     * @param _socketId 
     * @returns 
     */
    public async unregister(
        networkId: TNetworkId_S,
        _socketId: TClientId
    ): Promise<number> {
        console.log('unregistering', networkId, _socketId);

        const key: string = `networks/${networkId}/authorities`;

        const address: TAddress = `${this.machineAddress}/${this.processId}/${_socketId}`;

        return await this.client.send("ZREM", [key, address]);
    }

    /**
     * Reads the network authority address from the sorted set.
     * 
     * @param networkId
     *
     * @returns { Promise<TAddress> }
     */
    public async resolveNetworkAuthorityAddressOrThrow(
        networkId: TNetworkId_S
    ): Promise<TAddress> {
        const key: string = `networks/${networkId}/authorities`;

        const list = await this.client.zrandmember(
            key,
            //         {
            //         BY: 'SCORE',
            //         // LIMIT: {
            //         //     count: 5,
            //         //     offset: 0,
            //         // }
            //     },
        ) as unknown as string[];

        // console.log('list', list, key);
        const data = list[0];

        if (!data) {
            console.error('data', data, 'key', key);

            throw new Error(`Network authority not found for networkId: "${networkId}"`);
        }

        return data as TAddress;
        // return `${data.machineAddress}/${data.processId}/${data.socketId}` as TAddress;

        // map((list: string[]) =>
        //     list
        //         .map((zMember: string): T => JSON.parse(zMember)),
        // ),

        // ;
    }
}
