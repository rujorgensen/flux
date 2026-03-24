import { ChangeDetectionStrategy, Component, input, signal, inject, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TNetworkAgent } from '@flux/mesh/store/redis/network-agent';

@Component({
    selector: 'app-connected-agents-table',
    imports: [CommonModule],
    templateUrl: './connected-agents-table.component.html',
    styleUrls: ['./connected-agents-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAgentsTableComponent {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<TNetworkAgent[] | undefined>(undefined);

    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [ConnectedAgentsTableComponent.clientProviders];

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
        const url = `/api/networks/${networkId}/agents/connected`;
        this.http.get<TNetworkAgent[]>(url)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (data: TNetworkAgent[]) => {
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
