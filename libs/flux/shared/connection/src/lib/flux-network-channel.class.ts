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
    private _latestValue: unknown;

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
        this._latestValue = message;
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
    public onPublish<T>(
        fn: (message: string | T) => void,
    ): void {
        this._fluxWebSocketConnection
            .onPublish(
                this.channelName,
                (message: string | T) => {
                    this._latestValue = message;
                    fn(message);
                }
            );
    }

    /**
     * Get the latest value published on this channel.
     * 
     * @returns { unknown } The latest value published on this channel or undefined if no message has been published
     */
    public getLatestValue<T>(): T | undefined {
        return this._latestValue as T | undefined;
    }
}