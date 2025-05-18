import type {
    TChannelTopic,
    TNetworkId_S,
} from '@flux/shared/types';
import {
    type StatsRedisConnection,
    getStatsRedisConnection,
} from './connections/stats-redis-connection';
import {
    type StatsPrismaConnection,
    getStatsPrismaConnection,
} from './connections/stats.prisma';
import {
    StatsDataPersister,
} from './data-persister';

export interface TNetworkStats {
    channels: number;
    connectedAuthorities: number;
    connectedAgents: number;
    dataUsage: number;
}

export class StatsDataService {
    private readonly _statsRedisConnection: StatsRedisConnection = getStatsRedisConnection();
    private readonly _statsPrismaConnection: StatsPrismaConnection = getStatsPrismaConnection();

    constructor(
    ) {
        const _statsDataPersister: StatsDataPersister = new StatsDataPersister(
            this._statsRedisConnection,
            this._statsPrismaConnection,
        );
    }

    // ****************************************************************************
    // *** Set stats cache
    // ****************************************************************************
    public channelAdded = this._statsRedisConnection.channelAdded.bind(this._statsRedisConnection);
    public channelDeleted = this._statsRedisConnection.channelDeleted.bind(this._statsRedisConnection);
    public authorityConnected = this._statsRedisConnection.authorityConnected.bind(this._statsRedisConnection);
    public authorityDisconnected = this._statsRedisConnection.authorityDisconnected.bind(this._statsRedisConnection);
    public agentConnected = this._statsRedisConnection.agentConnected.bind(this._statsRedisConnection);
    public agentDisconnected = this._statsRedisConnection.agentDisconnected.bind(this._statsRedisConnection);
    public registerDataUsage = this._statsRedisConnection.dataUsage.bind(this._statsRedisConnection);

    // ****************************************************************************
    // *** Get stats cache
    // ****************************************************************************
    public getChannels(
        networkId: TNetworkId_S,
    ): void {
        return getWithCache(
            () => this._statsRedisConnection.getChannels(),
            () => this._statsPrismaConnection.getChannels(),
            (data) => this._statsRedisConnection.setChannels(data),
        );
    }

    public getConnectedAuthorities(
        networkId: TNetworkId_S,
    ): void {
        return getWithCache(
            () => this._statsRedisConnection.getConnectedAuthorities(),
            () => this._statsPrismaConnection.getConnectedAuthorities(),
            (data) => this._statsRedisConnection.setConnectedAuthorities(data),
        );
    }

    public getConnectedAgents(
        networkId: TNetworkId_S,
    ): void {
        return getWithCache(
            () => this._statsRedisConnection.getConnectedAgents(),
            () => this._statsPrismaConnection.getConnectedAgents(),
            (data) => this._statsRedisConnection.setConnectedAgents(data),
        );
    }

    public getDataUsage(

    ): void {
        return getWithCache(
            () => this._statsRedisConnection.getDataUsage(),
            () => this._statsPrismaConnection.getDataUsage(),
            (data) => this._statsRedisConnection.setDataUsage(data),
        );
    }

    // ****************************************************************************
    // *** Subscribe to changes
    // ****************************************************************************
    public onNetworkStatsChanged(
        networkId: TNetworkId_S,
        fn: (
            networkStats: TNetworkStats,
        ) => void,
    ): void {

    }
}

export const getWithCache = async <T>(
    getFromCache: () => Promise<T | null | undefined>,
    getFromStore: () => Promise<T>,
    updateCache: (data: T) => Promise<void>
): Promise<T> => {
    const cached = await getFromCache()
    if (cached !== null && cached !== undefined) return cached;

    const fresh = await getFromStore()

    if (fresh !== null && fresh !== undefined) {
        await updateCache(fresh)
    }
    return fresh
}