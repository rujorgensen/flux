/**
 * Collects data from any source (currently WS or WebRTC) 
 */

import { TCallback2 } from '@flux/shared';
import { FluxWebSocketConnection } from './flux-ws-connection';

export class FluxClientData {
    private readonly callbacks: Set<TCallback2> = new Set();
    private fluxWebSocketConnection: FluxWebSocketConnection | undefined;

    public updateWsConnection(
        fluxWebSocketConnection: FluxWebSocketConnection,
    ): void {
        this.fluxWebSocketConnection = fluxWebSocketConnection;

        // Subscribe to messages
        for (const cb of this.callbacks) {
            this.fluxWebSocketConnection.onMessage(cb);
        }
    }

    public onMessage(
        cb: TCallback2,
    ): void {
        this.callbacks.add(cb);
    }
}