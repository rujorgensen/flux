import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { UserService } from '$lib/app/_services/auth/user.service';
import { NetworksService, type INetwork } from '../../_services/networks.service';
import { UserNamePipe, type IUserInfo } from '../../_pipes/user-name.pipe';
import { FormsModule } from '@angular/forms';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

export interface IOrgMember {
    userId: string;
    primaryRole: string;
    networks: {
        networkId: string;
        alias: string;
        role: string;
    }[];
}

const ROLE_PRIORITY: Record<string, number> = { owner: 3, admin: 2, member: 1 };

function getRolePriority(
    role: string,
): number {
    return ROLE_PRIORITY[role] ?? 0;
}

// TODO: replace with real org name from backend once org entity is available
export const ORG_NAME = 'Acme Labs';

@Component({
    selector: 'app-team-settings',
    imports: [
        FormsModule,
        CommonModule,
        DashboardLayoutComponent,
        UserNamePipe,
    ],
    templateUrl: './team-settings.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamSettingsPageComponent implements OnInit {
    protected readonly ORG_NAME = ORG_NAME;
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly networks$: Observable<INetwork[]>;
    protected readonly orgMembers$: Observable<IOrgMember[]>;

    /**
     * Map of known userId → IUserInfo, seeded from the current session.
     * Grows as more user data becomes available (e.g., from a future users API).
     */
    protected readonly userInfoMap = signal<Record<string, IUserInfo>>({});

    protected readonly showInviteModal = signal<boolean>(false);
    protected readonly inviteEmail = signal<string>('');
    protected readonly addByEmailInput = signal<string>('');
    protected readonly memberToManage = signal<IOrgMember | null>(null);
    protected readonly networkToggleState = signal<Record<string, boolean>>({});

    constructor(
        private readonly networksService: NetworksService,
        private readonly _userService: UserService,
    ) {
        this.networks$ = this.networksService.networks$;
        this.orgMembers$ = this.networks$.pipe(
            map((networks) => {
                const memberMap = new Map<string, IOrgMember>();
                for (const network of networks) {
                    for (const user of network.users) {
                        if (!memberMap.has(user.userId)) {
                            memberMap.set(user.userId, {
                                userId: user.userId,
                                primaryRole: user.role,
                                networks: [],
                            });
                        }
                        const entry = memberMap.get(user.userId)!;
                        entry.networks.push({
                            networkId: network.id,
                            alias: network.alias,
                            role: user.role,
                        });
                        if (getRolePriority(user.role) > getRolePriority(entry.primaryRole)) {
                            entry.primaryRole = user.role;
                        }
                    }
                }
                return Array.from(memberMap.values());
            }),
        );
    }

    async ngOnInit(
    ) {
        const session = await this._userService.authClient.getSession();
        if (session.data) {
            const user = session.data.user as UserSession;
            this.userSession.set(user);
            if (user.id) {
                this.userInfoMap.set({
                    [user.id]: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                    },
                });
            }
        }
    }

    protected isOrgAdmin(
        members: IOrgMember[],
    ): boolean {
        const userId = this.userSession()?.id;
        if (!userId) return false;
        const me = members.find((m) => m.userId === userId);
        return me?.primaryRole === 'owner' || me?.primaryRole === 'admin';
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

    protected openNetworkModal(
        member: IOrgMember,
        allNetworks: INetwork[],
    ): void {
        this.memberToManage.set(member);
        const state: Record<string, boolean> = {};
        for (const network of allNetworks) {
            state[network.id] = member.networks.some((n) => n.networkId === network.id);
        }
        this.networkToggleState.set(state);
    }

    protected closeNetworkModal(
    ): void {
        this.memberToManage.set(null);
    }

    protected toggleNetwork(
        networkId: string,
    ): void {
        const current = this.networkToggleState();
        this.networkToggleState.set({ ...current, [networkId]: !current[networkId] });
    }
}
