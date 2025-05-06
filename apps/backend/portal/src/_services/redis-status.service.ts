import type {
    BunRedisClientType,
} from '@core/redis/bun';
import {
    parseInfoSection,
    parseKeyspaceSection,
} from './redis-status/parsers/parsers.fn';
import type {
    RedisClient
} from 'bun';

export class RedisStatusService {

    private readonly alertListeners: Set<(alerts: string[]) => void> = new Set();
    private readonly healthCheckIntervalMs: number = 10_000; // 10 seconds

    private lastAlerts: string[] = [];
    private interval: ReturnType<typeof setInterval> | undefined;

    constructor(
        private readonly _redisClient: BunRedisClientType,
    ) { }

    /**
     * Subscribe to 
     */
    public onAlert(
        cb: (alerts: string[]) => void,
    ): void {
        this.alertListeners.add(cb);
        this.observerChanged();
    }

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
        } else if (this.alertListeners.size > 0 && !this.interval) {
            this.interval = setInterval(async () => {
                const health = await this.getRedisStatus();
                const currentAlerts: string[] = this.getAlerts(health);

                if (currentAlerts.join() !== this.lastAlerts.join()) {
                    this.lastAlerts = currentAlerts;

                    for (const listener of this.alertListeners) {
                        listener(currentAlerts);
                    }
                }

            }, this.healthCheckIntervalMs);
        }
    }

    private getAlerts(
        health: Awaited<ReturnType<typeof this.getRedisStatus>>,
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

    public async getRedisStatus(
        threshold: number = 0.9,
    ) {
        // Make sure to get this every time, as it may have been re-instantiated
        const redisClient: RedisClient = this._redisClient.getClient();

        if (!redisClient.connected) {
            throw new Error('Redis client is not connected');
        }

        const [infoRaw, keyspaceRaw, latencyRaw] = await Promise.all([
            redisClient.send('INFO', []), // All sections in one
            redisClient.send('INFO', ['keyspace']), // Still separate parsing logic
            redisClient.send('LATENCY', ['LATEST']),
        ]);

        const info = parseInfoSection(infoRaw);

        const memory = {
            used_memory: info.used_memory,
            maxmemory: info.maxmemory,
        };

        const keyspace = parseKeyspaceSection(keyspaceRaw);

        const used = memory.used_memory as number;
        const max = memory.maxmemory as number;

        const latency = Array.isArray(latencyRaw)
            ? latencyRaw.map(([event, ts, latencyMs, samples]) => ({
                event,
                lastTimestamp: ts,
                latencyMs,
                samples,
            }))
            : [];

        return {
            memory: {
                used,
                max,
                usageRatio: max > 0 ? used / max : null,
                overThreshold: max > 0 ? used / max > threshold : false,
            },
            cpu: {
                sys: info.used_cpu_sys,
                user: info.used_cpu_user,
                sysChildren: info.used_cpu_sys_children,
                userChildren: info.used_cpu_user_children,
            },
            stats: {
                evictedKeys: info.evicted_keys,
                expiredKeys: info.expired_keys,
                keyspaceHits: info.keyspace_hits,
                keyspaceMisses: info.keyspace_misses,
                rejectedConnections: info.rejected_connections,
            },
            clients: {
                connected: info.connected_clients,
                blocked: info.blocked_clients,
            },
            keyspace,
            latency,
        };
    }

    private computeHealthScore(
        metrics: ReturnType<typeof parseInfoSection>,
        threshold: number = 0.9,
    ): number {
        const used: number = metrics.used_memory as number;
        const max: number = metrics.maxmemory as number;
        const evicted: number = metrics.evicted_keys as number;
        const rejected: number = metrics.rejected_connections as number;

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