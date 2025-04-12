/**
 * A connected channel.
 */

import { TCallback2, TChannelTopic } from "@flux/shared";
import { FluxWebSocketConnection } from "./connector/flux-ws-connection";

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
        console.log(`Broadcasting on channel "${this._channelName}"`, message);

        this._fluxWebSocketConnection
            .publish(
                this._channelName,
                message,
            );
    }

    /**
     * Listen to messages on this channel.
     * 
     * @param { TCallback2 } fn
     * 
     * @returns { void }
     */
    public onPublish(
        fn: TCallback2,
    ): void {
        this._fluxWebSocketConnection
            .onPublish(
                this._channelName,
                fn,
            );
    }
}