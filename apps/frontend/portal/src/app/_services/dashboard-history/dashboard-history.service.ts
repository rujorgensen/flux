import { Injectable } from '@angular/core';
import { BehaviorSubject, from, switchMap, catchError, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { api } from '../api/api';
import { NetworksService } from '../networks.service';

export interface IHistoryDataPoint {
    label: string;
    value: number;
}

export interface IChartConfig {
    labels: string[];
    values: number[];
    currentValue: number;
}

/** Percentage of the current count used as the starting baseline for synthetic history. */
const BASELINE_RATIO = 0.6;

/** Percentage of headroom added progressively as the trend approaches the current count. */
const GROWTH_RATIO = 0.4;

/** Maximum random variance applied per data point, as a fraction of the current count. */
const VARIANCE_RATIO = 0.08;

/**
 * Generates a synthetic 24-hour trend of data points that converge to `currentCount`.
 * This is simulated data intended for demonstration purposes only.
 * Real historical data would require a backend persistence layer.
 */
function generateHistory(currentCount: number, points = 24): IHistoryDataPoint[] {
    const now = new Date();
    const history: IHistoryDataPoint[] = [];

    for (let i = points - 1; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const label = time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const progress = (points - i) / points;
        const base = Math.round(currentCount * (BASELINE_RATIO + GROWTH_RATIO * progress));
        const maxVariance = Math.max(1, Math.round(currentCount * VARIANCE_RATIO));
        const variance = Math.round(Math.random() * maxVariance);
        const value = Math.max(0, base + (Math.random() > 0.5 ? variance : -variance));
        history.push({
            label,
            value,
        });
    }

    history[history.length - 1] = {
        label: 'Now',
        value: currentCount,
    };

    return history;
}

@Injectable({
    providedIn: 'root',
})
export class DashboardHistoryService {
    private readonly _agentHistory$ = new BehaviorSubject<IHistoryDataPoint[]>([]);
    private readonly _authorityHistory$ = new BehaviorSubject<IHistoryDataPoint[]>([]);
    private readonly _channelHistory$ = new BehaviorSubject<IHistoryDataPoint[]>([]);

    public readonly agentHistory$: Observable<IHistoryDataPoint[]> = this._agentHistory$.asObservable();
    public readonly authorityHistory$: Observable<IHistoryDataPoint[]> = this._authorityHistory$.asObservable();
    public readonly channelHistory$: Observable<IHistoryDataPoint[]> = this._channelHistory$.asObservable();

    constructor(
        private readonly networksService: NetworksService,
    ) {
        this.networksService.selectedNetwork$.pipe(
            takeUntilDestroyed(),
            switchMap((network) => {
                if (!network) {
                    return of(null);
                }

                const networkId = network.id;

                return from(
                    Promise.all([
                        api.api.networks({ networkId }).agents.connected.get(),
                        api.api.networks({ networkId }).authorities.connected.get(),
                        api.api.networks({ networkId }).channels.get(),
                    ]),
                ).pipe(
                    catchError((error: unknown) => {
                        console.error('Error fetching dashboard history data:', error);
                        return of(null);
                    }),
                );
            }),
        ).subscribe((result) => {
            if (!result) {
                this._agentHistory$.next([]);
                this._authorityHistory$.next([]);
                this._channelHistory$.next([]);
                return;
            }

            const [agents, authorities, channels] = result;
            const agentCount = agents.data?.length ?? 0;
            const authorityCount = authorities.data?.length ?? 0;
            const channelCount = channels.data?.length ?? 0;

            this._agentHistory$.next(generateHistory(agentCount));
            this._authorityHistory$.next(generateHistory(authorityCount));
            this._channelHistory$.next(generateHistory(channelCount));
        });
    }
}
