import { ChangeDetectionStrategy, Component, input, signal, effect, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';
import type { INetworkChannel } from '@flux/shared/types';
import { FormatDatePipe } from '../../pipes/format-date.pipe';

@Component({
    selector: 'app-active-channels-table',
    imports: [CommonModule, FormatDatePipe],
    templateUrl: './active-channels-table.component.html',
    styleUrls: ['./active-channels-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class ActiveChannelsTableComponent implements OnInit {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<INetworkChannel[] | undefined>(undefined);

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [ActiveChannelsTableComponent.clientProviders];

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
            const url = `/api/networks/${networkId}/channels`;
            this.http.get<INetworkChannel[]>(url).subscribe({
                next: (data) => {
                    const mappedData = data.map((a) => ({
                        ...a,
                        createdAt: new Date(a.createdAt),
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
