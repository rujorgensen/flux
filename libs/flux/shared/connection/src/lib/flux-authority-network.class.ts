/**
 * This is the class exposed to the user. It represents an authority connection to the network
 */
// import type {
//     TChannelName,
// } from '@flux/shared/types';
import type { FluxWebSocketConnection } from './flux-ws-connection';

export class FluxAuthorityNetworkConnection {

    constructor(
        protected readonly _fluxWebSocketConnection: FluxWebSocketConnection,
    ) { }

    // public readonly networkChannelEventEmitter: NetworkChannelEventEmitter<{
    //     createChannel: TChannelName,
    //     emptyChannel: TChannelName,
    // }> = new NetworkChannelEventEmitter(
    //     this._fluxWebSocketConnection,
    // );
}
