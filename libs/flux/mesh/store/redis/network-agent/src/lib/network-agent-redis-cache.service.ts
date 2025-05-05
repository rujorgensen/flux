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
import type { TNetworkAgent } from './network-agent-cache.type';

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
     * @param { TClientId }                 clientId
     * @param { Bun.SocketAddress | null }  ip
     * @param { TAddress }                  address
     * 
     * @returns { void }
     */
    public async registerAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        ip: Bun.SocketAddress | null,
        address: TAddress,
    ): Promise<void> {
        // Add to network
        await this._client.sadd(`networks/${networkId}/agents`, clientId);

        // Add to agent
        const key: string = `networks/${networkId}/agents/${clientId}`;

        await this._client.hmset(key, [
            ...(ip ? [
                'ip',
                typeof ip === 'string' ? ip : '',
            ] : []),
            'address',
            address,
        ]);
    }

    public async registerAgentThroughput(
        networkId: TNetworkId_S,
        clientId: TClientId,
        bytes: number,
        packets: number,
    ): Promise<void> {
        const key: string = `networks/${networkId}/agents/${clientId}`;

        // Consider if this should only be emitted via sockets, and not stored. Increase the total network 
        // usage though.
        await this._client.hmset(key, [
            'bytes',
            `${bytes}`,
            'packets',
            `${packets}`,
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
     * Returns all network agents.
     * 
     * @param { TNetworkId_S }  networkId
     *
     * @returns { Promise<TNetworkAgent> }
     */
    public async readNetworkAgents(
        networkId: TNetworkId_S,
    ): Promise<TNetworkAgent[]> {
        // Add to network
        const members = await this._client.smembers(`networks/${networkId}/agents`);

        // Add to agent
        const memberData: TNetworkAgent[] = [];

        console.log('members', members);

        for (const id of members) {
            const key: string = `networks/${networkId}/agents/${id}`;

            const [ip, address, bytes, packets] = await this._client.hmget(key, [
                'ip',
                'address',
                'bytes',
                'packets',
            ]);

            if (ip || address || bytes || packets) {
                memberData.push({
                    id: id as TClientId,
                    ip: ip || null,
                    address: address as string,
                    bytes: Number.parseInt(bytes || '0', 10),
                    packets: Number.parseInt(packets || '0', 10),
                });
            }
        }

        return memberData as any;
    }

    /**
     * Reads the current number of connected agents on the given network.
     * 
     * @param { TNetworkId_S }  networkId
     *
     * @returns { Promise<number> }
     */
    public async readNetworkAgentCount(
        networkId: TNetworkId_S,
    ): Promise<number> {
        // Add to network
        return (await this._client.scard(`networks/${networkId}/agents`));
    }

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
        const [clientAddress] = await this._client.hmget(`networks/${networkId}/client-uids`, [clientOwnUId]);

        if (!clientAddress) {
            throw new Error(`Network agent not found for networkId: '${networkId}'`);
        }

        return clientAddress as TAddress;
    }

    // ****************************************************************************
    // * Delete
    // ****************************************************************************

    /**
     * Unregisters a network agent UID and address in the Redis hash.
     *
     * @param { TNetworkId_S }      networkId
     * @param { TClientId }         clientId
     * @param { TClientOwnUId }     uid
     * 
     * @returns { void }
     */
    public async deleteNetworkAgent(
        networkId: TNetworkId_S,
        clientId: TClientId,
        uid: TClientOwnUId,
    ): Promise<void> {
        await this._client.send('HDEL', [`networks/${networkId}/client-uids`, uid]);
        await this._client.srem(`networks/${networkId}/agents`, clientId);
    }

}
