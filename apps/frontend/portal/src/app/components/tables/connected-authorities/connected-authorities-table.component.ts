import { ChangeDetectionStrategy, Component, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TNetworkAuthority } from '@flux/shared/types';
import { api } from '$lib/app/_services/api/api';

@Component({
    selector: 'app-connected-authorities-table',
    imports: [CommonModule],
    templateUrl: './connected-authorities-table.component.html',
    styleUrls: ['./connected-authorities-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAuthoritiesTableComponent {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<TNetworkAuthority[] | undefined>(undefined);

    constructor() {
        effect(() => {
            const networkId = this.networkId();
            if (networkId) {
                this.fetchData(networkId);
            }
        });
    }

    private fetchData(
        networkId: string,
    ) {
        api
            .api
            .networks({
                networkId,
            })
            .authorities
            .connected
            .get()
            .then((response) => {
                if (response.data) {
                    this.dataStore.set(response.data);
                }
            })
            .catch((error: unknown) => {
                console.error('Error fetching data', error);
            })
            ;
    }
}
