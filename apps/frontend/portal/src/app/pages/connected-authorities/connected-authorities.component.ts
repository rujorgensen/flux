import {
    ChangeDetectionStrategy,
    Component,
    signal,
    OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '$lib/app/_services/auth/user.service';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { ConnectedAuthoritiesTableComponent } from '../../components/tables/connected-authorities/connected-authorities-table.component';
import { NetworksService } from '../../_services/networks.service';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-connected-authorities',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
        ConnectedAuthoritiesTableComponent,
    ],
    templateUrl: './connected-authorities.component.html',
    styleUrls: ['./connected-authorities.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAuthoritiesPageComponent implements OnInit {
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly selectedNetwork$;

    constructor(
        private readonly _userService: UserService,
        private readonly networksService: NetworksService,
    ) {
        this.selectedNetwork$ = this.networksService.selectedNetwork$;
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
