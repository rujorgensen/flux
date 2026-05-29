import { Injectable } from '@angular/core';
import {
    type Observable,
    BehaviorSubject,
    from,
    switchMap,
    map,
    catchError,
    of,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { api } from '../api/api';
import { NetworksService } from '../networks.service';

export interface IHistoryDataPoint {
    label: string;
    value: number;
}

interface IApiHistoryDataPoint {
    count: number;
    timeslotAt: Date;
}

function mapHistoryDataPoints(
    points: IApiHistoryDataPoint[],
): IHistoryDataPoint[] {
    return points.map((point, index) => ({
        label: index === points.length - 1 ?
            'Now'
            :
            new Date(point.timeslotAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }),
        value: point.count,
    }));
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

                return from(
                    api.api.networks({ networkId: network.id })['connection-history'].get(),
                ).pipe(
                    map((response) => response.data ?? null),
                    catchError((error: unknown) => {
                        console.error('Error fetching dashboard history data:', error);
                        return of(null);
                    }),
                );
            }),
        ).subscribe((status) => {
            if (!status) {
                this._agentHistory$.next([]);
                this._authorityHistory$.next([]);
                this._channelHistory$.next([]);
                return;
            }

            this._agentHistory$.next(mapHistoryDataPoints(status.agents));
            this._authorityHistory$.next(mapHistoryDataPoints(status.authorities));
            this._channelHistory$.next(mapHistoryDataPoints(status.channels));
        });
    }
}
