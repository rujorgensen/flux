import {
    parseInfoSection,
    parseKeyspaceSection,
} from "./redis-status/parsers/parsers.fn";
import type {
    RedisClient
} from 'bun';

export class RedisStatusService {

    private readonly alertListeners: Set<(alerts: string[]) => void> = new Set();
    private readonly healthCheckIntervalMs: number = 10_000; // 10 seconds

    private lastAlerts: string[] = [];
    private interval: NodeJS.Timer | undefined;

    constructor(
        private readonly _redisClient: RedisClient,
    ) { }

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

        const [infoRaw, keyspaceRaw, latencyRaw] = await Promise.all([
            this._redisClient.send('INFO', []), // All sections in one
            this._redisClient.send('INFO', ['keyspace']), // Still separate parsing logic
            this._redisClient.send('LATENCY', ['LATEST']),
        ]);

        const info = parseInfoSection(infoRaw);

        const memory = {
            used_memory: info.used_memory,
            maxmemory: info.maxmemory,
        };

        const cpu = {
            used_cpu_sys: info.used_cpu_sys,
            used_cpu_user: info.used_cpu_user,
            used_cpu_sys_children: info.used_cpu_sys_children,
            used_cpu_user_children: info.used_cpu_user_children,
        };

        const stats = {
            evicted_keys: info.evicted_keys,
            expired_keys: info.expired_keys,
            keyspace_hits: info.keyspace_hits,
            keyspace_misses: info.keyspace_misses,
            rejected_connections: info.rejected_connections,
        };

        const clients = {
            connected_clients: info.connected_clients,
            blocked_clients: info.blocked_clients,
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
                sys: cpu.used_cpu_sys,
                user: cpu.used_cpu_user,
                sysChildren: cpu.used_cpu_sys_children,
                userChildren: cpu.used_cpu_user_children,
            },
            stats: {
                evictedKeys: stats.evicted_keys,
                expiredKeys: stats.expired_keys,
                keyspaceHits: stats.keyspace_hits,
                keyspaceMisses: stats.keyspace_misses,
                rejectedConnections: stats.rejected_connections,
            },
            clients: {
                connected: clients.connected_clients,
                blocked: clients.blocked_clients,
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