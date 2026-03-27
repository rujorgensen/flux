import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, filter, map, startWith } from 'rxjs';
import { NetworksService, INetwork, MAX_NETWORKS } from '../../_services/networks.service';
import { NetworkSelectorComponent } from '../network-selector/network-selector.component';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-dashboard-layout',
    templateUrl: './dashboard-layout.component.html',
    styleUrl: './dashboard-layout.component.scss',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        NetworkSelectorComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutComponent {
    userSession = input<UserSession | null>();
    pageTitle = input<string>('Dashboard');

    protected readonly MAX_NETWORKS = MAX_NETWORKS;

    // Modal state
    protected readonly showCreateModal = signal<boolean>(false);
    protected readonly newNetworkAlias = signal<string>('');
    protected readonly pendingDeleteNetwork = signal<INetwork | null>(null);
    protected readonly deleteConfirmText = signal<string>('');

    protected readonly selectedNetwork$;

    private readonly currentUrl;

    protected readonly isDashboardItemsOpen = computed(() =>
        [
            '/dashboard/connected-authorities',
            '/dashboard/connected-agents',
            '/dashboard/active-channels',
        ].some((path) => (this.currentUrl() ?? '').startsWith(path)),
    );

    protected readonly isSettingsOpen = computed(() =>
        (this.currentUrl() ?? '').startsWith('/dashboard/settings/'),
    );

    protected readonly expectedDeletePhrase = computed<string>(
        () => `delete ${this.pendingDeleteNetwork()?.alias ?? ''}`,
    );

    protected readonly deleteConfirmValid = computed<boolean>(
        () => this.deleteConfirmText().trim() === this.expectedDeletePhrase(),
    );

    constructor(
        protected readonly networksService: NetworksService,
        private readonly router: Router,
    ) {
        this.selectedNetwork$ = this.networksService.selectedNetwork$;

        this.currentUrl = toSignal(
            this.router.events.pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                map((e) => e.urlAfterRedirects),
                startWith(this.router.url),
            ));

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

    openDeleteModal(network: INetwork): void {
        this.deleteConfirmText.set('');
        this.pendingDeleteNetwork.set(network);
    }

    protected cancelDelete(

    ): void {
        this.pendingDeleteNetwork.set(null);
        this.deleteConfirmText.set('');
    }

    protected confirmDelete(

    ): void {
        const network = this.pendingDeleteNetwork();
        if (network && this.deleteConfirmValid()) {
            this.networksService.deleteNetwork(network.id);
            this.pendingDeleteNetwork.set(null);
            this.deleteConfirmText.set('');
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
}
