import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
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
    protected readonly page = signal<number>(1);
    protected readonly pageSize = signal<number>(25);
    protected readonly total = signal<number>(0);
    protected readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize()) || 1);

    constructor() {
        effect(() => {
            const networkId = this.networkId();
            const page = this.page();
            const pageSize = this.pageSize();
            if (networkId) {
                this.fetchData(networkId, page, pageSize);
            }
        });
    }

    protected nextPage(): void {
        this.page.update((p) => p + 1);
    }

    protected prevPage(): void {
        this.page.update((p) => Math.max(1, p - 1));
    }

    protected onPageSizeChange(event: Event): void {
        this.pageSize.set(Number((event.target as HTMLSelectElement).value));
        this.page.set(1);
    }

    private fetchData(
        networkId: string,
        page: number,
        pageSize: number,
    ): void {
        api
            .api
            .networks({
                networkId,
            })
            .authorities
            .connected
            .get({
                query: { page, pageSize },
            })
            .then((response) => {
                if (response.data) {
                    this.dataStore.set(response.data.data);
                    this.total.set(response.data.total);
                }
            })
            .catch((error: unknown) => {
                console.error('Error fetching data', error);
            })
            ;
    }
}
