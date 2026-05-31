import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Observable } from 'rxjs';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { NetworkTokensComponent } from '../../components/network-tokens/network-tokens.component';
import { UserService } from '$lib/app/_services/auth/user.service';
import { NetworksService } from '../../_services/networks.service';
import type {
    INetwork_S,
} from '@flux/shared/features/networks';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-general-settings',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
        NetworkTokensComponent,
    ],
    templateUrl: './general-settings.component.html',
    styleUrls: ['./general-settings.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettingsPageComponent implements OnInit {
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly selectedNetwork$: Observable<INetwork_S | null>;

    constructor(
        private readonly networksService: NetworksService,
        private readonly _userService: UserService,
    ) {
        this.selectedNetwork$ = this.networksService.selectedNetwork$;
    }

    async ngOnInit(

    ) {
        const session = await this._userService.authClient.getSession();
        if (session.data) {
            this.userSession.set(session.data.user as UserSession);
        }
    }
}
