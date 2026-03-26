import type {
    BunRedisClient,
} from '@core/redis/bun';
import {
    parseInfoSection,
    parseKeyspaceSection,
} from './redis-status/parsers/parsers.fn';
import type {
    RedisClient
} from 'bun';

type TRedisStatus = {
    memory: {
        used: number;
        max: number;
        usageRatio: number | null;
        overThreshold: boolean;
    };
    cpu: {
        sys: string | number | undefined;
        user: string | number | undefined;
        sysChildren: string | number | undefined;
        userChildren: string | number | undefined;
    };
    stats: {
        evictedKeys: string | number | undefined;
        expiredKeys: string | number | undefined;
        keyspaceHits: string | number | undefined;
        keyspaceMisses: string | number | undefined;
        rejectedConnections: string | number | undefined;
    };
    clients: {
        connected: string | number | undefined;
        blocked: string | number | undefined;
    };
    keyspace: any;
    latency: Array<{
        event: string;
        lastTimestamp: number;
        latencyMs: number;
        samples: number;
    }>;
    updatedAt: Date;
};

export class RedisStatusService {

    private readonly alertListeners: Set<(alerts: string[]) => void> = new Set();
    private readonly healthCheckIntervalMs: number = 10_000; // 10 seconds

    private lastAlerts: string[] = [];
    private interval: ReturnType<typeof setInterval> | undefined;

    constructor(
        private readonly _redisClient: BunRedisClient,
    ) { }

    /**
     * Subscribe to alerts.
     */
    public onAlert(
        cb: (alerts: string[]) => void,
    ): void {
        this.alertListeners.add(cb);
        this.observerChanged();
    }

    /**
     * Unsubscribe from alerts.
     */
    public offAlert(
        cb: (alerts: string[]) => void,
    ): void {
        this.alertListeners.delete(cb);
        this.observerChanged();
    }

    private observerChanged(

    ): void {
        if ((this.alertListeners.size === 0) && this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        } else if ((this.alertListeners.size > 0) && !this.interval) {
            this.interval = setInterval(async () => {
                try {
                    const health = await this.getRedisStatusOrThrow();
                    const currentAlerts: string[] = this.getAlerts(health);

                    if (currentAlerts.join() !== this.lastAlerts.join()) {
                        this.lastAlerts = currentAlerts;

                        for (const listener of this.alertListeners) {
                            listener(currentAlerts);
                        }
                    }
                } catch {
                    console.error('Caught error while reading health status.');
                }
            }, this.healthCheckIntervalMs);
        }
    }

    /**
     * Returns the alerts for the given health status.
     */
    private getAlerts(
        health: Awaited<ReturnType<typeof this.getRedisStatusOrThrow>>,
    ): string[] {
        const alerts: string[] = [];

        if (health.memory.overThreshold) {
            alerts.push(`High memory usage: ${((health.memory.usageRatio ?? -1) * 100).toFixed(1)}%`);
        }

        if ((health.stats.evictedKeys as number) > 0) {
            alerts.push(`Evictions occurred: ${health.stats.evictedKeys}`);
        }

        if ((health.stats.rejectedConnections as number) > 0) {
            alerts.push(`Rejected connections: ${health.stats.rejectedConnections}`);
        }

        for (const event of health.latency) {
            if (event.latencyMs > 100) {
                alerts.push(`Latency spike on '${event.event}': ${event.latencyMs}ms`);
            }
        }

        return alerts;
    }

    /**
     *
     */
    public async getRedisStatusOrThrow(
        threshold: number = 0.9,
    ): Promise<TRedisStatus> {
        // Make sure to get this every time, as it may have been re-instantiated
        const redisClient: RedisClient = this._redisClient.getClient();

        if (!redisClient.connected) {
            throw new Error('Redis client is not connected');
        }

        const [infoRaw, latencyRaw] = await Promise.all([
            redisClient.send('INFO', []), // All sections in one
            redisClient.send('LATENCY', ['LATEST']),
        ]);

        // * Parse the raw data
        const info = parseInfoSection(infoRaw);
        const keyspace = parseKeyspaceSection(infoRaw);

        const latency = Array.isArray(latencyRaw)
            ? latencyRaw.map(([event, ts, latencyMs, samples]) => ({
                event,
                lastTimestamp: ts,
                latencyMs,
                samples,
            }))
            : [];

        const used = info['used_memory'] as number;
        const max = info['maxmemory'] as number;

        return {
            memory: {
                used,
                max,
                usageRatio: max > 0 ? (used / max) : null,
                overThreshold: max > 0 ? (used / max) > threshold : false,
            },
            cpu: {
                sys: info['used_cpu_sys'],
                user: info['used_cpu_user'],
                sysChildren: info['used_cpu_sys_children'],
                userChildren: info['used_cpu_user_children'],
            },
            stats: {
                evictedKeys: info['evicted_keys'],
                expiredKeys: info['expired_keys'],
                keyspaceHits: info['keyspace_hits'],
                keyspaceMisses: info['keyspace_misses'],
                rejectedConnections: info['rejected_connections'],
            },
            clients: {
                connected: info['connected_clients'],
                blocked: info['blocked_clients'],
            },
            keyspace,
            latency,
            updatedAt: new Date(),
        };
    }

    /**
     * Computes a health score based on Redis metrics.
     */
    private computeHealthScore(
        metrics: ReturnType<typeof parseInfoSection>,
        threshold: number = 0.9,
    ): number {
        const used: number = metrics['used_memory'] as number;
        const max: number = metrics['maxmemory'] as number;
        const evicted: number = metrics['evicted_keys'] as number;
        const rejected: number = metrics['rejected_connections'] as number;

        let score: number = 100;

        if (max > 0) {
            const memRatio = used / max;
            if (memRatio > threshold) score -= 20;
            if (memRatio > 0.95) score -= 20;
        }

        if (evicted > 0) score -= 10;
        if (rejected > 0) score -= 10;

        return Math.max(0, Math.min(100, score));
    }
}