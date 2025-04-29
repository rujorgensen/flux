/**
 * Loopkup a client address by UID
 */
import type { RedisClient } from 'bun';
import type {
    TAddress,
    TClientOwnUId,
    TNetworkId_S,
} from '@flux/shared/types';

export class NetworkClientHash {

    constructor(
        private readonly client: RedisClient,
    ) { }

    public async registerNetworkClient(
        networkId: TNetworkId_S,
        clientId: TAddress,
        uid: TClientOwnUId
    ): Promise<void> {
        const key: string = `networks/${networkId}/client-uids`;

        await this.client.hmset(key, [
            uid,
            clientId,
        ]);
        
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
        const key: string = `networks/${networkId}/client-uids`;

        const data = await this.client.hmget(key, [clientOwnUId]);

        if (!data[0]) {
            console.error('data', data, 'key', key);
            throw new Error(
                `Network authority not found for networkId: "${networkId}"`
            );
        }

        return data[0] as TAddress;
    }
}
