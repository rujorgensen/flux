/**
 * Collects data from any source (currently WS or WebRTC) 
 */

import type { TMessageCallback } from '@flux/shared/ws';
import type { FluxWebSocketConnection } from './flux-ws-connection';

export class FluxClientData {
    private readonly callbacks: Set<TMessageCallback> = new Set();
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
        cb: TMessageCallback,
    ): void {
        this.callbacks.add(cb);
    }
}