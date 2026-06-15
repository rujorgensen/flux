import {
    type TClientId,
    type TNetworkId_S,
    type TProcessAddress,
    type TMachineAddress,
    splitProcessAddress,
} from '@flux/shared/types';
import { RedisConnection } from '../../routing/redis/redis-connection.class';
import { NetworkChannelManager } from '../channels/channel-manager.class';
import { PicoLogger } from '@utils/pico-logger';
import { NetworkChannelService } from '@flux/mesh/store/redis/network-channel';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';

export class ProcessClass {

    private readonly networkChannelService: NetworkChannelService;
    private readonly networkAgentRedisService: NetworkAgentRedisService;

    constructor(
        private readonly _redisConnection: RedisConnection,
        private readonly _networkChannelManager: NetworkChannelManager,
    ) {
        this.networkChannelService = new NetworkChannelService(this._redisConnection);
        this.networkAgentRedisService = new NetworkAgentRedisService(this._redisConnection);
    }

    /**
     * 
     */
    public async cleanupOrphans(
        machineAddress: TMachineAddress,
    ): Promise<void> {
        const disconnectedProcesses = await this.readDisconnectedAddresses(machineAddress);

        for (const disconnectedProcess of disconnectedProcesses) {
            const disconnectedProcessClientIds = await this
                ._redisConnection
                .hash
                .smembers(`~/machines/processes/${disconnectedProcess}/clients`);

            for (const clientId of disconnectedProcessClientIds) {
                try {
                    await this.networkAgentRedisService
                        .unregisterAgentOrThrow(clientId as TClientId);

                    const networkId = await this._redisConnection
                        .hash
                        .hget(`~/clients`, clientId) as TNetworkId_S | null;

                    if (!networkId) {
                        continue;
                    }

                    // Leave all network channels
                    const channelNames = await this.networkChannelService
                        .readChannelNamesForClientId(
                            networkId,
                            clientId as TClientId,
                        );

                    const agent = await this.networkAgentRedisService
                        .readAgentByClientId(
                            networkId,
                            clientId as TClientId,
                        );

                    // This could be an authority, or just not be available anymore
                    if (!agent) {
                        continue;
                    }

                    await this._networkChannelManager
                        .leaveAllNetworkChannels(
                            networkId,
                            agent.address,
                            channelNames,
                        ).catch(() => {
                            PicoLogger.error(`Caught error while leaving network channels.`, 'ws-disconnect');
                        });

                } catch (err) {
                    console.error(`Error unregistering agent ${clientId} for process ${disconnectedProcess}:`, err);
                }
            }

            // Stop tracking
            await this._redisConnection
                .sortedSet
                .zrem(
                    '~machines/processes',
                    disconnectedProcess,
                );

            // Remove list of clients for the process
            await this
                ._redisConnection
                .hash
                .srem(`~/machines/processes/${disconnectedProcess}/clients`);
        }

        return Promise.resolve();
    }

    /**
     * Marks the given address as connected in Redis.
     */
    public async setConnected(
        processAddress: TProcessAddress,
    ): Promise<void> {
        await this._redisConnection
            .sortedSet
            .zadd(
                '~machines/processes',
                Date.now(),
                processAddress,
            );
    }

    /**
     * Marks the given address as disconnected in Redis.
     */
    public async setDisconnected(
        processAddress: TProcessAddress,
    ): Promise<void> {
        const [machineAddress] = splitProcessAddress(processAddress);
        await this.cleanupOrphans(machineAddress);
    }

    // ****************************************************************************
    // * Internal Helpers
    // ****************************************************************************

    /**
     * Returns up to 3 lost processes while prioritizing ones that have been running on this machine, and oldest. 
     */
    private async readDisconnectedAddresses(
        machineAddress: TMachineAddress,
    ): Promise<ReadonlyArray<TProcessAddress>> {
        // Get all members for the machine (lexicographical range)
        const now = Date.now();

        // Low to high score is returned
        const members = await this._redisConnection
            .sortedSet
            .zrangebyscore(
                '~machines/processes',
                0,
                now - 10_000,
                'LIMIT',
                0,
                20,
            );

        const processesOnThisMachine = members
            .filter((address) => address.startsWith(machineAddress));

        const maxThree = Array.from(new Set([...processesOnThisMachine, ...members])).slice(0, 3);

        return maxThree as ReadonlyArray<TProcessAddress>;
    }
}