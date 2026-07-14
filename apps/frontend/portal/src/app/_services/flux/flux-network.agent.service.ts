/**
 * Returns a flux agent connection to the provided network ID, if valid identification is provided.
 */
import { Injectable } from '@angular/core';
import {
    type FluxAgentNetworkConnection,
    FluxAgent,
} from '@persistica/flux-agent';
import {
    type Observable,
    filter,
    from,
    shareReplay,
    switchMap,
} from 'rxjs';
import { NetworksService } from '../networks.service';
import { resolveInternalMeshDomain } from './internal-mesh-domain.fn';
import type { INetwork_S } from '@flux/shared/features/networks';

@Injectable({
    providedIn: 'root',
})
export class FluxNetworkAgentService {

    public readonly networkFluxAgent$$: Observable<FluxAgentNetworkConnection>;

    constructor(
        networksService: NetworksService,
    ) {
        let agent: FluxAgent | undefined;

        this.networkFluxAgent$$ = networksService
            .selectedNetwork$
            .pipe(
                filter((network): network is INetwork_S => network !== null),
                switchMap(() => {
                    if (!agent) {
                        agent = new FluxAgent(
                            'internal-network',
                            {
                                domain: resolveInternalMeshDomain(
                                    typeof window !== 'undefined'
                                        ? window.location
                                        : undefined,
                                ),
                            });
                    }

                    return from(agent.connect('code-to-access-network'));
                }),
                shareReplay(1),
            );
    }
}
