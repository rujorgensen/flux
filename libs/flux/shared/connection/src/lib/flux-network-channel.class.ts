/**
 * A connected channel.
 */

import type {
    TChannelName,
} from '@flux/shared/types';
import type {
    TMessageCallback,
} from '@flux/shared/ws';
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
    public publish(
        message: string,
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
     * @param { TMessageCallback } fn
     * 
     * @returns { void }
     */
    public onPublish(
        fn: TMessageCallback,
    ): void {
        this._fluxWebSocketConnection
            .onPublish(
                this.channelName,
                fn,
            );
    }
}