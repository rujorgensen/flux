/**
 * A connected channel.
 */

import type {
    TChannelName,
} from '@flux/shared/types';
import type {
    FluxWebSocketConnection,
} from './flux-ws-connection';

export class FluxNetworkChannel {

    constructor(
        private readonly _channelName: TChannelName,
        private readonly _fluxWebSocketConnection: FluxWebSocketConnection,
    ) {}

    /**
     * Broadcasts a message to the channel.
     */
    public publish<T>(
        message: string | T,
    ): void {
        this._fluxWebSocketConnection
            .publish(
                this._channelName,
                message,
            );
    }

    /**
     * Listen to messages on this channel.
     */
    public onPublish<T>(
        fn: (message: T) => void,
    ): void {
        this._fluxWebSocketConnection
            .onPublish(
                this._channelName,
                (fn as any), // TODO
            );
    }

}