import { ChangeDetectionStrategy, Component, input, signal, inject, effect } from '@angular/core';
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

    private http = inject(HttpClient);
    private destroyRef = takeUntilDestroyed();

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [ConnectedAuthoritiesTableComponent.clientProviders];

    constructor(

    ) {
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
            .pipe(this.destroyRef)
            .subscribe({
                next: (data) => {
                    const mappedData = data.map((a) => ({
                        ...a,
                        connectedAt: new Date(a.connectedAt),
                    }));
                    this.dataStore.set(mappedData);
                },
                error: (error) => {
                    console.error('Error fetching data', error);
                },
            });
    }
}
