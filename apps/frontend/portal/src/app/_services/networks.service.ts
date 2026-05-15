import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import type { Observable } from 'rxjs';
import { api } from '../_services/api/api';

export interface INetwork {
    id: string;
    alias: string;
    users: {
        userId: string;
        role: string;
    }[];
}

const STORAGE_KEY = 'flux_selected_network_id';
export const MAX_NETWORKS = 3;

@Injectable({
    providedIn: 'root',
})
export class NetworksService {
    private readonly _networks$ = new BehaviorSubject<INetwork[]>([]);
    private readonly _selectedNetwork$ = new BehaviorSubject<INetwork | null>(null);
    private readonly _isLoading$ = new BehaviorSubject<boolean>(false);

    public readonly networks$: Observable<INetwork[]> = this._networks$.asObservable();
    public readonly selectedNetwork$: Observable<INetwork | null> = this._selectedNetwork$.asObservable();
    public readonly isLoading$: Observable<boolean> = this._isLoading$.asObservable();
    public readonly canCreateNetwork$: Observable<boolean> = this._networks$.pipe(
        map((nets) => nets.length < MAX_NETWORKS),
    );

    constructor(
    ) {
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
                    this._networks$.next(response.data);
                    this.restoreSelectedNetwork(response.data);
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
                    this._networks$.next([...this._networks$.getValue(), network]);
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
        network: INetwork | null,
    ): void {
        this._selectedNetwork$.next(network);
        if (network) {
            localStorage.setItem(STORAGE_KEY, network.id);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    private restoreSelectedNetwork(
        networks: INetwork[],
    ): void {
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
