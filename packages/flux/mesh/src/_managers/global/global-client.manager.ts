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
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { NetworkAuthorityRedisService } from '@flux/mesh/store/redis/network-authority';
import { NetworkChannelService } from '@flux/mesh/store/redis/network-channel';

export class GlobalClientManager {
    private readonly processAddress: TProcessAddress = readProcessAddress();

    private readonly networkAgentRedisService: NetworkAgentRedisService;
    private readonly networkAuthorityRedisService: NetworkAuthorityRedisService;
    private readonly networkChannelService: NetworkChannelService;

    constructor(
        private readonly _redisConnection: RedisConnection,
    ) {
        this.networkAgentRedisService = new NetworkAgentRedisService(this._redisConnection);
        this.networkAuthorityRedisService = new NetworkAuthorityRedisService(this._redisConnection);
        this.networkChannelService = new NetworkChannelService(this._redisConnection);
    }

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
                    const networkId = await this.networkAgentRedisService
                        .readAgentNetworkIdByClientIdOrThrow(clientId);

                    // The owning process is gone and will never drop this agent's channel
                    // memberships, so they would never fall to zero. Do it here.
                    await this.networkChannelService
                        .leaveAllNetworkChannels(
                            networkId,
                            agentAddress,
                            await this.networkChannelService
                                .readChannelNamesForClientId(
                                    networkId,
                                    clientId,
                                ),
                        );

                    await this.networkAgentRedisService
                        .unregisterAgentOrThrow(
                            clientId,
                            networkId,
                        );
                    break;
                }
                case 'authority': {
                    await this.networkAuthorityRedisService
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
        this._redisConnection
            .subscribeToCustom(
                `kick-client-${type}`,
                this.processAddress,
                (
                    clientId: string,
                ) => onKickCallback(clientId as TClientId),
            );
    }
}