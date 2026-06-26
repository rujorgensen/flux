import {
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
        RouterLink,
    ],
    templateUrl: './docs-changelog.component.html',
    styleUrls: ['./docs-changelog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsChangelogPageComponent {
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
}
