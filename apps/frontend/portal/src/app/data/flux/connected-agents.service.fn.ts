import type { FluxAgentNetworkConnection, FluxNetworkChannel } from '@flux/shared/connection';
import type {
    TNetworkAgentCountAt,
    TNetworkId_S,
} from '@flux/shared/types';
import { Observable } from 'rxjs';

export const onConnectedAgentCount$$ = (
    networkId: TNetworkId_S,
    fluxAgentNetworkConnection: FluxAgentNetworkConnection,
): Observable<TNetworkAgentCountAt> => {
    return new Observable<TNetworkAgentCountAt>((subscriber) => {
        fluxAgentNetworkConnection.joinChannel(`networks-${networkId}-agent-count-update`)
            .then((fluxNetworkChannel: FluxNetworkChannel) => {
                const handler = (networkAgentCountAt: number) => {
                    subscriber.next({
                        count: networkAgentCountAt,
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