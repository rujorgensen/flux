import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    Injector,
    input,
    signal,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    NavigationEnd,
    Router,
    RouterLink,
    RouterLinkActive,
} from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, filter, map, startWith } from 'rxjs';
import { NetworksService, MAX_NETWORKS } from '../../_services/networks.service';
import { SidebarCountsService } from '../../_services/sidebar-counts/sidebar-counts.service';
import { NetworkSelectorComponent } from '../network-selector/network-selector.component';
import { version } from '../../../../package.json';
import { toast } from 'ngx-sonner';
import type {
    INetwork_S,
} from '@flux/shared/features/networks';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
    isFluxAdmin?: boolean;
}

@Component({
    selector: 'app-dashboard-layout',
    templateUrl: './dashboard-layout.component.html',
    styleUrl: './dashboard-layout.component.scss',
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        RouterLinkActive,
        NetworkSelectorComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutComponent {
    userSession = input<UserSession | null>();
    pageTitle = input<string>('Dashboard');

    protected readonly isFluxAdmin = computed(() => this.userSession()?.isFluxAdmin ?? false);

    @ViewChild('networkAliasInput') networkAliasInput?: ElementRef<HTMLInputElement>;

    protected readonly MAX_NETWORKS = MAX_NETWORKS;
    protected readonly appVersion = version;

    // Modal state
    protected readonly showCreateModal = signal<boolean>(false);
    protected readonly newNetworkAlias = signal<string>('');
    protected readonly pendingDeleteNetwork = signal<INetwork_S | null>(null);
    protected readonly deleteConfirmText = signal<string>('');

    protected readonly selectedNetwork$;

    protected readonly agentCount$;
    protected readonly authorityCount$;
    protected readonly channelCount$;

    protected readonly isDashboardItemsOpen: ReturnType<typeof computed<boolean>>;
    protected readonly isDocsOpen: ReturnType<typeof computed<boolean>>;
    protected readonly isSettingsOpen: ReturnType<typeof computed<boolean>>;
    protected readonly isAdminOpen: ReturnType<typeof computed<boolean>>;
    private readonly currentUrl;

    protected readonly expectedDeletePhrase = computed<string>(
        () => `delete ${this.pendingDeleteNetwork()?.alias ?? ''}`,
    );

    protected readonly deleteConfirmValid = computed<boolean>(
        () => this.deleteConfirmText().trim() === this.expectedDeletePhrase(),
    );

    constructor(
        protected readonly networksService: NetworksService,
        private readonly router: Router,
        private readonly sidebarCountsService: SidebarCountsService,
        private readonly injector: Injector,
    ) {
        this.selectedNetwork$ = this.networksService.selectedNetwork$;
        this.agentCount$ = this.sidebarCountsService.agentCount$;
        this.authorityCount$ = this.sidebarCountsService.authorityCount$;
        this.channelCount$ = this.sidebarCountsService.channelCount$;

        this.currentUrl = toSignal(
            this.router.events.pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                map((e) => e.urlAfterRedirects),
                startWith(this.router.url),
            ),
            {
                initialValue: this.router.url,
            },
        );

        this.isDashboardItemsOpen = computed(() => {
            const url = this.currentUrl();
            return url === '/' || [
                '/dashboard/connected-authorities',
                '/dashboard/connected-agents',
                '/dashboard/active-channels',
            ].some((path) => url.startsWith(path));
        });

        this.isDocsOpen = computed(() =>
            this.currentUrl().startsWith('/docs'),
        );

        this.isSettingsOpen = computed(() =>
            this.currentUrl().startsWith('/settings'),
        );

        this.isAdminOpen = computed(() =>
            this.currentUrl().startsWith('/admin'),
        );

        // Redirect to no-network when the last network is deleted
        combineLatest([this.networksService.isLoading$, this.networksService.selectedNetwork$]).pipe(
            takeUntilDestroyed(),
            filter(([loading]) => !loading),
            filter(([, network]) => network === null),
            filter(() => !this.router.url.startsWith('/no-network')),
        ).subscribe(
            () => this.router.navigate(['/no-network']),
        );
    }

    protected openCreateModal(

    ): void {
        this.newNetworkAlias.set('');
        this.showCreateModal.set(true);
        afterNextRender(
            () => this.networkAliasInput?.nativeElement.focus(),
            { injector: this.injector },
        );
    }

    protected closeCreateModal(

    ): void {
        this.showCreateModal.set(false);
    }

    protected confirmCreate(

    ): void {
        const alias = this.newNetworkAlias().trim();
        if (alias) {
            this.networksService.createNetwork(alias);
            this.showCreateModal.set(false);
        }
    }

    protected openDeleteModal(
        network: INetwork_S,
    ): void {
        this.deleteConfirmText.set('');
        this.pendingDeleteNetwork.set(network);
    }

    protected cancelDelete(

    ): void {
        this.pendingDeleteNetwork.set(null);
        this.deleteConfirmText.set('');
    }

    protected async confirmDelete(

    ): Promise<void> {
        const network = this.pendingDeleteNetwork();
        if (network && this.deleteConfirmValid()) {
            this.pendingDeleteNetwork.set(null);
            this.deleteConfirmText.set('');
            await this.networksService.deleteNetwork(network.id);
            toast.success(`Network "${network.alias}" has been deleted.`);
        }
    }

    protected onAliasChange(
        value: string,
    ): void {
        this.newNetworkAlias.set(value);
    }

    protected onDeleteConfirmChange(
        value: string,
    ): void {
        this.deleteConfirmText.set(value);
    }

    protected copyDeletePhrase(
    ): void {
        navigator.clipboard.writeText(this.expectedDeletePhrase()).catch((err: unknown) => {
            console.error('Failed to copy delete phrase to clipboard', err);
        });
    }
}
