/**
 * Low-level websocket client.
 */

import {
    HEARTBEAT_PING,
    HEARTBEAT_PONG,
    type TFluxWebSocketClientMessage,
} from '@flux/shared/types';
import {
    RPCServer,
} from '@flux/shared/ws';
// import { decrypt } from '../../utils/obscuring/decrypt.utils';
// import { encrypt } from '../../utils/obscuring/encyprt.utils';

type WebSocketEvent = 'open' | 'message' | 'close' | 'connecting' | 'error';

type WebSocketClientOptions = {
    url: string;
    /**
     * Mints the URL to dial for a *reconnect*.
     *
     * The mesh carries a short-lived upgrade token in the query string, so
     * re-dialling the URL this client was constructed with is only correct until
     * that token expires (#497). After that every attempt is rejected with
     * 'jwt expired' and the retry loop can never recover — which is how a network
     * left an Authority-less mesh behind after a single blip. Consumers that
     * authenticate pass a resolver here that re-runs the auth handshake.
     */
    resolveUrl?: () => Promise<string>;
    autoReconnect?: boolean;
    reconnectDelay?: number; // Base delay; doubles per attempt up to `maxReconnectDelay`
    maxReconnectDelay?: number; // Ceiling for the backoff
    retries?: number; // Undefined; will try forever
    heartbeatInterval?: number;
    connectionTimeout?: number;
};

export const RECONNECTION_DELAY_ON_KICK_MS: number = 1_800_000; // 30 minutes

export class WebSocketClient<T extends string> extends RPCServer<T> {

    private readonly options: WebSocketClientOptions;
    private readonly eventListeners: Record<WebSocketEvent, ((data?: any) => void)[]> = {
        open: [],
        message: [],
        close: [],
        error: [],
        connecting: [],
    };
    private reconnectAttempts = 0;
    private url: string; // The URL of the *next* dial; re-minted per reconnect when a resolver is given
    private ws: WebSocket | undefined;
    private isOpen: boolean = false; // Is the connection open

    // * Heartbeat (see #488): a half-open socket (1006, no close frame) never fires
    // `onclose`, so the client pings on an interval and treats a missed pong as the
    // disconnect signal itself — it cannot rely on `ws.close()` producing an event.
    private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    private awaitingPong: boolean = false;
    private pongSeen: boolean = false; // The server proved it answers pings on this connection
    private closeHandled: boolean = false; // Guards against running the close path twice (heartbeat + late onclose)

    constructor(
        options: WebSocketClientOptions,
    ) {
        super();

        this.options = {
            autoReconnect: true,
            reconnectDelay: 1_000,
            maxReconnectDelay: 30_000,
            heartbeatInterval: 60_000,
            connectionTimeout: 5_000,
            ...options
        };
        this.url = this.options.url;
    }

    /**
     * Opens the WebSocket connection.
     */
    public async connect(
    ): Promise<void> {
        this.closeHandled = false;
        this.emit('connecting', this.reconnectAttempts);

        let url: string;
        try {
            url = await this.resolveUrl();
        } catch (error) {
            // No socket exists on this path, so no `onclose` will ever arrive to
            // drive the retry loop — schedule the next attempt here, or a mesh that
            // happens to be down while we re-authenticate ends the loop silently.
            this.scheduleReconnect(false);

            throw error instanceof Error ? error : new Error(String(error));
        }

        return new Promise((resolve, reject) => {
            // Kept in a local so every handler can ignore events from a superseded
            // socket — a heartbeat-forced close may fire this socket's `onclose`
            // long after a reconnect has already replaced it.
            const socket = new WebSocket(
                url,
            );
            this.ws = socket;

            const timeout = setTimeout(() => {
                if (socket.readyState !== WebSocket.OPEN) {
                    socket.close();

                    reject(new Error('Connection timeout'));
                }
            }, this.options.connectionTimeout);

            socket.onopen = () => {
                clearTimeout(timeout);

                if (this.ws !== socket) {
                    return;
                }

                this.reconnectAttempts = 0;
                this.isOpen = true;
                this.startHeartbeat();
                this.emit('open');

                resolve();
            };

            socket.onmessage = (event) => {
                if (this.ws !== socket) {
                    return;
                }

                // Swallow heartbeat pongs — protocol-internal, never for listeners
                if (event.data === HEARTBEAT_PONG) {
                    this.awaitingPong = false;
                    this.pongSeen = true;

                    return;
                }

                this.emit('message', event.data);
            };

            socket.onclose = (closeEvent) => {
                // Cancel timeout
                clearTimeout(timeout);

                if (this.ws !== socket) {
                    return;
                }

                this.handleConnectionClosed(closeEvent.reason === 'Kicked by process');
            };

            socket.onerror = (event) => {

                // Don't log, this is to be expected if the server is unavailable
                if ((<any>event)?.message?.includes('Failed to connect')) {
                    // console.log('❌ Error: Failed to connect');
                } else {
                    console.log('❌ Error', (<any>event).message);
                }
            };
        });
    }

    /**
     * The single close path, reachable from `onclose` AND from a missed heartbeat
     * pong (where `onclose` never fires): emit `close` once, then schedule the
     * reconnect per the retry policy.
     */
    private handleConnectionClosed(
        wasKicked: boolean,
    ): void {
        if (this.closeHandled) {
            return;
        }
        this.closeHandled = true;

        this.stopHeartbeat();

        // Only emit, if the connection was open before
        if (this.isOpen) {
            this.emit(
                'close',
                wasKicked ? 'kicked' : undefined,
            );
            this.isOpen = false;
        }

        this.scheduleReconnect(wasKicked);
    }

