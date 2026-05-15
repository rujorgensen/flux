import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs';
import { UserService } from '$lib/app/_services/auth/user.service';
import type { TNetworkId_S } from '@flux/shared/types';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { StatsComponent } from '../../components/stats/stats.component';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import { ChartComponent } from '../../components/chart/chart.component';
import type { IChartDataset } from '../../components/chart/chart.component';
import { NetworksService } from '../../_services/networks.service';
import { DashboardHistoryService } from '../../_services/dashboard-history/dashboard-history.service';
import { NetworkIdComponent } from '../../components/network-id/network-id.component';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-dashboard-home',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
        StatsComponent,
        DashboardComponent,
        ChartComponent,
        NetworkIdComponent,
    ],
    templateUrl: './dashboard-home.component.html',
    styleUrls: ['./dashboard-home.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomePageComponent implements OnInit {
    protected readonly networkCode = signal<string | null>(null);
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly networkId$;

    protected readonly agentChartConfig$;
    protected readonly authorityChartConfig$;
    protected readonly channelChartConfig$;

    constructor(
        private readonly networksService: NetworksService,
        private readonly _userService: UserService,
        private readonly dashboardHistoryService: DashboardHistoryService,
    ) {
        this.networkId$ = this.networksService
            .selectedNetwork$
            .pipe(
                map((n) => (n?.id as TNetworkId_S) ?? null),
            );

        this.agentChartConfig$ = this.dashboardHistoryService.agentHistory$.pipe(
            map((history) => ({
                labels: history.map((p) => p.label),
                datasets: [{
                    label: 'Agents',
                    data: history.map((p) => p.value),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                }] as IChartDataset[],
                currentValue: history.length > 0 ? history[history.length - 1].value : 0,
            })),
        );

        this.authorityChartConfig$ = this.dashboardHistoryService.authorityHistory$.pipe(
            map((history) => ({
                labels: history.map((p) => p.label),
                datasets: [{
                    label: 'Authorities',
                    data: history.map((p) => p.value),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                }] as IChartDataset[],
                currentValue: history.length > 0 ? history[history.length - 1].value : 0,
            })),
        );

        this.channelChartConfig$ = this.dashboardHistoryService.channelHistory$.pipe(
            map((history) => ({
                labels: history.map((p) => p.label),
                datasets: [{
                    label: 'Channels',
                    data: history.map((p) => p.value),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                }] as IChartDataset[],
                currentValue: history.length > 0 ? history[history.length - 1].value : 0,
            })),
        );
    }

    async ngOnInit() {
        const session = await this._userService
            .authClient
            .getSession();

        if (session.data) {
            this.userSession.set(session.data.user as UserSession);
        }
    }
}
