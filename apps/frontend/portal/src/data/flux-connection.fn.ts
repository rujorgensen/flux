
/**
 * Reusable Flux connection.
 */
import type { FluxAgentNetworkConnection } from '@flux/shared/connection';
import type { TNetworkId_S } from '@flux/shared/types';
import {
    FluxAgent,
} from '@persistica/flux-agent';

let fluxNetworkConnection: FluxAgentNetworkConnection | undefined;

export const getFluxNetworkConnection = async (
    networkId: TNetworkId_S,
    identification: string,
    userEmail: string,
): Promise<FluxAgentNetworkConnection> => {
    if (fluxNetworkConnection) {
        return fluxNetworkConnection;
    }

    const fluxAgent: FluxAgent = new FluxAgent(networkId);
    fluxNetworkConnection = await fluxAgent.connect(
        identification,
        userEmail,
    );

    return fluxNetworkConnection;
};