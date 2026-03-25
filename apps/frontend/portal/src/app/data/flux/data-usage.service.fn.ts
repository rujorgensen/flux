import type { FluxAgentNetworkConnection, FluxNetworkChannel } from '@flux/shared/connection';

export const onDataUsageUpdate = async (
    fluxAgentNetworkConnection: FluxAgentNetworkConnection,
) => {
    const fluxNetworkChannel: FluxNetworkChannel = await fluxAgentNetworkConnection.joinChannel('data-usage');

    return (
        fn: (
            networkAuthorityCountAt: number,
        ) => void,
    ): void => {
        fluxNetworkChannel
            .onPublish<number>((
                networkAuthorityCountAt: number,
            ) => {
                fn(networkAuthorityCountAt);
            });
    };
};
