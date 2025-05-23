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
        public readonly channelName: TChannelName,
        private readonly _fluxWebSocketConnection: FluxWebSocketConnection,
    ) { }

    /**
     * Broadcasts a message to the channel.
     * 
     * @param { string } channelName
     * 
     * @returns { void }
     */
    public publish<T>(
        message: string | T,
    ): void {
        this._fluxWebSocketConnection
            .publish(
                this.channelName,
                message,
            );
    }

    /**
     * Listen to messages on this channel.
     * 
     * @param { TMessageCallback } fn - Callback function to handle messages
     * @param { boolean } emitLatestValue - Whether to emit the latest value immediately when subscribing
     *                                      If true, the server will send the latest message that was
     *                                      published to the channel immediately after subscription
     * 
     * @returns { void }
     */
    public onPublish<T>(
        fn: (message: string | T) => void,
        emitLatestValue: boolean = false,
    ): void {
        this._fluxWebSocketConnection
            .onPublish(
                this.channelName,
                (fn as any), // TODO
                emitLatestValue,
            );
    }

}