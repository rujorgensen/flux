import {
    ChangeDetectionStrategy,
    Component,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, map } from 'rxjs';
import type { TNetworkId_S } from '@flux/shared/types';
import { StatsComponent } from '../../components/stats/stats.component';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import {
    type IChartDataset,
    ChartComponent,
} from '../../components/chart/chart.component';
import { NetworksService } from '../../_services/networks.service';
import {
    DashboardHistoryService,
    type IHistoryDataPoint,
} from '../../_services/dashboard-history/dashboard-history.service';
import { NetworkIdComponent } from '../../components/network-id/network-id.component';
import { FluxDomainComponent, resolveFluxDomain } from '../../components/flux-domain/flux-domain.component';
import { NetworkStatsService } from '../../_services/sidebar-counts/sidebar-counts.service';

interface IChartConfig {
    labels: string[];
    datasets: IChartDataset[];
    currentValue: number;
}

export const buildChartConfig = (
    history: IHistoryDataPoint[],
    liveCount: number | null,
    label: string,
    borderColor: string,
    backgroundColor: string,
): IChartConfig => {
    const currentValue: number = liveCount ?? (history.length > 0 ? history[history.length - 1].value : 0);
    const chartPoints: IHistoryDataPoint[] = history.length > 0
        ? history.map((point, index) => ({
            ...point,
            value: index === history.length - 1
                ? currentValue
                : point.value,
        }))
        : liveCount === null
            ? []
            : [{
                label: 'Now',
                value: currentValue,
            }];

    return {
        labels: chartPoints.map((point) => point.label),
        datasets: [{
            label,
            data: chartPoints.map((point) => point.value),
            borderColor,
            backgroundColor,
        }] as IChartDataset[],
        currentValue,
    };
};

@Component({
    selector: 'app-dashboard-home',
    imports: [
        CommonModule,
        StatsComponent,
        DashboardComponent,
        ChartComponent,
        NetworkIdComponent,
        FluxDomainComponent,
    ],
    templateUrl: './dashboard-home.component.html',
    styleUrls: ['./dashboard-home.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomePageComponent {
    private readonly resolvedDomain = resolveFluxDomain(
        typeof window !== 'undefined'
            ? window.location
            : undefined,
    );

    protected readonly networkCode = signal<string | null>(null);
    protected readonly networkId$;
    protected readonly shouldShowDomain = this.resolvedDomain.isVisible;

    protected readonly agentChartConfig$;
    protected readonly authorityChartConfig$;
    protected readonly channelChartConfig$;

    constructor(
        private readonly networksService: NetworksService,
        private readonly dashboardHistoryService: DashboardHistoryService,
        private readonly sidebarCountsService: NetworkStatsService,
    ) {
        this.networkId$ = this.networksService
            .selectedNetwork$
            .pipe(
                map((n) => (n?.id as (TNetworkId_S | null)) ?? null),
            );

        this.agentChartConfig$ = combineLatest([
            this.dashboardHistoryService.agentHistory$,
            this.sidebarCountsService.agentCount$$,
        ]).pipe(
            map(([history, liveCount]) => buildChartConfig(
                history,
                liveCount.count,
                'Agents',
                '#6366f1',
                'rgba(99, 102, 241, 0.08)',
            )),
        );

        this.authorityChartConfig$ = combineLatest([
            this.dashboardHistoryService.authorityHistory$,
            this.sidebarCountsService.authorityCount$$,
        ]).pipe(
            map(([history, liveCount]) => buildChartConfig(
                history,
                liveCount.count,
                'Authorities',
                '#10b981',
                'rgba(16, 185, 129, 0.08)',
            )),
        );

        this.channelChartConfig$ = combineLatest([
            this.dashboardHistoryService.channelHistory$,
            this.sidebarCountsService.channelCount$$,
        ]).pipe(
            map(([history, liveCount]) => buildChartConfig(
                history,
                liveCount.count,
                'Channels',
                '#f59e0b',
                'rgba(245, 158, 11, 0.08)',
            )),
        );
    }
}
