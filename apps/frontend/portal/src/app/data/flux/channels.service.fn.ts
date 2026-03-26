import type { FluxAgentNetworkConnection, FluxNetworkChannel } from '@flux/shared/connection';
import type {
    TNetworkChannelCountAt,
} from '@flux/shared/types';

export const onActiveChannelCount = async (
    fluxAgentNetworkConnection: FluxAgentNetworkConnection,
) => {
    const fluxNetworkChannel: FluxNetworkChannel = await fluxAgentNetworkConnection.joinChannel('active-channels');

    return (
        fn: (
            networkChannelCountAt: TNetworkChannelCountAt,
        ) => void,
    ): void => {
        fluxNetworkChannel
            .onPublish<TNetworkChannelCountAt>((
                networkAgentCountAt: TNetworkChannelCountAt,
            ) => {
                fn({
                    ...networkAgentCountAt,
                    date: new Date(networkAgentCountAt.date),
                });
            });
    };
};
