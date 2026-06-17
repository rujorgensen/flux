import { Injectable } from '@angular/core';
import {
    type Observable,
    filter,
    from,
    map,
    of,
    shareReplay,
    startWith,
    switchMap,
} from 'rxjs';
import { api } from '../api/api';
import { NetworksService } from '../networks.service';
import type { TNetworkChannelCountAt } from '@flux/shared/types';
import { FluxAgentNetworkConnection } from '@persistica/flux-agent';
import { FluxNetworkAgentService } from '../flux/flux-network.agent.service';
import { onConnectedAgentCount$$ } from '$lib/app/data/flux/connected-agents.service.fn';
import { onConnectedAuthorityCount$$ } from '$lib/app/data/flux/connected-authorities.service.fn';
import { onChannelUpdate$$ } from '$lib/app/data/flux/channel-update.service.fn';

@Injectable({
    providedIn: 'root',
})
export class NetworkStatsService {
    public readonly agentCount$$: Observable<TNetworkChannelCountAt>;
    public readonly authorityCount$$: Observable<TNetworkChannelCountAt>;
    public readonly channelCount$$: Observable<TNetworkChannelCountAt>;
    public readonly totalDataUsage$$: Observable<number>;

    constructor(
        private readonly networksService: NetworksService,
        private readonly fluxNetworkAgentService: FluxNetworkAgentService,
    ) {
        const initialCounts$ = this.networksService
            .selectedNetwork$
            .pipe(
                filter((network) => !!network),
                switchMap((network) => {
                    const networkId = network.id;

                    return from(api
                        .api
                        .networks({ networkId })['connection-status']
                        .get())
                        .pipe(
                            map((response) => ({
                                networkId,
                                agents: response.data?.agents ?? null,
                                authorities: response.data?.authorities ?? null,
                                channels: response.data?.channels ?? null,
                            })),
                        )
                        ;
                }),
                shareReplay(1)
            );

        this.agentCount$$ = initialCounts$
            .pipe(
                switchMap((initialCounts) =>
                    this.fluxNetworkAgentService
                        .networkFluxAgent$$
                        .pipe(
                            switchMap((fluxAgentNetworkConnection: FluxAgentNetworkConnection) =>
                                onConnectedAgentCount$$(
                                    initialCounts.networkId,
                                    fluxAgentNetworkConnection,
                                ),
                            ),
                            startWith({
                                count: initialCounts.agents ?? 0,
                                date: new Date(),
                            }),
                        ),
                ),
            );

        this.authorityCount$$ = initialCounts$
            .pipe(
                switchMap((initialCounts) =>
                    this.fluxNetworkAgentService
                        .networkFluxAgent$$
                        .pipe(
                            switchMap((fluxAgentNetworkConnection: FluxAgentNetworkConnection) =>
                                onConnectedAuthorityCount$$(
                                    initialCounts.networkId,
                                    fluxAgentNetworkConnection,
                                ),
                            ),
                            startWith({
                                count: initialCounts.authorities ?? 0,
                                date: new Date(),
                            }),
                        ),
                ),
            );

        this.channelCount$$ = initialCounts$
            .pipe(
                switchMap((initialCounts) =>
                    this.fluxNetworkAgentService
                        .networkFluxAgent$$
                        .pipe(
                            switchMap((fluxAgentNetworkConnection: FluxAgentNetworkConnection) =>
                                onChannelUpdate$$(
                                    initialCounts.networkId,
                                    fluxAgentNetworkConnection,
                                ),
                            ),

                            startWith({
                                count: initialCounts.channels ?? 0,
                                date: new Date(),
                            }),
                        ),
                ),
            );

        this.totalDataUsage$$ = initialCounts$
            .pipe(
                switchMap(() => {
                    return of(-999);
                }),
            );
    }
}
