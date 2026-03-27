/**
 * Emits network channel events to the authority.
 */

import type {
    FluxWebSocketConnection,
} from '@flux/shared/connection';
import {
    type TChannelName,
    AUTHORITY_ON_CREATE_CHANNEL,
    AUTHORITY_ON_EMPTY_CHANNEL,
} from '@flux/shared/types';
import { EventEmitter } from '@flux/shared/utils';

export class NetworkChannelEventEmitter<T extends {
    createChannel: TChannelName,
    emptyChannel: TChannelName,
}> extends EventEmitter<T> {
    private subscribedToCreates: boolean = false;
    private subscribedToEmpties: boolean = false;

    constructor(
        private readonly _fluxWebSocketConnection: FluxWebSocketConnection,
    ) {
        super();
    }

    /**
     * Subscribes to channel creation and removal events on the network.
     */
    public override on<K extends keyof T>(
        event: K,
        listener: (payload: T[K]) => void,
    ) {
        if (!this.subscribedToCreates && !this.subscribedToEmpties) {
            this._fluxWebSocketConnection.interceptPackageTypeMessages(
                AUTHORITY_ON_CREATE_CHANNEL,
                (
                    message: string,
                ): void => {
                    this.emit('createChannel', message as TChannelName);
                },
            );
            this._fluxWebSocketConnection.interceptPackageTypeMessages(
                AUTHORITY_ON_EMPTY_CHANNEL,
                (
                    messsage: string,
                ): void => {
                    this.emit('emptyChannel', messsage as TChannelName);
                },
            );
        }

        if (!this.subscribedToCreates && !this.subscribedToEmpties) {
            this._fluxWebSocketConnection.subscribeToChannelChanges();
        }

        if ((event === 'createChannel') && !this.subscribedToCreates) {
            this.subscribedToCreates = true;
        }

        if ((event === 'emptyChannel') && !this.subscribedToEmpties) {
            this.subscribedToEmpties = true;
        }

        // Call the original on method
        return super.on(event, listener);
    }
}