import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserService } from '$lib/app/_services/auth/user.service';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { StatsComponent } from '../../components/stats/stats.component';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import { ChartComponent } from '../../components/chart/chart.component';
import { NetworkIdComponent } from '../../components/network-id/network-id.component';
import { FluxDomainComponent } from '../../components/flux-domain/flux-domain.component';
import { NetworksService } from '../../_services/networks.service';
import { DashboardHistoryService } from '../../_services/dashboard-history/dashboard-history.service';
import { DashboardHomePageComponent } from './dashboard-home.component';

@Component({
    selector: 'app-dashboard-layout',
    template: '<ng-content />',
})
class StubDashboardLayoutComponent {
    public readonly userSession = input<unknown>();
}

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
                    provide: UserService,
                    useValue: {
                        authClient: {
                            getSession: vi.fn().mockResolvedValue({ data: null }),
                        },
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
            ],
        })
            .overrideComponent(DashboardHomePageComponent, {
                remove: {
                    imports: [
                        DashboardLayoutComponent,
                        StatsComponent,
                        DashboardComponent,
                        ChartComponent,
                        NetworkIdComponent,
                        FluxDomainComponent,
                    ],
                },
                add: {
                    imports: [
                        StubDashboardLayoutComponent,
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
});
