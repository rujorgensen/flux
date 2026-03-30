import { Injectable } from '@angular/core';
import { BehaviorSubject, from, switchMap, map, catchError, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { api } from '../api/api';
import { NetworksService } from '../networks.service';

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

                return from(
                    Promise.all([
                        api.api.networks({ networkId }).agents.connected.get(),
                        api.api.networks({ networkId }).authorities.connected.get(),
                        api.api.networks({ networkId }).channels.get(),
                    ]),
                ).pipe(
                    map(([agents, authorities, channels]) => [
                        agents.data?.length ?? null,
                        authorities.data?.length ?? null,
                        channels.data?.length ?? null,
                    ] as const),
                    catchError((error: unknown) => {
                        console.error('Error fetching sidebar counts:', error);
                        return of([null, null, null] as const);
                    }),
                );
            }),
        ).subscribe(([agents, authorities, channels]) => {
            this._agentCount$.next(agents);
            this._authorityCount$.next(authorities);
            this._channelCount$.next(channels);
        });
    }
}
