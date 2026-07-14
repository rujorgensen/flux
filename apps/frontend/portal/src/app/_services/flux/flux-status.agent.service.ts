import { Injectable } from '@angular/core';
import {
    type FluxAgentNetworkConnection,
    FluxAgent,
} from '@persistica/flux-agent';
import { resolveInternalMeshDomain } from './internal-mesh-domain.fn';

@Injectable({
    providedIn: 'root',
})
export class FluxStatusAgentService extends FluxAgent {

    constructor(

    ) {
        // ! TODO This is an internally used live connection for getting 
        // ! Redis status data. Validate the user (check if they're flux admins) to check access rights.
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

    public override connect(

    ): Promise<FluxAgentNetworkConnection> {
        return super
            .connect('code-to-access-network');
    }
}
