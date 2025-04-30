/**
 * This is the class exposed to the user. It represents an authority connection to the network
 */
import {
    type FluxWebSocketConnection,
    NetworkChannelEventEmitter,
} from '@flux/shared/connection';
import type {
    TChannelName,
} from '@flux/shared/types';

export class FluxAuthorityNetworkConnection {

    public readonly networkChannelEventEmitter: NetworkChannelEventEmitter<{
        createChannel: TChannelName,
        emptyChannel: TChannelName,
    }>;

    constructor(
        protected readonly _fluxWebSocketConnection: FluxWebSocketConnection,
    ) {
        this.networkChannelEventEmitter = new NetworkChannelEventEmitter(
            this._fluxWebSocketConnection,
        );
    }
}
