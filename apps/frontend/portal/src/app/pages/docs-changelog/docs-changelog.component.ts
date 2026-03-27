import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { UserService } from '$lib/app/_services/auth/user.service';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

interface ChangelogEntry {
    version: string;
    date: string;
    tag: 'major' | 'minor' | 'patch' | 'pre-release';
    highlights: string[];
    added?: string[];
    changed?: string[];
    fixed?: string[];
}

@Component({
    selector: 'app-docs-changelog',
    imports: [
        CommonModule,
        RouterModule,
        DashboardLayoutComponent,
    ],
    templateUrl: './docs-changelog.component.html',
    styleUrls: ['./docs-changelog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsChangelogPageComponent implements OnInit, AfterViewInit {
    protected readonly userSession = signal<UserSession | null>(null);

    protected readonly entries: ChangelogEntry[] = [
        {
            version: '0.1.0',
            date: '2025',
            tag: 'pre-release',
            highlights: [
                'Initial public release of the Flux platform.',
            ],
            added: [
                'FluxMeshServer — the real-time mesh routing server.',
                'FluxAgent — client package for connecting to a mesh network.',
                'FluxAuthority — authentication and channel-authorization layer.',
                'Flux Portal — web dashboard for managing networks, authorities, agents, and channels.',
                'Network tokens for secure agent authentication.',
                'Real-time connected-agents and connected-authorities dashboards.',
                'Active channels overview in the Portal.',
                'Multi-network support: create and switch between up to 3 networks per account.',
                'Google OAuth sign-in via better-auth.',
                'Privacy Policy and Terms of Service pages.',
            ],
        },
    ];

    constructor(
        private readonly _userService: UserService,
    ) {}

    async ngOnInit(

    ): Promise<void> {
        const session = await this._userService.authClient.getSession();
        if (session.data) {
            this.userSession.set(session.data.user as UserSession);
        }
    }

    ngAfterViewInit(

    ): void {
        if (typeof window !== 'undefined' && (window as any).hljs) {
            (window as any).hljs.highlightAll();
        }
    }
}
