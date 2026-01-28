import { ChangeDetectionStrategy, Component, input, signal, effect, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';
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
export class ConnectedAgentsTableComponent implements OnInit {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<TNetworkAgent[] | undefined>(undefined);

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [ConnectedAgentsTableComponent.clientProviders];

    constructor(
        private http: HttpClient,
    ) {
        effect(() => {
            const networkId = this.networkId();
            if (networkId) {
                this.fetchData(networkId);
            }
        });
    }

    ngOnInit() {
        const networkId = this.networkId();
        if (networkId) {
            this.fetchData(networkId);
        }
    }

    private async fetchData(
        networkId: string,
    ) {
        try {
            const url = `/api/networks/${networkId}/agents/connected`;
            this.http.get<TNetworkAgent[]>(url).subscribe({
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
        } catch (error) {
            console.error('Error fetching data', error);
        }
    }
}