    /**
     * The URL for the attempt about to be made. The first dial uses what the
     * consumer handed us; every reconnect re-mints it, because the token it
     * carries has a shorter life than the connection it authorizes (#497).
     */
    private async resolveUrl(
    ): Promise<string> {
        if ((this.reconnectAttempts === 0) || !this.options.resolveUrl) {
            return this.url;
        }

        this.url = await this.options.resolveUrl();

        return this.url;
    }

    /**
     * Schedules the next connection attempt per the retry policy.
     */
    private scheduleReconnect(
        wasKicked: boolean,
    ): void {
        if (
            this.options.autoReconnect &&
            ((this.options.retries === undefined) || (this.reconnectAttempts < this.options.retries))
        ) {
            const delay: number = wasKicked ?
                RECONNECTION_DELAY_ON_KICK_MS
                :
                Math.min(
                    this.options.maxReconnectDelay ?? Number.POSITIVE_INFINITY,
                    (this.options.reconnectDelay ?? 0) * (2 ** this.reconnectAttempts),
                );

            setTimeout(() => {
                this.reconnectAttempts++;

                // * `connect()` rejects with `Connection timeout` when the socket never
                // opens (see the timeout above). This promise is created inside a timer
                // the consumer does not own, so no caller-side `.catch()` can ever reach
                // it — leaving it unhandled terminates the process under Bun. The retry
                // loop continues regardless: the timeout path closes the socket, which
                // re-enters `handleConnectionClosed` and schedules the next attempt.
                this.connect()
                    .catch((error: unknown) => {
                        this.emit(
                            'error',
                            error instanceof Error ? error : new Error(String(error)),
                        );
                    });
            }, delay);
        } else if (this.options.autoReconnect) {
            this.emit('error', new Error('Connection failed: retries exhausted'));
        }
    }

    /**
     * Starts the keepalive: every `heartbeatInterval` send an app-level ping (the
     * browser/Bun `WebSocket` exposes no ping frame) and require the mesh's pong
     * before the next tick. A missed pong means the socket is dead — force the
     * close path directly, since a half-open socket produces no `onclose`.
     */
    private startHeartbeat(
    ): void {
        this.stopHeartbeat();
        this.pongSeen = false;

        const interval: number | undefined = this.options.heartbeatInterval;
        if (interval === undefined || interval <= 0) {
            return;
        }

        this.heartbeatTimer = setInterval(() => {
            if (this.awaitingPong) {
                // A server that has never ponged is an older mesh without heartbeat
                // support — disable detection for this connection instead of killing
                // a healthy socket (keeps either deploy order safe).
                if (!this.pongSeen) {
                    console.warn('💛 Server does not answer heartbeat pings — dead-connection detection disabled for this connection');

                    this.stopHeartbeat();

                    return;
                }

                console.warn(`💔 No heartbeat pong within ${interval}ms — treating the connection as dead`);

                this.stopHeartbeat();
                try {
                    this.ws?.close(4000, 'Heartbeat timeout');
                } catch {
                    // The socket may already be unusable — the manual close path below is the real signal
                }
                this.handleConnectionClosed(false);

                return;
            }

            if (this.ws?.readyState === WebSocket.OPEN) {
                this.awaitingPong = true;
                this.ws.send(HEARTBEAT_PING);
            }
        }, interval);
    }

    private stopHeartbeat(
    ): void {
        if (this.heartbeatTimer !== undefined) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
        this.awaitingPong = false;
    }

    /**
     * Emits a WebSocket event to all registered listeners.
     */
    private emit(
        event: WebSocketEvent,
        data?: any,
    ) {
        for (const listener of this.eventListeners[event]) {
            listener(data);
        }
    }

    /**
     * Registers an event listener.
     */
    public on(
        event: WebSocketEvent,
        listener: (
            ...args: any
        ) => void,
    ) {
        this.eventListeners[event].push(listener);

        return this;
    }

    /**
     * Clears all subscribers.
     */
    public clearEventSubscribers(

    ): void {
        this.eventListeners.open = [];
        this.eventListeners.message = [];
        this.eventListeners.close = [];
        this.eventListeners.connecting = [];
        this.eventListeners.error = [];
    }

    /**
     * Sends a message over the WebSocket connection.
     */
    public send(
        message: TFluxWebSocketClientMessage,
    ): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        } else {
            console.warn('WebSocket not open.');
        }
    }

    /**
     * Closes the WebSocket connection and prevents auto-reconnect.
     */
    public close(

    ) {
        this.options.autoReconnect = false;
        this.stopHeartbeat();
        this.ws?.close();
        this.clearEventSubscribers();
    }
}

// Defines possible RPC methods (should possibly be free)
export class FluxWebSocketClientConnection extends WebSocketClient<
    // ⬇️ For authorities only ⬇️
    'authorizeAgentConnection' |
    'authorizeChannelAccess' |

    // ⬇️ For agents only ⬇️
    'createOffer' |
    'acceptOffer' |
    'acceptAnswer' |
    'answerAcceptedByInitiator'
> {}
