import type {
    StatsRedisConnection,
} from './connections/stats-redis-connection';
import type { StatsPrismaConnection } from './connections/stats.prisma';

export class StatsDataPersister {

    constructor(
        private readonly _statsRedisConnection: StatsRedisConnection,
        private readonly _statsPrismaConnection: StatsPrismaConnection,
    ) {
        setInterval(() => {

        }, 5_000);
    }
}