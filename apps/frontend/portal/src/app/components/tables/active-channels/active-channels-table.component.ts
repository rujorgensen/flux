import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { INetworkChannel } from '@flux/shared/types';
import { api } from '$lib/app/_services/api/api';
import { apiBaseUrl } from '$lib/app/_services/api/api-base';
import { NetworkTokensService } from '$lib/app/_services/network-tokens/network-tokens.service';
import { toast } from 'ngx-sonner';
import {
    deriveChannelFillPercent,
    MAX_CHANNEL_MEMBERS,
} from './channel-capacity.utils';

const MAX_SNIFF_PACKETS = 50;

export interface ISniffPacket {
    timestamp: string;
    data: string;
    formattedData: string;
    agentId: string;
}

/**
 * Shape of each SSE event yielded by the channel sniff endpoint.
 * Eden Treaty parses the `data:` SSE line as JSON into this structure.
 */
interface IChannelSSEEvent {
    data?: {
        type: 'connected' | 'packet';
        /** Raw payload string — only present for 'packet' events. */
        data?: string;
        /** Sender agent ID */
        agentId: string;
        channelName?: string;
        timestamp?: string;
    };
}

/**
 * Eden Treaty does not yet auto-generate typings for SSE (generator) endpoints, so we
 * wrap the `.get()` call in a helper with an explicit signature.  The runtime behaviour is
 * correct: Treaty detects Content-Type text/event-stream and returns an AsyncGenerator.
 */
type TChannelSniffFn = (opts: {
    query: { token: string };
    fetch: RequestInit;
}) => Promise<{ data: AsyncIterable<IChannelSSEEvent> | null }>;

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
    protected readonly deriveChannelFillPercent = deriveChannelFillPercent;
    protected readonly maxChannelMembers = MAX_CHANNEL_MEMBERS;

    /** Set of channel names currently being sniffed. */
    protected readonly sniffingChannels = signal<Set<string>>(new Set());

    /** Map of channelName → received packets. */
    protected readonly sniffPackets = signal<Map<string, ISniffPacket[]>>(new Map());

    /** Map of channelName → authenticated SSE URL (includes token). */
    protected readonly sniffUrls = signal<Map<string, string>>(new Map());

    /** Active AbortControllers, keyed by channel name. */
    private readonly abortControllers = new Map<string, AbortController>();

    constructor(
        private readonly _networkTokensService: NetworkTokensService,
    ) {
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
        for (const [, controller] of this.abortControllers) {
            controller.abort();
        }

        this.abortControllers.clear();
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

    protected sniffUrlFor(
        channelName: string,
    ): string | undefined {
        return this.sniffUrls().get(channelName);
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

        // Mark as sniffing immediately for instant UI feedback
        this.sniffingChannels.update((s) => new Set([...s, channelName]));

        const abortController = new AbortController();
        this.abortControllers.set(channelName, abortController);

        // Reveal the primary network token then start the SSE stream
        this._networkTokensService
            .revealToken$(networkId, 0)
            .subscribe({
                next: (tokenValue) => {
                    const sseUrl = `${apiBaseUrl}/api/networks/${encodeURIComponent(networkId)}/channels/${encodeURIComponent(channelName)}?token=${encodeURIComponent(tokenValue)}`;

                    this.sniffUrls.update((m) => new Map(m).set(channelName, sseUrl));
                    this.consumeSSE(channelName, networkId, tokenValue, abortController);
                },
                error: () => {
                    this.stopSniffing(channelName);
                    toast.error('Failed to retrieve network token. Generate one in Network Settings.');
                },
            });
    }

    private consumeSSE(
        channelName: string,
        networkId: string,
        tokenValue: string,
        abortController: AbortController,
    ): void {
        (async () => {
            try {
                const sniffGet = api.api
                    .networks({ networkId })
                    .channels({ channelName })
                    .get as unknown as TChannelSniffFn;

                const response = await sniffGet({
                    query: { token: tokenValue },
                    fetch: { signal: abortController.signal },
                });

                if (!response.data) return;

                for await (const event of response.data) {
                    if (abortController.signal.aborted) break;

                    const payload = event.data;
                    if (!payload || payload.type !== 'packet' || payload.data === undefined) continue;

                    const packet: ISniffPacket = {
                        timestamp: payload.timestamp ?? new Date().toISOString(),
                        data: payload.data,
                        formattedData: this.tryFormatJson(payload.data),
                        agentId: payload.agentId,
                    };

                    this.sniffPackets.update((m) => {
                        const next = new Map(m);
                        const existing = next.get(channelName) ?? [];

                        next.set(channelName, [packet, ...existing].slice(0, MAX_SNIFF_PACKETS));

                        return next;
                    });
                }
            } catch {
                if (!abortController.signal.aborted) {
                    this.stopSniffing(channelName);
                }
            }
        })();
    }

    private stopSniffing(
        channelName: string,
    ): void {
        const controller = this.abortControllers.get(channelName);

        if (controller) {
            controller.abort();
            this.abortControllers.delete(channelName);
        }

        this.sniffingChannels.update((s) => {
            const next = new Set(s);
            next.delete(channelName);

            return next;
        });

        this.sniffUrls.update((m) => {
            const next = new Map(m);
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
