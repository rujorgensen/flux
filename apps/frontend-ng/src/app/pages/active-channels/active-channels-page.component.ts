import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { createAuthClient } from 'better-auth/client';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { ActiveChannelsTableComponent } from '../../components/tables/active-channels/active-channels-table.component';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-active-channels-page',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
        ActiveChannelsTableComponent,
    ],
    templateUrl: './active-channels-page.component.html',
    styleUrls: ['./active-channels-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class ActiveChannelsPageComponent implements OnInit {
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
