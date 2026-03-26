import {
    ChangeDetectionStrategy,
    Component,
    signal,
    OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs';
import { UserService } from '$lib/app/_services/auth/user.service';
import type { TNetworkId_S } from '@flux/shared/types';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { StatsComponent } from '../../components/stats/stats.component';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import { ChartComponent } from '../../components/chart/chart.component';
import { NetworksService } from '../../data/networks.service';

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
    ],
    templateUrl: './dashboard-home.component.html',
    styleUrls: ['./dashboard-home.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomePageComponent implements OnInit {
    protected readonly networkCode = signal<string | null>(null);
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly networkId$;


    constructor(
        private readonly networksService: NetworksService,
        private readonly _userService: UserService,
    ) {
        this.networkId$ = this.networksService
            .selectedNetwork$
            .pipe(
                map((n) => (n?.id as TNetworkId_S) ?? null),
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
