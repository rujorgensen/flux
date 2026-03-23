import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { createAuthClient } from 'better-auth/client';
import type { TNetworkId_S } from '@flux/shared/types';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { StatsComponent } from '../../components/stats/stats.component';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import { ChartComponent } from '../../components/chart/chart.component';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-dashboard-home-page',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
        StatsComponent,
        DashboardComponent,
        ChartComponent,
    ],
    templateUrl: './dashboard-home-page.component.html',
    styleUrls: ['./dashboard-home-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class DashboardHomePageComponent implements OnInit {
    protected readonly networkId = signal<TNetworkId_S>('rAnD0M-demo-network-id' as TNetworkId_S);
    protected readonly networkCode = signal<string>('code-to-access-network');
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly activeNetworkName = signal<string>('Acme Inc');

    private authClient = createAuthClient({
        baseURL: typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : undefined,
    });

    static clientProviders = [provideHttpClient(withFetch())];

    async ngOnInit() {
        const session = await this.authClient.getSession();
        if (session.data) {
            this.userSession.set(session.data.user as UserSession);
        }
    }
}
