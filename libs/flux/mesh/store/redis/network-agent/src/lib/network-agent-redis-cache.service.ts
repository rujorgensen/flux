/**
 * Loopkup a client address by UID
 */
import type { RedisClient } from 'bun';
import type {
    TAddress,
    TClientId,
    TClientOwnUId,
    TNetworkId_S,
} from '@flux/shared/types';

export class NetworkAgentRedisCacheService {

    constructor(
        private readonly _client: RedisClient,
    ) { }

    // ****************************************************************************
    // * Create
    // ****************************************************************************

    /**
     * Register an agent.
     *
     * @param { TNetworkId_S }              networkId
     * @param { TClientId }                 id
     * @param { Bun.SocketAddress | null }  ip
     * @param { TAddress }                  address
     * 
     * @returns { void }
     */
    public async registerAgent(
        networkId: TNetworkId_S,
        id: TClientId,
        ip: Bun.SocketAddress | null,
        address: TAddress,
    ): Promise<void> {
        // Add to network
        await this._client.sadd(`networks/${networkId}/agents`, id);

        // Add to agent
        const key: string = `networks/${networkId}/agents/${id}`;

        await this._client.hmset(key, [
            'ip',
            typeof ip === 'string' ? ip : '',
            'address',
            address,
        ]);
    }

    /**
     * Registers a network client UID and address in the Redis hash.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TAddress }          clientId
     * @param { TClientOwnUId }     uid
     * 
     * @returns { void }
     */
    public async registerAgentUID(
        networkId: TNetworkId_S,
        clientId: TAddress,
        uid: TClientOwnUId
    ): Promise<void> {
        const key: string = `networks/${networkId}/client-uids`;

        await this._client.hmset(key, [
            uid,
            clientId,
        ]);

        await this._client.expire(key, 500);
    }

    // ****************************************************************************
    // * Read
    // ****************************************************************************


    /**
     * Resolves the network client address by an agent's UID or throws.
     * 
     * @param { TNetworkId_S }  networkId
     * @param { TClientOwnUId }  networkId
     *
     * @returns { Promise<TAddress> }
     */
    public async readNetworkClientAddressOrThrow(
        networkId: TNetworkId_S,
        clientOwnUId: TClientOwnUId
    ): Promise<TAddress> {
        const data = await this._client.hmget(`networks/${networkId}/client-uids`, [clientOwnUId]);

        if (!data[0]) {
            throw new Error(`Network agent not found for networkId: '${networkId}'`);
        }

        return data[0] as TAddress;
    }

    // ****************************************************************************
    // * Delete
    // ****************************************************************************

    /**
     * Unregisters a network client UID and address in the Redis hash.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TClientOwnUId }     uid
     * 
     * @returns { void }
     */
    public async deleteNetworkClient(
        networkId: TNetworkId_S,
        uid: TClientOwnUId
    ): Promise<void> {
        await this._client.send('HDEL', [`networks/${networkId}/client-uids`, uid]);
    }

}
