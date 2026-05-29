import { Injectable } from '@angular/core';
import {
    type Observable,
    BehaviorSubject,
    catchError,
    from,
    map,
    of,
    switchMap,
    timer,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { api } from '../api/api';
import { NetworksService } from '../networks.service';

const SIDEBAR_COUNT_POLL_INTERVAL_MS = 5_000;

@Injectable({
    providedIn: 'root',
})
export class SidebarCountsService {
    private readonly _agentCount$ = new BehaviorSubject<number | null>(null);
    private readonly _authorityCount$ = new BehaviorSubject<number | null>(null);
    private readonly _channelCount$ = new BehaviorSubject<number | null>(null);

    public readonly agentCount$: Observable<number | null> = this._agentCount$.asObservable();
    public readonly authorityCount$: Observable<number | null> = this._authorityCount$.asObservable();
    public readonly channelCount$: Observable<number | null> = this._channelCount$.asObservable();

    constructor(
        private readonly networksService: NetworksService,
    ) {
        this.networksService.selectedNetwork$.pipe(
            takeUntilDestroyed(),
            switchMap((network) => {
                if (!network) {
                    return of([null, null, null] as const);
                }

                const networkId = network.id;

                // todo: This should use the flux conenction for live updates
                return timer(0, SIDEBAR_COUNT_POLL_INTERVAL_MS).pipe(
                    switchMap(() => from(
                        api.api.networks({ networkId })['connection-status'].get(),
                    ).pipe(
                        map((response) => [
                            response.data?.agents ?? null,
                            response.data?.authorities ?? null,
                            response.data?.channels ?? null,
                        ] as const),
                        catchError((error: unknown) => {
                            console.error('Error fetching sidebar counts:', error);
                            return of([null, null, null] as const);
                        }),
                    )),
                );
            }),
        )
            .subscribe({
                next: ([agents, authorities, channels]) => {
                    this._agentCount$.next(agents);
                    this._authorityCount$.next(authorities);
                    this._channelCount$.next(channels);
                },
            });
    }
}
