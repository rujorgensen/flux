import { ChangeDetectionStrategy, Component, input, signal, effect, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';
import type { TNetworkAuthority } from '@flux/shared/types';
import { FormatDatePipe } from '../../pipes/format-date.pipe';

@Component({
    selector: 'app-connected-authorities-table',
    imports: [CommonModule, FormatDatePipe],
    templateUrl: './connected-authorities-table.component.html',
    styleUrls: ['./connected-authorities-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAuthoritiesTableComponent implements OnInit {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<TNetworkAuthority[] | undefined>(undefined);

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [ConnectedAuthoritiesTableComponent.clientProviders];

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
            const url = `/api/networks/${networkId}/authorities/connected`;
            this.http.get<TNetworkAuthority[]>(url).subscribe({
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
