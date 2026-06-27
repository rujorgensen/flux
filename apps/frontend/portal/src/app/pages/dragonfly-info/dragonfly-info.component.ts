import {
    ChangeDetectionStrategy,
    Component,
    signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FluxNetworkChannel } from '@persistica/flux-agent';
import { FluxStatusAgentService } from '$lib/app/_services/flux/flux-status.agent.service';

type TDragonflyStatus = {
    label: string;
    url: string;
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
    keyspace: unknown;
    latency: Array<{
        event: string;
        lastTimestamp: number;
        latencyMs: number;
        samples: number;
    }>;
    updatedAt: Date;
};

@Component({
    selector: 'app-dragonfly-info',
    imports: [
        // * Modules
        CommonModule,
        // * Pipes
        DecimalPipe,
    ],
    templateUrl: './dragonfly-info.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonflyInfoPageComponent {
    protected readonly statuses = signal<TDragonflyStatus[] | null>(null);
    protected readonly error = signal<string | null>(null);

    private portalRedisStatus: TDragonflyStatus | null = null;
    private meshRedisStatus: TDragonflyStatus | null = null;

    constructor(
        private readonly _fluxStatusAgentService: FluxStatusAgentService,
    ) {
        this._fluxStatusAgentService
            .connect()
            .then(async (connection) => {
                console.log('Connected to Flux network with agent ID:', connection);

                const portalRedisHealthChannel: FluxNetworkChannel = await connection
                    .joinChannel('protected-portal-redis-status');

                portalRedisHealthChannel
                    .onPublish((message) => {
                        this.portalRedisStatus = {
                            label: 'Portal DragonFly',
                            ...JSON.parse(message as string),
                        } as TDragonflyStatus;
                        this._publishStatuses();
                    });

                const meshRedisHealthAlertChannel: FluxNetworkChannel = await connection
                    .joinChannel('protected-mesh-redis-status');

                meshRedisHealthAlertChannel
                    .onPublish((message) => {
                        this.meshRedisStatus = {
                            label: 'Mesh DragonFly',
                            ...JSON.parse(message as string),
                        } as TDragonflyStatus;
                        this._publishStatuses();
                    });
            })
            .catch(error => {
                console.error('Failed to connect to Flux network:', error);
            })
            ;
    }

    /**
     * Push whichever statuses have arrived so far. In self-hosted setups only
     * one of the two channels may ever publish, so we must not wait for both.
     */
    private _publishStatuses(
    ): void {
        const statuses = [
            this.meshRedisStatus,
            this.portalRedisStatus,
        ].filter((status): status is TDragonflyStatus => status !== null);

        if (statuses.length > 0) {
            this.statuses.set(statuses);
        }
    }

    protected formatBytes(
        bytes: number | string | undefined,
    ): string {
        const n = Number(bytes);

        if (!bytes || Number.isNaN(n)) {
            return 'N/A';
        }

        const units = ['B', 'KB', 'MB', 'GB'];
        let value = n;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }

        return `${value.toFixed(1)} ${units[unitIndex]}`;
    }

}
