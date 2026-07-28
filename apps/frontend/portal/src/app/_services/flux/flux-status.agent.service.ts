import { Injectable } from '@angular/core';
import {
    type FluxAgentNetworkConnection,
    FluxAgent,
} from '@persistica/flux-agent';
import { resolveInternalMeshDomain } from './internal-mesh-domain.fn';
import { apiBaseUrl } from '../api/api-base';

@Injectable({
    providedIn: 'root',
})
export class FluxStatusAgentService extends FluxAgent {

    constructor(

    ) {
        super(
            'internal-network',
            {
                domain: resolveInternalMeshDomain(
                    typeof window !== 'undefined'
                        ? window.location
                        : undefined,
                ),
            },
        );
    }

    public override async connect(

    ): Promise<FluxAgentNetworkConnection> {
        // The claim carries the session's `isFluxAdmin`, which gates the protected
        // channels. It is minted server-side, so the browser cannot grant itself access.
        const response: Response = await fetch(
            `${apiBaseUrl}/api/internal-mesh/claim`,
            {
                credentials: 'include',
            },
        );

        if (!response.ok) {
            throw new Error(`Could not obtain an internal mesh claim (${response.status}).`);
        }

        const { claim } = await response.json() as { claim: string; };

        return super
            .connect(claim);
    }
}
