/**
 * A connected channel.
 */

import type {
    TChannelTopic,
} from '@flux/shared/types';
import type {
    TMessageCallback,
} from '@flux/shared/ws';
import type {
    FluxWebSocketConnection,
} from './flux-ws-connection';

export class FluxNetworkChannel {

    constructor(
        private readonly _fluxWebSocketConnection: FluxWebSocketConnection,
        private readonly _channelName: TChannelTopic,
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
                this._channelName,
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
                this._channelName,
                fn,
            );
    }
}