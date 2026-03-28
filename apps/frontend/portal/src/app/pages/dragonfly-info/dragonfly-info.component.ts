import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '$lib/app/_services/auth/user.service';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { api } from '../../_services/api/api';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

type TDragonflyStatus = {
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
        CommonModule,
        DashboardLayoutComponent,
    ],
    templateUrl: './dragonfly-info.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonflyInfoPageComponent implements OnInit {
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly statuses = signal<TDragonflyStatus[] | null>(null);
    protected readonly isLoading = signal<boolean>(true);
    protected readonly error = signal<string | null>(null);

    protected readonly instanceLabels = ['Mesh DragonFly', 'Portal DragonFly'];

    constructor(
        private readonly _userService: UserService,
    ) { }

    async ngOnInit(): Promise<void> {
        const session = await this._userService.authClient.getSession();

        if (session.data) {
            this.userSession.set(session.data.user as UserSession);
        }

        await this.fetchStatus();
    }

    private async fetchStatus(): Promise<void> {
        this.isLoading.set(true);
        this.error.set(null);

        const { data, error } = await api.api.status.get();

        if (error) {
            this.error.set('Failed to load DragonFly status. Please try again.');
        } else {
            this.statuses.set(data as TDragonflyStatus[]);
        }

        this.isLoading.set(false);
    }

    protected async refresh(): Promise<void> {
        await this.fetchStatus();
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

    protected formatPercent(
        ratio: number | null | undefined,
    ): string {
        if (ratio === null || ratio === undefined) {
            return 'N/A';
        }

        return `${(ratio * 100).toFixed(1)}%`;
    }
}
