import {
    ChangeDetectionStrategy,
    Component,
    signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FluxNetworkChannel } from '@persistica/flux-agent';
import { FluxStatusAgentService } from '$lib/app/_services/flux/flux-status.agent.service';

type TDragonflyStatus = {
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

    protected readonly instanceLabels = ['Mesh DragonFly', 'Portal DragonFly'];

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
                        this.portalRedisStatus = JSON.parse(message as string) as TDragonflyStatus;

                        if (this.meshRedisStatus) {
                            this.statuses.set([
                                this.meshRedisStatus,
                                this.portalRedisStatus,
                            ]);
                        }
                    });

                const meshRedisHealthAlertChannel: FluxNetworkChannel = await connection
                    .joinChannel('protected-mesh-redis-status');

                meshRedisHealthAlertChannel
                    .onPublish((message) => {
                        this.meshRedisStatus = JSON.parse(message as string) as TDragonflyStatus;

                        if (this.portalRedisStatus) {
                            this.statuses.set([
                                this.meshRedisStatus,
                                this.portalRedisStatus,
                            ]);
                        }
                    });
            })
            .catch(error => {
                console.error('Failed to connect to Flux network:', error);
            })
            ;
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
