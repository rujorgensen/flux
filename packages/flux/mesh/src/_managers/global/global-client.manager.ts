/**
 * Global client manager.
 * 
 * Routes kick event to the process on which the client is connected.
 */
import {
    type TAddress,
    type TClientId,
    type TProcessAddress,
    splitAddressOrThrow,
} from '@flux/shared/types';
import { RedisConnection } from '../../routing/redis/redis-connection.class';
import { readProcessAddress } from '../../routing/addressing.utils';

export class GlobalClientManager {
    private readonly processAddress: TProcessAddress = readProcessAddress();

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {}

    /**
     * Sends a global message to kick a client.
     * 
     * @param { TAddress } agentAddress
     * 
     * @returns { Promise<void> }
     */
    public async kickClient(
        type: 'agent' | 'authority',
        agentAddress: TAddress,
    ): Promise<void> {
        const [machineAddress, processId, clientId] = splitAddressOrThrow(agentAddress);
        const processAddress: TProcessAddress = `${machineAddress}/${processId}`;

        const receivers = await this._redisConnection
            .publishCustom(
                `kick-client-${type}`,
                processAddress,
                clientId,
            );

        if (receivers === 0) {
            // We failed to find the owner process, we have to do the cleanup here
            switch (type) {
                case 'agent': {
                    await this._redisConnection
                        .networkAgentRedisService
                        .unregisterAgentOrThrow(
                            clientId,
                        );
                    break;
                }
                case 'authority': {
                    await this._redisConnection
                        .networkAuthoritySet
                        .unregisterAuthority(
                            clientId,
                        );
                    break;
                }
                default: {
                    // oxlint-disable-next-line typescript/restrict-template-expressions
                    throw new Error(`Unknown client type: ${type}`);

                }
            }
        }
    }

    /**
     * On event on this process.
     */
    public onKickClient(
        type: 'agent' | 'authority',
        onKickCallback: (clientAddress: TClientId) => void,
    ): void {
        // Listen to remote
        void this._redisConnection
            .subscribeToCustom(
                `kick-client-${type}`,
                this.processAddress,
                (
                    clientId: string,
                ) => onKickCallback(clientId as TClientId),
            );
    }
}