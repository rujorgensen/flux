import { Injectable } from '@angular/core';
import type { FluxAgentNetworkConnection } from '@persistica/flux-agent';
import { FluxAgent } from '@persistica/flux-agent';

@Injectable({
    providedIn: 'root',
})
export class FluxStatusAgentService extends FluxAgent {

    constructor(

    ) {
        super(
            'rAnD0M-network-id',
            {
                domain: 'http://localhost:5101',
            },
        );
    }

    public override connect(

    ): Promise<FluxAgentNetworkConnection> {
        return super
            .connect('code-to-access-network');
    }
}
