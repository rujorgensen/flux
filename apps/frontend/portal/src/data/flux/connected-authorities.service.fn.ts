import type { FluxAgentNetworkConnection, FluxNetworkChannel } from '@flux/shared/connection';
import type {
    TNetworkAuthorityCountAt,
} from '@flux/shared/types';

export const onConnectedAuthoritiesCount = async (
    fluxAgentNetworkConnection: FluxAgentNetworkConnection,
) => {
    const fluxNetworkChannel: FluxNetworkChannel = await fluxAgentNetworkConnection.joinChannel('connected-authorities');

    return (
        fn: (
            networkAuthorityCountAt: TNetworkAuthorityCountAt,
        ) => void,
    ): void => {
        fluxNetworkChannel
            .onPublish<TNetworkAuthorityCountAt>((
                networkAuthorityCountAt: TNetworkAuthorityCountAt,
            ) => {
                fn({
                    ...networkAuthorityCountAt,
                    date: new Date(networkAuthorityCountAt.date),
                });
            });
    };
};