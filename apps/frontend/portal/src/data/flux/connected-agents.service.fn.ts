import type { FluxAgentNetworkConnection, FluxNetworkChannel } from '@flux/shared/connection';
import type {
    TNetworkAgentCountAt,
} from '@flux/shared/types';

export const onConnectedAgentCount = async (
    fluxAgentNetworkConnection: FluxAgentNetworkConnection,
) => {
    const fluxNetworkChannel: FluxNetworkChannel = await fluxAgentNetworkConnection.joinChannel('connected-agents');

    return (
        fn: (
            networkAgentCountAt: TNetworkAgentCountAt,
        ) => void,
    ): void => {
        fluxNetworkChannel
            .onPublish((
                message: string,
            ) => {
                const networkAgentCountAt: TNetworkAgentCountAt = JSON.parse(message);
                fn({
                    ...networkAgentCountAt,
                    date: new Date(networkAgentCountAt.date),
                });
            });
    };
};