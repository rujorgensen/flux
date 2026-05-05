import type { PrismaClient } from '@prisma-types/flux';
import type { NetworkRepository } from '../repository/network.repository';
import type { NetworkService } from './network.service';

/** Number of days of history to retain across all connection-history tables. */
const HISTORY_RETENTION_DAYS = 30;

/**
 * Periodically snapshots the current number of connected agents, authorities
 * and active channels for every known network and persists the data to the
 * PostgreSQL history tables so the portal dashboard graphs have historical
 * data to display.
 *
 * Records older than {@link HISTORY_RETENTION_DAYS} days are pruned on each
 * snapshot run to prevent unbounded database growth.
 */
export class ConnectionHistorySnapshotService {

    constructor(
        private readonly _networkRepository: NetworkRepository,
        private readonly _networkService: NetworkService,
        private readonly _prismaClient: PrismaClient,
    ) {}

    /**
     * Reads the current connection status for every network from Redis and
     * writes a snapshot row to each of the three history tables.
     *
     * The timestamp is snapped to the top of the current UTC hour so that
     * consecutive records are aligned on clean hour boundaries.
     *
     * After writing, prunes records older than {@link HISTORY_RETENTION_DAYS}
     * days from all three history tables.
     */
    public async takeSnapshot(
    ): Promise<void> {
        const networkIds = await this._networkRepository.readAllNetworkIds();

        if (networkIds.length === 0) {
            return;
        }

        const now = new Date();
        const timeslotAt = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            /* minutes */ 0,
            /* seconds */ 0,
            /* ms      */ 0,
        ));

        await Promise.all(
            networkIds.map(async (networkId) => {
                try {
                    const status = await this._networkService.readConnectionStatus(networkId);

                    await Promise.all([
                        this._prismaClient.connectedAgentsHistory.create({
                            data: {
                                networkId,
                                count: status.agents,
                                timeslotAt,
                            },
                        }),
                        this._prismaClient.connectedAuthoritiesHistory.create({
                            data: {
                                networkId,
                                count: status.authorities,
                                timeslotAt,
                            },
                        }),
                        this._prismaClient.channelsHistory.create({
                            data: {
                                networkId,
                                count: status.channels,
                                timeslotAt,
                            },
                        }),
                    ]);
                } catch (error) {
                    console.error(`❌ Failed to snapshot connection history for network '${networkId}':`, error);
                }
            }),
        );

        console.log(`📊 Connection history snapshot taken at ${timeslotAt.toISOString()} for ${networkIds.length} network(s)`);

        await this._pruneOldSnapshots();
    }

    /**
     * Deletes all history records older than {@link HISTORY_RETENTION_DAYS}
     * days from the three connection-history tables.
     */
    private async _pruneOldSnapshots(
    ): Promise<void> {
        const cutoff = new Date();
        cutoff.setUTCDate(cutoff.getUTCDate() - HISTORY_RETENTION_DAYS);

        const [agents, authorities, channels] = await Promise.all([
            this._prismaClient.connectedAgentsHistory.deleteMany({
                where: { timeslotAt: { lt: cutoff } },
            }),
            this._prismaClient.connectedAuthoritiesHistory.deleteMany({
                where: { timeslotAt: { lt: cutoff } },
            }),
            this._prismaClient.channelsHistory.deleteMany({
                where: { timeslotAt: { lt: cutoff } },
            }),
        ]);

        const totalDeleted = agents.count + authorities.count + channels.count;

        if (totalDeleted > 0) {
            console.log(`🧹 Pruned ${totalDeleted} history record(s) older than ${HISTORY_RETENTION_DAYS} days`);
        }
    }
}
