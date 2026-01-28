import { ChangeDetectionStrategy, Component, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export class ActiveChannelsTableComponent {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<INetworkChannel[] | undefined>(undefined);

    private http = inject(HttpClient);
    private destroyRef = takeUntilDestroyed();

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [ActiveChannelsTableComponent.clientProviders];

    constructor() {
        const networkId = this.networkId();
        if (networkId) {
            this.fetchData(networkId);
        }
    }

    private fetchData(
        networkId: string,
    ) {
        const url = `/api/networks/${networkId}/channels`;
        this.http.get<INetworkChannel[]>(url)
            .pipe(this.destroyRef)
            .subscribe({
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
    }
}
