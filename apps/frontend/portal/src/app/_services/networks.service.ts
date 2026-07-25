import { Injectable } from '@angular/core';
import {
    type Observable,
    BehaviorSubject,
    combineLatest,
    map,
} from 'rxjs';
import { api } from '../_services/api/api';
import { InstanceService } from './instance.service';
import type {
    INetwork_S,
} from '@flux/shared/features/networks';

const STORAGE_KEY = 'flux_selected_network_id';
export const MAX_NETWORKS = 3;

/**
 * Networks are listed alphabetically wherever they are shown. The API returns
 * them in creation order, which reads as unordered in the sidebar selector once
 * there are more than a couple.
 *
 * `sensitivity: 'base'` so casing does not split the list — 'biograf' sorts next
 * to 'Biograf' instead of after every capitalised name.
 */
export const sortByAlias = (
    networks: INetwork_S[],
): INetwork_S[] => {
    return [...networks].sort((
        a: INetwork_S,
        b: INetwork_S,
    ) => a.alias.localeCompare(b.alias, undefined, { sensitivity: 'base' }));
};

@Injectable({
    providedIn: 'root',
})
export class NetworksService {
    private readonly _networks$ = new BehaviorSubject<INetwork_S[]>([]);
    private readonly _selectedNetwork$ = new BehaviorSubject<INetwork_S | null>(null);
    private readonly _isLoading$ = new BehaviorSubject<boolean>(false);

    public readonly networks$: Observable<INetwork_S[]> = this._networks$.asObservable();
    public readonly selectedNetwork$: Observable<INetwork_S | null> = this._selectedNetwork$.asObservable();
    public readonly isLoading$: Observable<boolean> = this._isLoading$.asObservable();
    // Self-hosted instances are not subject to the SaaS network cap.
    public readonly canCreateNetwork$: Observable<boolean>;

    constructor(
        private readonly _instanceService: InstanceService,
    ) {
        this.canCreateNetwork$ = combineLatest([
            this._networks$,
            this._instanceService.selfHosted$,
        ]).pipe(
            map(([nets, selfHosted]) => selfHosted || nets.length < MAX_NETWORKS),
        );

        this.loadNetworks();
    }

    protected loadNetworks(

    ): void {
        this._isLoading$.next(true);

        api
            .api
            .networks
            .get()
            .then((response) => {
                if (response.data) {
                    const networks: INetwork_S[] = sortByAlias(response.data);

                    this._networks$.next(networks);
                    this.restoreSelectedNetwork(networks);
                }
                this._isLoading$.next(false);
            })
            .catch((error: unknown) => {
                console.error('Error loading networks', error);
                this._isLoading$.next(false);
            });
    }

    public createNetwork(
        alias: string,
    ): void {
        api
            .api
            .networks
            .post({
                alias,
            })
            .then((response) => {
                const network = response.data;
                if (network) {
                    this._networks$.next(sortByAlias([...this._networks$.getValue(), network]));
                    this.selectNetwork(network);
                }
            })
            .catch((error: unknown) => {
                console.error('Error creating network', error);
            });
    }

    public async deleteNetwork(
        networkId: string,
    ): Promise<void> {
        await api
            .api
            .networks({
                networkId,
            })
            .delete()
            .then(() => {
                const selected = this._selectedNetwork$.getValue();
                const remaining = this._networks$.getValue().filter((n) => n.id !== networkId);
                this._networks$.next(remaining);
                if (selected?.id === networkId) {
                    this.selectNetwork(remaining.length > 0 ? remaining[0] : null);
                }
            })
            .catch((error: unknown) => {
                console.error('Error deleting network', error);
            });
    }

    public selectNetwork(
        network: INetwork_S | null,
    ): void {
        this._selectedNetwork$.next(network);
        if (network) {
            localStorage.setItem(STORAGE_KEY, network.id);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    private restoreSelectedNetwork(
        networks: INetwork_S[],
    ): void {
        // Precedence: `?slug=` query param (a network id) > localStorage > first network.
        const slug = new URLSearchParams(window.location.search).get('slug');
        if (slug) {
            const fromSlug = networks.find((n) => n.id === slug);
            if (fromSlug) {
                this.selectNetwork(fromSlug);
                return;
            }
        }

        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId) {
            const found = networks.find((n) => n.id === savedId);
            if (found) {
                this._selectedNetwork$.next(found);
                return;
            }
        }
        if (networks.length > 0) {
            this.selectNetwork(networks[0]);
        }
    }
}
