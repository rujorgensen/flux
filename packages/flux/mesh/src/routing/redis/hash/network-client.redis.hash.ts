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

    /**
     * Registers a network client UID and address in the Redis hash.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TAddress }          clientId
     * @param { TClientOwnUId }     uid
     * 
     * @returns { void }
     */
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
     * Unregisters a network client UID and address in the Redis hash.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TClientOwnUId }     uid
     * 
     * @returns { void }
     */
    public async unregisterNetworkClient(
        networkId: TNetworkId_S,
        uid: TClientOwnUId
    ): Promise<void> {
        await this.client.send('HDEL', [`networks/${networkId}/client-uids`, uid]);
    }

    /**
     * Resolves the network client address by an agent's UID or throws.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TClientOwnUId }  networkId
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
            throw new Error(`Network agent not found for networkId: '${networkId}'`);
        }

        return data[0] as TAddress;
    }
}
