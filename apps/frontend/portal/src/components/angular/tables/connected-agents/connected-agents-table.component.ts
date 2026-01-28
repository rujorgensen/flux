import { ChangeDetectionStrategy, Component, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TNetworkAgent } from '@flux/mesh/store/redis/network-agent';
import { FormatDatePipe } from '../../pipes/format-date.pipe';

@Component({
    selector: 'app-connected-agents-table',
    imports: [CommonModule, FormatDatePipe],
    templateUrl: './connected-agents-table.component.html',
    styleUrls: ['./connected-agents-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class ConnectedAgentsTableComponent {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<TNetworkAgent[] | undefined>(undefined);

    private http = inject(HttpClient);
    private destroyRef = takeUntilDestroyed();

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [ConnectedAgentsTableComponent.clientProviders];

    constructor() {
        const networkId = this.networkId();
        if (networkId) {
            this.fetchData(networkId);
        }
    }

    private fetchData(
        networkId: string,
    ) {
        const url = `/api/networks/${networkId}/agents/connected`;
        this.http.get<TNetworkAgent[]>(url)
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
