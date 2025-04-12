/**
 * Low-level websocket client.
 */

import {
    RPCServer,
} from '@flux/shared';
// import { decrypt } from '../../utils/obscuring/decrypt.utils';
// import { encrypt } from '../../utils/obscuring/encyprt.utils';

type WebSocketEvent = 'open' | 'message' | 'close' | 'connecting' | 'error';

type WebSocketClientOptions = {
    url: string;
    autoReconnect?: boolean;
    reconnectDelay?: number; // Does you backoff though
    retries?: number; // Will try forever
    heartbeatInterval?: number;
    connectionTimeout?: number;
};

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
    private ws: WebSocket | undefined;
    private isOpen: boolean = false; // Is the connection open

    constructor(
        options: WebSocketClientOptions,
    ) {
        super();

        this.options = {
            autoReconnect: true,
            reconnectDelay: 1_000,
            heartbeatInterval: 60_000,
            connectionTimeout: 5_000,
            ...options
        };
    }

    public connect(
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            this.emit('connecting', this.reconnectAttempts);
            this.ws = new WebSocket(
                this.options.url,
            );

            const timeout = setTimeout(() => {
                if (this.ws?.readyState !== WebSocket.OPEN) {
                    this.ws?.close();

                    reject(new Error('Connection timeout'));
                }
            }, this.options.connectionTimeout);

            this.ws.onopen = () => {
                clearTimeout(timeout);
                this.reconnectAttempts = 0;
                this.isOpen = true;
                this.emit('open');

                resolve(void 0);
            };

            this.ws.onmessage = (event) => {
                this.emit('message', event.data);
            };

            this.ws.onclose = () => {
                // Cancel timeout
                clearTimeout(timeout);

                // Only emit, if the connection was open before
                if (this.isOpen) {
                    this.emit('close');
                    this.isOpen = false;
                }

                if (
                    this.options.autoReconnect &&
                    (this.reconnectAttempts < this.options.retries!)
                ) {
                    setTimeout(() => {
                        this.reconnectAttempts++;
                        this.connect();
                    }, Math.min(this.options.reconnectDelay ?? Number.POSITIVE_INFINITY, this.options.reconnectDelay! * (this.reconnectAttempts || 1)));
                } else if (this.options.autoReconnect) {
                    this.emit('error', new Error('Connection failed: retries exhausted'));
                }
            };

            this.ws.onerror = (event) => {

                // Don't log, this is to be expected if the server is unavailable
                if ((<any>event).message.includes('Failed to connect')) {
                    // console.log('❌ Error: Failed to connect');
                } else {
                    console.log('❌ Error', (<any>event).message);
                }
            };
        });
    }

    private emit(
        event: WebSocketEvent,
        data?: any,
    ) {
        for (const listener of this.eventListeners[event]) {
            listener(data);
        }
    }

    public on(
        event: WebSocketEvent,
        listener: (
            ...args: any
        ) => void,
    ) {
        this.eventListeners[event].push(listener);

        return this;
    }

    public clearEventSubscribers(

    ): void {
        this.eventListeners.open = [];
        this.eventListeners.message = [];
        this.eventListeners.close = [];
        this.eventListeners.connecting = [];
        this.eventListeners.error = [];
    }

    public send(
        message: string,
    ) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        } else {
            console.warn('WebSocket not open.');
        }
    }

    public close(

    ) {
        this.options.autoReconnect = false;
        this.ws?.close();
    }
}

// Defines possible RPC methods (should possibly be free)

export class FluxWebSocketClientConnection extends WebSocketClient<
    'authorize' |
    'authorizeNetworkChannel' |
    'createOffer' |
    'acceptOffer' |
    'acceptAnswer'|
    'answerAcceptedByInitiator'
> {
    constructor(
        private readonly options_: WebSocketClientOptions,
        //  private readonly authorize: TCallback,
    ) {
        super(options_);

        //  this.registerMethod('authorize', authorize);
    }
}