import {
    type TClientId,
    type TProcessAddress,
    type TMachineAddress,
    splitProcessAddress,
} from '@flux/shared/types';
import { RedisConnection } from '../../routing/redis/redis-connection.class';
import { NetworkAgentService } from '../../register/network-agent.service';
import { NetworkAuthorityCache } from '../../register/network-authority-cache.class';

export class ProcessClass {

    constructor(
        private readonly _redisConnection: RedisConnection,
        private readonly _networkAgentService: NetworkAgentService,
        private readonly _networkAuthorityCache: NetworkAuthorityCache,
    ) {}

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
                    await this._networkAgentService
                        .unregister(
                            clientId as TClientId,
                        );

                } catch (err) {
                    console.error(`Error unregistering agent ${clientId} for process ${disconnectedProcess}:`, err);
                }
            }

            // Authorities are tracked separately from agents on the owning process. Reap them 
            // here so a crashed node's authorities don't linger.
            const disconnectedProcessAuthorityIds = await this
                ._redisConnection
                .hash
                .smembers(`~/machines/processes/${disconnectedProcess}/authorities`);

            for (const clientId of disconnectedProcessAuthorityIds) {
                try {
                    await this._networkAuthorityCache
                        .unregister(
                            clientId as TClientId,
                        );

                } catch (err) {
                    console.error(`Error unregistering authority ${clientId} for process ${disconnectedProcess}:`, err);
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

            // Remove list of authorities for the process
            await this
                ._redisConnection
                .hash
                .srem(`~/machines/processes/${disconnectedProcess}/authorities`);
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