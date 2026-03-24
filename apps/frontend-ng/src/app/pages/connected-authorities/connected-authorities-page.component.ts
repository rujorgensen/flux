import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { createAuthClient } from 'better-auth/client';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { ConnectedAuthoritiesTableComponent } from '../../components/tables/connected-authorities/connected-authorities-table.component';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-connected-authorities-page',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
        ConnectedAuthoritiesTableComponent,
    ],
    templateUrl: './connected-authorities-page.component.html',
    styleUrls: ['./connected-authorities-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class ConnectedAuthoritiesPageComponent implements OnInit {
    protected readonly networkId = signal<string>('rAnD0M-demo-network-id');
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
