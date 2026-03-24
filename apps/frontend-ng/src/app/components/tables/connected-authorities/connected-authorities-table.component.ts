import { ChangeDetectionStrategy, Component, input, signal, inject, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TNetworkAuthority } from '@flux/shared/types';

@Component({
    selector: 'app-connected-authorities-table',
    imports: [CommonModule],
    templateUrl: './connected-authorities-table.component.html',
    styleUrls: ['./connected-authorities-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class ConnectedAuthoritiesTableComponent {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<TNetworkAuthority[] | undefined>(undefined);

    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [ConnectedAuthoritiesTableComponent.clientProviders];

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
        const url = `/api/networks/${networkId}/authorities/connected`;
        this.http.get<TNetworkAuthority[]>(url)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (data: TNetworkAuthority[]) => {
                    const mappedData = data.map((a) => ({
                        ...a,
                        connectedAt: new Date(a.connectedAt),
                    }));
                    this.dataStore.set(mappedData);
                },
                error: (error: unknown) => {
                    console.error('Error fetching data', error);
                },
            });
    }
}
