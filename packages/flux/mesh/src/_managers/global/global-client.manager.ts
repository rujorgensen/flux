/**
 * Global client manager.
 */
import { splitAddressOrThrow, type TAddress, type TClientId, type TProcessAddress } from '@flux/shared/types';
import { RedisConnection } from '../../routing/redis/redis-connection.class';
import { readProcessAddress } from '../../routing/addressing.utils';

export class GlobalClientManager {
    private readonly processAddress: TProcessAddress = readProcessAddress();

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) { }

    /**
     * Sends a global message to kick a client.
     * 
     * @param { TAddress } fullClientAddress - The full client address
     * 
     * @returns { Promise<void> }
     */
    public async kickClient(
        agentAddress: TAddress,
    ): Promise<void> {
        const [machineAddress, processId, clientId] = splitAddressOrThrow(agentAddress);
        const processAddress: TProcessAddress = `${machineAddress}/${processId}`;

        await this._redisConnection
            .publishCustom(
                'kick-client',
                processAddress,
                clientId,
            );
    }

    /**
     * On event on this process
     */
    public onKickClient(
        onKickCallback: (clientAddress: TClientId) => void,
    ): void {
        //  Listen to remote
        this._redisConnection.subscribeToCustom(
            'kick-client',
            this.processAddress,
            (
                clientId: string,
            ) => onKickCallback(clientId as TClientId),
        );
    }
}