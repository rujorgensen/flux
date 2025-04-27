
/**
 * Reusable Flux connection.
 */
import {
    type FluxAgentNetworkConnection,
    FluxAgent,
} from '@persistica/flux-agent';

let fluxNetworkConnection: FluxAgentNetworkConnection | undefined;

const fluxAgent: FluxAgent = new FluxAgent();

export const getFluxNetworkConnection = async (
    identification: string,
    userEmail: string,
) => {
    if (fluxNetworkConnection) {
        return fluxNetworkConnection;
    }

    fluxNetworkConnection = await fluxAgent.connect(
        identification,
        userEmail,
    );

    return fluxNetworkConnection;
};