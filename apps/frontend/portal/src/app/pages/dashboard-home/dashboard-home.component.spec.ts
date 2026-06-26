import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StatsComponent } from '../../components/stats/stats.component';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import { ChartComponent } from '../../components/chart/chart.component';
import { NetworkIdComponent } from '../../components/network-id/network-id.component';
import { FluxDomainComponent } from '../../components/flux-domain/flux-domain.component';
import { NetworksService } from '../../_services/networks.service';
import { DashboardHistoryService } from '../../_services/dashboard-history/dashboard-history.service';
import { buildChartConfig, DashboardHomePageComponent } from './dashboard-home.component';
import { NetworkStatsService } from '$lib/app/_services/sidebar-counts/sidebar-counts.service';

describe('buildChartConfig', () => {
    it('should plot the live count as the latest chart value', () => {
        const config = buildChartConfig(
            [
                { label: '08:00', value: 12 },
                { label: 'Now', value: 1_248 },
            ],
            60,
            'Agents',
            '#6366f1',
            'rgba(99, 102, 241, 0.08)',
        );

        expect(config.currentValue).toBe(60);
        expect(config.labels).toEqual(['08:00', 'Now']);
        expect(config.datasets[0].data).toEqual([12, 60]);
    });

    it('should render a current point when only live data exists', () => {
        const config = buildChartConfig(
            [],
            0,
            'Agents',
            '#6366f1',
            'rgba(99, 102, 241, 0.08)',
        );

        expect(config.currentValue).toBe(0);
        expect(config.labels).toEqual(['Now']);
        expect(config.datasets[0].data).toEqual([0]);
    });
});

@Component({
    selector: 'app-stats',
    template: '',
})
class StubStatsComponent {
    public readonly networkId = input<unknown>();
    public readonly networkCode = input<unknown>();
}

@Component({
    selector: 'app-dashboard',
    template: '<ng-content />',
})
class StubDashboardComponent {}

@Component({
    selector: 'app-chart',
    template: '',
})
class StubChartComponent {
    public readonly labels = input<string[]>([]);
    public readonly datasets = input<unknown[]>([]);
}

@Component({
    selector: 'app-network-id',
    template: '<div>network-id-stub</div>',
})
class StubNetworkIdComponent {
    public readonly networkId = input.required<string>();
}

@Component({
    selector: 'app-flux-domain',
    template: '<div>flux-domain-stub</div>',
})
class StubFluxDomainComponent {}

describe('DashboardHomePageComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardHomePageComponent],
            providers: [
                {
                    provide: NetworksService,
                    useValue: {
                        selectedNetwork$: of({ id: 'network-1' }),
                    },
                },
                {
                    provide: DashboardHistoryService,
                    useValue: {
                        agentHistory$: of([]),
                        authorityHistory$: of([]),
                        channelHistory$: of([]),
                    },
                },
                {
                    provide: NetworkStatsService,
                    useValue: {
                        agentCount$$: of({ count: 7 }),
                        authorityCount$$: of({ count: 5 }),
                        channelCount$$: of({ count: 3 }),
                        totalDataUsage$$: of({ count: 3 }),
                    },
                },
            ],
        })
            .overrideComponent(DashboardHomePageComponent, {
                remove: {
                    imports: [
                        StatsComponent,
                        DashboardComponent,
                        ChartComponent,
                        NetworkIdComponent,
                        FluxDomainComponent,
                    ],
                },
                add: {
                    imports: [
                        StubStatsComponent,
                        StubDashboardComponent,
                        StubChartComponent,
                        StubNetworkIdComponent,
                        StubFluxDomainComponent,
                    ],
                },
            })
            .compileComponents();
    });

    it('should show the server domain in the dashboard overview panel', async () => {
        const fixture = TestBed.createComponent(DashboardHomePageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const text: string = fixture.nativeElement.textContent;

        expect(text).toContain('Network ID');
        expect(text).toContain('Server');
        expect(text).toContain('flux-domain-stub');
    });

    it('should prefer live sidebar counts for the chart badges', async () => {
        const fixture = TestBed.createComponent(DashboardHomePageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const text: string = fixture.nativeElement.textContent;

        expect(text).toContain('7 now');
        expect(text).toContain('5 now');
        expect(text).toContain('3 now');
    });
});
