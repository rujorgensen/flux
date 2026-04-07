import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { INetworkChannel } from '@flux/shared/types';
import { api } from '$lib/app/_services/api/api';
import { toast } from 'ngx-sonner';

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
    protected readonly closingChannelName = signal<string | null>(null);
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

    protected async onCloseChannel(
        channel: INetworkChannel,
    ): Promise<void> {
        const networkId = this.networkId();
        if (!networkId) return;

        this.closingChannelName.set(channel.channelName);

        await api
            .api
            .networks({
                networkId,
            })
            .channels({
                channelName: channel.channelName,
            })
            .delete()
            .then(() => {
                this.dataStore.update((data) => data?.filter((c) => c.channelName !== channel.channelName));
                toast.success(`Channel "${channel.channelName}" closed successfully.`);
            })
            .catch((error: unknown) => {
                console.error('Error closing channel:', error);
                toast.error('Failed to close channel. Please try again.');
            })
            .finally(() => {
                this.closingChannelName.set(null);
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

    private async fetchData(
        networkId: string,
        page: number,
        pageSize: number,
    ): Promise<void> {
        await api
            .api
            .networks({
                networkId: networkId,
            })
            .channels
            .get({
                query: { page, pageSize },
            })
            .then((response) => {
                if (response.data) {
                    this.dataStore.set(response.data.data);
                    this.total.set(response.data.total);
                }
            })
            .catch((error) => {
                console.error('Error fetching active channels:', error);
            })
            ;
    }
}
