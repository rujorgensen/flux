/**
 * This is the class exposed to the user. It represents an authority connection to the network
 */
import {
    type FluxWebSocketConnection,
    NetworkChannelEventEmitter,
} from '@flux/shared/connection';
import type {
    TAddress,
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

    /**
     * Removes an agent from the network.
     * 
     * @param { TAddress } id - The ID of the agent to disconnect
     */
    public disconnectAgent(
        id: TAddress,
    ): void {
        this._fluxWebSocketConnection
            .disconnectAgent(id);
    }
}
