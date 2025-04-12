import { RedisClientType } from 'redis';
import { TAddress, TClientOwnUId, TNetworkId_S } from '@flux/shared';

export class NetworkClientHash {
    constructor(private readonly client: RedisClientType) {}

    public async registerNetworkClient(
        networkId: TNetworkId_S,
        clientId: TAddress,
        uid: TClientOwnUId
    ): Promise<void> {
        const key: string = `networks/${networkId}/client-uid`;
        //  await this.client
        //      .set([address], '1', { EX: 5 });

        await this.client.hSet(key, {
            [uid]: clientId,
        });

        await this.client.expire(key, 500);
    }

    /**
     *
     * @param networkId
     *
     * @returns { Promise<TAddress> }
     */
    public async resolveNetworkClientAddressOrThrow(
        networkId: TNetworkId_S,
        clientOwnUId: TClientOwnUId
    ): Promise<TAddress> {
        const key: string = `networks/${networkId}/client-uid`;

        const data = await this.client.hGet(key, clientOwnUId);

        console.log('GOT HAHSHS', data);

        if (!data) {
            console.error('data', data, 'key', key);
            throw new Error(
                `Network authority not found for networkId: "${networkId}"`
            );
        }

        return data as TAddress;
    }

    // public async unregister(
    //     networkId: TNetworkId_S,
    //     _socketId: TClientId,
    // ): Promise<void> {
    //     console.log('TODO unregistering', networkId, _socketId);

    //     const key: string = `networks/${networkId}/client-uid`;
    //     //  await this.client
    //     //      .set([address], '1', { EX: 5 });
    //     // console.log('setting', new Date().toISOString());

    //     // console.log("unregisrterdd", key);

    //      await this.client.del(key,);

    // }

    /**
     *
     * @param networkId
     *
     * @returns { Promise<TAddress> }
     */
    // public async resolveNetworkAuthorityAddressOrThrow(
    //     networkId: TNetworkId_S,
    // ): Promise<TAddress> {
    //     const key: string = `networks/${networkId}/clients`;

    //     const data = await this.client.hGetAll(key);

    //     if (!data.machineAddress || !data.processId || !data.socketId) {
    //         console.error('data', data, 'key', key);
    //         throw new Error(`Network authority not found for networkId: "${networkId}"`);
    //     }

    //     return `${data.machineAddress}/${data.processId}/${data.socketId}` as TAddress;
    // }
}
