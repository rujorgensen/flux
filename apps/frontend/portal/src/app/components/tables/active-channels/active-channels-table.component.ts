import { ChangeDetectionStrategy, Component, input, signal, effect } from '@angular/core';
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

    constructor() {
        effect(() => {
            const networkId = this.networkId();
            if (networkId) {
                this.fetchData(networkId);
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

    private async fetchData(
        networkId: string,
    ): Promise<void> {
        await api
            .api
            .networks({
                networkId: networkId,
            })
            .channels
            .get()
            .then((response) => {

                if (response.data) {
                    this.dataStore.set(response.data);
                }
            })
            .catch((error) => {
                console.error('Error fetching active channels:', error);
            })
            ;
    }
}
