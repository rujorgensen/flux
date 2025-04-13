import { RedisClientType } from 'redis';
import { TAddress, TClientId, TNetworkId_S } from '@flux/shared/types';
import { readMachineAddress, readProcessId } from '../../addressing.utils';

export class RedisHash {
    constructor(private readonly client: RedisClientType) {}

    public async registerNetworkAuthority(
        networkId: TNetworkId_S,
        socketId: TClientId
    ): Promise<void> {
        const key: string = `networks/${networkId}/authorities`;
        //  await this.client
        //      .set([address], '1', { EX: 5 });
        // console.log('setting', new Date().toISOString());

        await this.client.hSet(key, {
            socketId,
            processId: readProcessId(),
            machineAddress: readMachineAddress(),
            registeredAt: Date.now(),
        });

        await this.client.expire(key, 500);
    }

    public async unregister(
        networkId: TNetworkId_S,
        _socketId: TClientId
    ): Promise<void> {
        console.log('unregistering', networkId, _socketId);

        const key: string = `networks/${networkId}/authorities`;
        //  await this.client
        //      .set([address], '1', { EX: 5 });
        // console.log('setting', new Date().toISOString());

        // console.log("unregisrterdd", key);

        await this.client.del(key);
    }

    /**
     *
     * @param networkId
     *
     * @returns { Promise<TAddress> }
     */
    public async resolveNetworkAuthorityAddressOrThrow(
        networkId: TNetworkId_S
    ): Promise<TAddress> {
        const key: string = `networks/${networkId}/authorities`;

        const data = await this.client.hGetAll(key);

        if (!data.machineAddress || !data.processId || !data.socketId) {
            console.error('data', data, 'key', key);
            throw new Error(
                `Network authority not found for networkId: "${networkId}"`
            );
        }

        return `${data.machineAddress}/${data.processId}/${data.socketId}` as TAddress;
    }
}
