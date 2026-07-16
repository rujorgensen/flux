import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    effect,
    input,
    signal,
    untracked,
} from '@angular/core';
import { animate, state, style, transition, trigger, type AnimationEvent } from '@angular/animations';
import { DatePipe } from '@angular/common';
import type { TNetworkAgent } from '@flux/mesh/store/redis/network-agent';
import { api } from '$lib/app/_services/api/api';
import { toast } from 'ngx-sonner';
import { FluxNetworkAgentService } from '$lib/app/_services/flux/flux-network.agent.service';
import { onConnectedAgentCount$$ } from '$lib/app/data/flux/connected-agents.service.fn';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import type { TNetworkId_S } from '@flux/shared/types';

const DISCONNECT_LINGER_S = 5;

interface IRowEntry {
    data: TNetworkAgent;
    disconnecting: boolean;
    secondsLeft: number;
    animState: 'visible' | 'hidden';
}

@Component({
    selector: 'app-connected-agents-table',
    imports: [DatePipe],
    templateUrl: './connected-agents-table.component.html',
    styleUrls: ['./connected-agents-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('rowAnim', [
            state('visible', style({ opacity: 1 })),
            state('hidden', style({ opacity: 0 })),
            transition('visible => hidden', animate('400ms ease-out')),
        ]),
    ],
})
export class ConnectedAgentsTableComponent {
    public readonly networkId = input.required<string>();

    protected readonly rows = signal<IRowEntry[] | undefined>(undefined);
    protected readonly hasRows = computed(() => {
        const r = this.rows();
        return r !== undefined && r.length > 0;
    });
    protected readonly kickingAgentId = signal<string | null>(null);
    protected readonly kickingAll = signal<boolean>(false);
    protected readonly page = signal<number>(1);
    protected readonly pageSize = signal<number>(25);
    protected readonly total = signal<number>(0);
    protected readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize()) || 1);

    private readonly _disconnectIntervals = new Map<string, ReturnType<typeof setInterval>>();

    private readonly _liveCount = toSignal(
        toObservable(this.networkId).pipe(
            filter(Boolean),
            switchMap((networkId) =>
                this._fluxNetworkAgentService.networkFluxAgent$$.pipe(
                    switchMap((connection) =>
                        onConnectedAgentCount$$(networkId as TNetworkId_S, connection),
                    ),
                ),
            ),
        ),
    );

    constructor(
        private readonly _fluxNetworkAgentService: FluxNetworkAgentService,
        private readonly _destroyRef: DestroyRef,
    ) {
        effect(() => {
            const networkId = this.networkId();
            const page = this.page();
            const pageSize = this.pageSize();
            const _count = this._liveCount(); // reactive — re-fetch on live updates
            if (networkId) {
                untracked(() => this.fetchData(networkId, page, pageSize));
            }
        });

        this._destroyRef.onDestroy(() => this._clearAllIntervals());
    }

    protected onRowAnimDone(
        event: AnimationEvent,
        id: string,
    ): void {
        if (event.toState === 'hidden') {
            this.rows.update((current) => current?.filter((r) => r.data.id !== id));
        }
    }

    protected async onKickAllAgents(): Promise<void> {
        const networkId = this.networkId();
        if (!networkId) return;

        this.kickingAll.set(true);

        await api
            .api
            .networks({ networkId })
            .agents
            .delete()
            .then((response) => {
                const count = (response.data as { count: number; } | null)?.count ?? 0;
                this._clearAllIntervals();
                this.rows.set([]);
                toast.success(`${count} agent(s) kicked successfully.`);
            })
            .catch((error: unknown) => {
                console.error('Error kicking all agents:', error);
                toast.error('Failed to kick all agents. Please try again.');
            })
            .finally(() => {
                this.kickingAll.set(false);
            });
    }

    protected async onKickAgent(
        entry: IRowEntry,
    ): Promise<void> {
        const networkId = this.networkId();
        if (!networkId) return;

        this.kickingAgentId.set(entry.data.id);

        await api
            .api
            .networks({ networkId })
            .agents({ agentId: entry.data.id })
            .delete()
            .then(() => {
                this._clearInterval(entry.data.id);
                this.rows.update((data) => data?.filter((r) => r.data.id !== entry.data.id));
                toast.success(`Agent ${entry.data.uid ?? entry.data.id} kicked successfully.`);
            })
            .catch((error: unknown) => {
                console.error('Error kicking agent:', error);
                toast.error('Failed to kick agent. Please try again.');
            })
            .finally(() => {
                this.kickingAgentId.set(null);
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

    private _startDisconnectCountdown(id: string): void {
        const intervalId = setInterval(() => {
            this.rows.update((current) => {
                if (!current) return current;
                return current.map((r) => {
                    if (r.data.id !== id) return r;
                    const next = r.secondsLeft - 1;
                    if (next <= 0) {
                        this._clearInterval(id);
                        return { ...r, secondsLeft: 0, animState: 'hidden' as const };
                    }
                    return { ...r, secondsLeft: next };
                });
            });
        }, 1_000);

        this._disconnectIntervals.set(id, intervalId);
    }

    private _clearInterval(id: string): void {
        const intervalId = this._disconnectIntervals.get(id);
        if (intervalId !== undefined) {
            clearInterval(intervalId);
            this._disconnectIntervals.delete(id);
        }
    }

    private _clearAllIntervals(): void {
        for (const intervalId of this._disconnectIntervals.values()) {
            clearInterval(intervalId);
        }
        this._disconnectIntervals.clear();
    }

    private fetchData(
        networkId: string,
        page: number,
        pageSize: number,
    ): void {
        void api
            .api
            .networks({ networkId })
            .agents
            .connected
            .get({ query: { page, pageSize } })
            .then((response) => {
                if (!response.data) return;

                const newData = response.data.data;
                const newIds = new Set(newData.map((a) => a.id));
                const current = this.rows() ?? [];

                // Clear countdowns for rows that came back
                for (const row of current) {
                    if (newIds.has(row.data.id) && this._disconnectIntervals.has(row.data.id)) {
                        this._clearInterval(row.data.id);
                    }
                }

                // Detect newly disconnected rows (were active, now gone)
                const newlyGoneIds = new Set(
                    current
                        .filter((r) => !newIds.has(r.data.id) && !r.disconnecting)
                        .map((r) => r.data.id),
                );
                for (const id of newlyGoneIds) {
                    this._startDisconnectCountdown(id);
                }

                const activeRows: IRowEntry[] = newData.map((d) => ({
                    data: d,
                    disconnecting: false,
                    secondsLeft: 0,
                    animState: 'visible',
                }));

                const stillDisconnecting = current.filter(
                    (r) => r.disconnecting && !newIds.has(r.data.id),
                );

                const newlyGoneRows: IRowEntry[] = current
                    .filter((r) => newlyGoneIds.has(r.data.id))
                    .map((r) => ({ ...r, disconnecting: true, secondsLeft: DISCONNECT_LINGER_S, animState: 'visible' as const }));

                this.rows.set([...activeRows, ...stillDisconnecting, ...newlyGoneRows]);
                this.total.set(response.data.total);
            })
            .catch((error) => {
                console.error('Error fetching connected agents:', error);
            });
    }
}
