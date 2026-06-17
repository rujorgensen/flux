import type { FluxAgentNetworkConnection, FluxNetworkChannel } from '@flux/shared/connection';
import type {
    TNetworkAuthorityCountAt,
    TNetworkId_S,
} from '@flux/shared/types';
import { Observable } from 'rxjs';

export const onConnectedAuthorityCount$$ = (
    networkId: TNetworkId_S,
    fluxAgentNetworkConnection: FluxAgentNetworkConnection,
): Observable<TNetworkAuthorityCountAt> => {
    return new Observable<TNetworkAuthorityCountAt>((subscriber) => {
        fluxAgentNetworkConnection.joinChannel(`networks-${networkId}-authority-count-update`)
            .then((fluxNetworkChannel: FluxNetworkChannel) => {
                const handler = (networkAuthorityCountAt: number) => {
                    subscriber.next({
                        count: networkAuthorityCountAt,
                        date: new Date(),
                    });
                };
                fluxNetworkChannel.onPublish<number>(handler);

                return () => {
                    console.warn('TODO: implement offPublish to stop listening to agent count updates when there are no subscribers');
                    // fluxNetworkChannel.offPublish(handler);
                };
            })
            .catch((err) => subscriber.error(err));
    });
};