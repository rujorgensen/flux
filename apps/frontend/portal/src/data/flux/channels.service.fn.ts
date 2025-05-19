import type { FluxAgentNetworkConnection, FluxNetworkChannel } from '@flux/shared/connection';
import type {
    TNetworkAgentCountAt,
} from '@flux/shared/types';

export const onActiveChannelCount = async (
    fluxAgentNetworkConnection: FluxAgentNetworkConnection,
) => {
    const fluxNetworkChannel: FluxNetworkChannel = await fluxAgentNetworkConnection.joinChannel('active-channels');

    return (
        fn: (
            networkChannelCountAt: TNetworkAgentCountAt,
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