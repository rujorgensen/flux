import {
    ChangeDetectionStrategy,
    Component,
    signal,
    OnInit,
    OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { createAuthClient } from 'better-auth/client';
import { Subscription, filter } from 'rxjs';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { NetworksService } from '../../_services/networks.service';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-no-network',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
    ],
    templateUrl: './no-network.component.html',
    styleUrls: ['./no-network.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoNetworkPageComponent implements OnInit, OnDestroy {
    protected readonly userSession = signal<UserSession | null>(null);

    private authClient = createAuthClient({
        baseURL: typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : undefined,
    });

    private networkSubscription?: Subscription;

    constructor(
        private readonly networksService: NetworksService,
        private readonly router: Router,
    ) {}

    public async ngOnInit(

    ): Promise<void> {
        const session = await this.authClient.getSession();
        if (session.data) {
            this.userSession.set(session.data.user as UserSession);
        }

        // Redirect to dashboard as soon as a network becomes selected
        this.networkSubscription = this.networksService.selectedNetwork$.pipe(
            filter((network) => network !== null),
        ).subscribe(() => {
            this.router.navigate(['/']);
        });
    }

    public ngOnDestroy(

    ): void {
        this.networkSubscription?.unsubscribe();
    }
}
