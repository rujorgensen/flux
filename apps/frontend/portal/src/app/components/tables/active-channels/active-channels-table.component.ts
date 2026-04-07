import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { INetworkChannel } from '@flux/shared/types';
import { api } from '$lib/app/_services/api/api';
import { apiBaseUrl } from '$lib/app/_services/api/api-base';
import { toast } from 'ngx-sonner';

const MAX_SNIFF_PACKETS = 50;

export interface ISniffPacket {
    timestamp: string;
    data: string;
    formattedData: string;
}

@Component({
    selector: 'app-active-channels-table',
    imports: [
        CommonModule,
    ],
    templateUrl: './active-channels-table.component.html',
    styleUrls: ['./active-channels-table.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveChannelsTableComponent implements OnDestroy {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<INetworkChannel[] | undefined>(undefined);
    protected readonly closingChannelName = signal<string | null>(null);
    protected readonly page = signal<number>(1);
    protected readonly pageSize = signal<number>(25);
    protected readonly total = signal<number>(0);
    protected readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize()) || 1);

    /** Set of channel names currently being sniffed. */
    protected readonly sniffingChannels = signal<Set<string>>(new Set());

    /** Map of channelName → received packets. */
    protected readonly sniffPackets = signal<Map<string, ISniffPacket[]>>(new Map());

    /** Active EventSource instances, keyed by channel name. */
    private readonly eventSources = new Map<string, EventSource>();

    private readonly apiBase: string = apiBaseUrl;

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

    public ngOnDestroy(

    ): void {
        // Close all active EventSource connections when the component is destroyed
        for (const [, es] of this.eventSources) {
            es.close();
        }

        this.eventSources.clear();
    }

    protected isSniffing(
        channelName: string,
    ): boolean {
        return this.sniffingChannels().has(channelName);
    }

    protected packetsFor(
        channelName: string,
    ): ISniffPacket[] {
        return this.sniffPackets().get(channelName) ?? [];
    }

    protected toggleSniff(
        channelName: string,
    ): void {
        if (this.isSniffing(channelName)) {
            this.stopSniffing(channelName);
        } else {
            this.startSniffing(channelName);
        }
    }

    protected clearPackets(
        channelName: string,
    ): void {
        this.sniffPackets.update((m) => {
            const next = new Map(m);
            next.set(channelName, []);

            return next;
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
                this.stopSniffing(channel.channelName);
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

    private startSniffing(
        channelName: string,
    ): void {
        const networkId = this.networkId();
        if (!networkId) return;

        const url = `${this.apiBase}/api/networks/${encodeURIComponent(networkId)}/channels/${encodeURIComponent(channelName)}`;
        const es = new EventSource(url);

        es.onmessage = (event: MessageEvent) => {
            try {
                const parsed = JSON.parse(event.data as string) as { type: string; data?: string; timestamp: string; };

                if (parsed.type !== 'packet' || parsed.data === undefined) return;

                const formattedData = this.tryFormatJson(parsed.data);

                const packet: ISniffPacket = {
                    timestamp: parsed.timestamp,
                    data: parsed.data,
                    formattedData,
                };

                this.sniffPackets.update((m) => {
                    const next = new Map(m);
                    const existing = next.get(channelName) ?? [];

                    next.set(channelName, [...existing, packet].slice(-MAX_SNIFF_PACKETS));

                    return next;
                });
            } catch {
                // ignore malformed events
            }
        };

        es.onerror = () => {
            // If connection drops, update sniffing state
            this.stopSniffing(channelName);
        };

        this.eventSources.set(channelName, es);

        this.sniffingChannels.update((s) => new Set([...s, channelName]));
    }

    private stopSniffing(
        channelName: string,
    ): void {
        const es = this.eventSources.get(channelName);

        if (es) {
            es.close();
            this.eventSources.delete(channelName);
        }

        this.sniffingChannels.update((s) => {
            const next = new Set(s);
            next.delete(channelName);

            return next;
        });
    }

    private tryFormatJson(
        data: string,
    ): string {
        try {
            return JSON.stringify(JSON.parse(data), null, 2);
        } catch {
            return data;
        }
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
