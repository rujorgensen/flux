import {
    ChangeDetectionStrategy,
    Component,
    signal,
    OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '$lib/app/_services/auth/user.service';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { ActiveChannelsTableComponent } from '../../components/tables/active-channels/active-channels-table.component';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-active-channels',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
        ActiveChannelsTableComponent,
    ],
    templateUrl: './active-channels.component.html',
    styleUrls: ['./active-channels.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveChannelsPageComponent implements OnInit {
    protected readonly networkId = signal<string>('rAnD0M-demo-network-id');
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly activeNetworkName = signal<string>('Acme Inc');

    constructor(
        private readonly _userService: UserService,
    ) { }

    async ngOnInit() {
        const session = await this._userService
            .authClient
            .getSession();

        if (session.data) {
            this.userSession.set(session.data.user as UserSession);
        }
    }
}
