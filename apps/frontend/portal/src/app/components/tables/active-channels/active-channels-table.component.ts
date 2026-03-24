import { ChangeDetectionStrategy, Component, input, signal, inject, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { INetworkChannel } from '@flux/shared/types';

@Component({
    selector: 'app-active-channels-table',
    imports: [
        CommonModule,
    ],
    templateUrl: './active-channels-table.component.html',
    styleUrls: ['./active-channels-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveChannelsTableComponent {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<INetworkChannel[] | undefined>(undefined);

    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [ActiveChannelsTableComponent.clientProviders];

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
        const url = `/api/networks/${networkId}/channels`;
        this.http.get<INetworkChannel[]>(url)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (data: INetworkChannel[]) => {
                    const mappedData = data.map((a) => ({
                        ...a,
                        createdAt: new Date(a.createdAt),
                    }));
                    this.dataStore.set(mappedData);
                },
                error: (error: unknown) => {
                    console.error('Error fetching data', error);
                },
            });
    }
}
