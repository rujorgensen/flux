import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Observable } from 'rxjs';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { UserService } from '$lib/app/_services/auth/user.service';
import { NetworksService, type INetwork } from '../../_services/networks.service';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-team-settings',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
    ],
    templateUrl: './team-settings.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamSettingsPageComponent implements OnInit {
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly selectedNetwork$: Observable<INetwork | null>;
    protected readonly showInviteModal = signal<boolean>(false);
    protected readonly inviteEmail = signal<string>('');

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

    protected isAdmin(
        network: INetwork,
    ): boolean {
        const userId = this.userSession()?.id;
        if (!userId) return false;
        const member = network.users.find((u) => u.userId === userId);
        return member?.role === 'owner' || member?.role === 'admin';
    }

    protected openInviteModal(
    ): void {
        this.inviteEmail.set('');
        this.showInviteModal.set(true);
    }

    protected closeInviteModal(
    ): void {
        this.showInviteModal.set(false);
    }

    protected onInviteEmailChange(
        value: string,
    ): void {
        this.inviteEmail.set(value);
    }

    protected getRoleBadgeClass(
        role: string,
    ): string {
        switch (role) {
            case 'owner': return 'badge badge-primary';
            case 'admin': return 'badge badge-secondary';
            default: return 'badge badge-ghost';
        }
    }
}
