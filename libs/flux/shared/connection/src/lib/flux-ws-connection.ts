/**
 * A WS connection to Flux, no validation yet.
 */

import {
    type TChannelName,
    type TAgentOwnUId,
    type TAuthorizeCallback,
    type TAddress,
    CONNECT_TO_CLIENT,
    RPC_REQUEST,
    RPC_RESPONSE,
    NETWORK_CHANNEL_PUBLISH,
    validateChannelNameOrThrow,
    ON_NETWORK_CHANNEL_PUBLISH,
    AUTHORITY_CHANNEL_SUBSCRIBE,
    AUTHORITY_DISCONNECT_AGENT,
    ERROR,
    isClientId,
} from '@flux/shared/types';
import {
    type RPCRequest,
    type RPCResponse,
    type TMessageCallback,
    FluxWebSocketClientConnection,
} from '@flux/shared/ws';
import { FluxAgentNetworkConnection } from './agent/flux-agent-network.class';
import type { TChannnelAuthCallback } from '../../../../../../packages/flux/agent/src/lib/channel/channel.type';
import type { StateManager } from '@flux/shared/utils';
import { FluxNetworkChannel } from './flux-network-channel.class';
import { PicoLogger } from '@utils/pico-logger';
import { RECONNECTION_DELAY_ON_KICK_MS } from '../../../ws/src/lib/ws-client';
import { ChannelStateManager } from './channel-state-manager';

interface IOptions {
    domain: string; // Override the domain for self hosted Flux instances. Should include protocol, e.g. "https://my-flux-instance.com"
    secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
    retries?: number; // Number of times to retry a failed message
}

/**
 * Creates a WebSocket connection to the Flux platform.
 *
 * `mintTicket` is deliberately required rather than optional: the ticket handed
 * in as `ticket` outlives its own validity (the mesh signs it for 15 minutes),
 * so a caller that cannot re-mint one has a connection that dies permanently at
 * the first disconnect after expiry. An optional parameter would let that
 * compile silently — see #497.
 */
export const createWSConnection = (
    id: string,
    ticket: string,
    mintTicket: () => Promise<string>,
    stateManager: StateManager,
    options: {
        domain: string,
        secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
        retries?: number; // Number of times to retry a failed message
    },
): FluxWebSocketConnection => {
    return new FluxWebSocketConnection(
        id,
        stateManager,
        ticket,
        mintTicket,
        {
            domain: options.domain,
            secretKey: options.secretKey,
            retries: options.retries,
        },
    );
};

export class FluxWebSocketConnection {
    // ****************************************************************************
    // *** State
    // ****************************************************************************

    private readonly socket: FluxWebSocketClientConnection;
    private readonly callbacks: Set<TMessageCallback> = new Set();

    private readonly channelCallbacks: Map<TChannelName, Set<TMessageCallback>> = new Map();

    // Handles messages before the rest of the logic. Will not continue if there are interceptors.
    private readonly packageTypeInterceptorCallbacks: Map<string, Set<TMessageCallback>> = new Map();

    private webSocketClient: FluxWebSocketClientConnection | undefined;
    private connectPromise: Promise<FluxWebSocketClientConnection> | undefined;
    private connectPromiseResolver: ((socket: FluxWebSocketClientConnection) => void) | undefined;

    private readonly channelStateManager: ChannelStateManager = new ChannelStateManager();

    // ****************************************************************************
    // *** Reused socket callbacks
    // ****************************************************************************

    // A reconnect needs no re-registration hook: it dials with a freshly minted
    // ticket, so the mesh registers the Authority (or Agent) again on `open`, and
    // the RPC methods live on this same socket instance across reconnects. The
    // hook that used to run here re-ran the whole connect flow, leaving the
    // previous socket open — one extra live registration per reconnect (#497).
    private readonly readyInterceptor: TMessageCallback = () => {
        this.resolveConnectedSocket();
    };
    private readonly socketMessageHandler: TMessageCallback = this.handleMessage.bind(this);
    private readonly socketCloseHandler = (reason?: 'kicked'): void => this.handleSocketClose(reason);
    private readonly socketConnectingHandler = (retryAttempt: number): void => this.handleSocketConnecting(retryAttempt);
    private readonly socketErrorHandler = (error: Error): void => this.handleSocketError(error);

    constructor(
        private readonly fluxInstanceId: string,
        private readonly stateManager: StateManager,
        token: string,
        private readonly mintTicket: () => Promise<string>,
        private readonly options: IOptions,
    ) {
        this.options = {
            domain: this.options.domain,
            secretKey: this.options.secretKey,
            retries: this.options.retries ?? 10_000,
        };

        // 1. Connect to websocket
        this.socket = new FluxWebSocketClientConnection(
            {
                url: this.buildUrl(token),
                autoReconnect: true,
                reconnectDelay: 2_000,
                retries: this.options.retries,
                // The mesh signs the upgrade ticket for 15 minutes, so a reconnect
                // after that must carry a new one — re-dialling the original URL is
                // rejected with 'jwt expired' every time, and the network is left
                // without an Authority until the process is restarted (#497).
                resolveUrl: async () => this.buildUrl(await this.mintTicket()),
            },
        );

        this.interceptPackageTypeMessages('isReady', this.readyInterceptor);
    }

    /**
     * The mesh WebSocket URL carrying the given upgrade ticket.
     */
    private buildUrl(
        ticket: string,
    ): string {
        const url = new URL(this.options.domain);

        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.searchParams.set('token', ticket);

        return url.toString();
    }

    /**
     * Intercepts messages of a given package type.
     */
    public interceptPackageTypeMessages(
        packageType: string,
        fn: TMessageCallback,
    ): void {
        const existingInterceptors: Set<TMessageCallback> | undefined = this.packageTypeInterceptorCallbacks.get(packageType);

        if (existingInterceptors) {
            existingInterceptors.add(fn);
        } else {
            this.packageTypeInterceptorCallbacks.set(packageType, new Set([fn]));
        }
    }

    /**
     * Removes a package type interceptor.
     */
    public removePackageTypeInterceptor(
        packageType: string,
        fn: TMessageCallback,
    ): void {

        const existingInterceptors: Set<TMessageCallback> | undefined = this.packageTypeInterceptorCallbacks.get(packageType);

        if (existingInterceptors) {
            existingInterceptors.delete(fn);
        } else {
            console.warn(`No interceptors found for package type "${packageType}"`);
        }

        if (existingInterceptors && existingInterceptors.size === 0) {
            this.packageTypeInterceptorCallbacks.delete(packageType);
        }
    }

    /**
     * Connect to the Flux platform.
     */
    public async connect(

    ): Promise<FluxWebSocketClientConnection> {
        if (this.webSocketClient) {
            return Promise.resolve(this.webSocketClient);
        }

        if (this.connectPromise) {
            return this.connectPromise;
        }

        this.connectPromise = new Promise((resolve) => {
            this.connectPromiseResolver = resolve;
        });

        this.socket.clearEventSubscribers();

        this.socket
            .on('message', this.socketMessageHandler)
            .on('close', this.socketCloseHandler)
            .on('connecting', this.socketConnectingHandler)
            .on('error', this.socketErrorHandler);

        // * The first attempt rejects if the mesh is unreachable. `connectPromise`
        // resolves only once a socket actually opens, so this rejection has no
        // caller to reach — unhandled, it terminates the process under Bun. Route it
        // to the same handler as later failures and let the socket's own retry loop
        // keep working towards an open connection.
        this.socket
            .connect()
            .catch(this.socketErrorHandler);

        return this.connectPromise;
    }

    /**
     * Disconnects from the Flux platform.
     */
    public disconnect(

    ): void {
        this.connectPromiseResolver = undefined;
        this.connectPromise = undefined;
        this.socket.close();
        this.webSocketClient = undefined;
        this.stateManager.emitNetworkState('disconnected');
    }

    /**
     * Registers an authority to the network.
     */
    public async registerAuthority<T, M>(
        authorizeAgentConnection: TAuthorizeCallback<T>,
        authorizeChannelAccess: TChannnelAuthCallback<M>,
    ): Promise<void> {
        const webSocketClient: FluxWebSocketClientConnection = await this.connect();

        // * 1 Register function for handling authorization
        webSocketClient
            .registerMethod('authorizeAgentConnection', (messageWithType: string) => {
                const dataType: string | undefined = messageWithType.split(':')[0];

                const message: string = messageWithType.substring(messageWithType.indexOf(':') + 1);

                return authorizeAgentConnection((dataType === 'json') ? JSON.parse(message) : message as T);
            });

        // * 2 Register function for authorizing a channel
        webSocketClient
            .registerMethod('authorizeChannelAccess', authorizeChannelAccess);

        // TODO: WAIT FOR CONNECTION TO BE ACCEPTED
        return Promise.resolve(void 0);
    }

    /**
     * Connects to a network.
     */
    public async connectToNetwork(
    ): Promise<FluxAgentNetworkConnection> {
        const webSocketClient: FluxWebSocketClientConnection = await this.connect();

        return Promise.resolve(new FluxAgentNetworkConnection(
            this,
            webSocketClient,
            this.stateManager.emitWebRTCState.bind(this.stateManager),
            this.stateManager.emitDirectMessage.bind(this.stateManager),
        ));
    }

    /**
     * Join a channel.
     */
    public async joinChannel(
        channelName: TChannelName,
    ): Promise<FluxNetworkChannel> {
        return this.channelStateManager
            .joinChannel(
                channelName,
                this,
                this.webSocketClient,
            );
    }

    /**
     * Leave a channel.
     */
    public async leaveChannel(
        channelName: TChannelName,
    ): Promise<void> {
        return this.channelStateManager
            .leaveChannel(
                channelName,
                this,
                this.webSocketClient,
            );
    }

    /**
     * Publishes a message to a channel.
     */
    public publish<T>(
        channelName: TChannelName,
        message: string | T,
    ): void {

        if (this.webSocketClient) {
            // Every payload is tagged so the receiver can decode unambiguously:
            //   's:' → raw string, 'o:' → JSON. Tagging strings too avoids the
            //   collision where a string literally starting with 'o:' would be
            //   mistaken for JSON on the receiving end.
            const messageString: string = typeof message === 'string'
                ? `s:${message}`
                : `o:${JSON.stringify(message)}`;

            this.webSocketClient.send(`${NETWORK_CHANNEL_PUBLISH}:${channelName}:${messageString}`);
        }
    }

    /**
     * Adds a callback to the list of callbacks for a given channel topic.
     */
    public onPublish(
        channelName: TChannelName,
        fn: TMessageCallback,
    ): void {
        const existingSubscriber: Set<TMessageCallback> | undefined = this.channelCallbacks.get(channelName);
        if (existingSubscriber) {
            existingSubscriber.add(fn);
        } else {
            const newSubscriber: Set<TMessageCallback> = new Set();
            newSubscriber.add(fn);
            this.channelCallbacks.set(channelName, newSubscriber);
        }
    }

    /**
     * Sends a connection request to another agent.
     */
    public async connectToAgent(
        destinationClientId: TAgentOwnUId,
    ): Promise<void> {

        if (this.webSocketClient) {
            this.webSocketClient.send(`${CONNECT_TO_CLIENT}:${destinationClientId}`);
        }

        return Promise.resolve();
    }

    /**
     * Registers a callback to be called when a message is received.
     */
    public onMessage(
        cb: TMessageCallback,
    ): void {
        this.callbacks.add(cb);
    }

    // ****************************************************************************
    // *** For Authorities
    // ****************************************************************************

    /**
     * Subscribes to the channel changes.
     */
    public subscribeToChannelChanges(
    ): void {
        if (this.webSocketClient) {
            this.webSocketClient.send(AUTHORITY_CHANNEL_SUBSCRIBE);
        } else {
            console.warn('WebSocket client is not connected');
        }
    }

    /**
     * Disconnects an agent from the network.
     */
    public disconnectAgent(
        id: TAddress,
    ): void {
        if (!isClientId(id)) {
            throw new Error(`Invalid agent id: '${id}'`);
        }

        if (this.webSocketClient) {
            this.webSocketClient.send(`${AUTHORITY_DISCONNECT_AGENT}:${id}`);
        } else {
            console.warn('WebSocket client is not connected');
        }
    }

    // ****************************************************************************
    // *** Internal Helpers
    // ****************************************************************************

    private resolveConnectedSocket(
    ): void {
        this.stateManager.emitNetworkState('connected');
        this.webSocketClient = this.socket;

        const connectPromiseResolver = this.connectPromiseResolver;

        this.connectPromiseResolver = undefined;
        this.connectPromise = undefined;
        connectPromiseResolver?.(this.socket);
    }

    private handleSocketClose(
        reason?: 'kicked',
    ): void {
        this.webSocketClient = undefined;

        PicoLogger.log(
            reason === 'kicked'
                ?
                `🔌🔴 Kicked, delaying reconnect ${RECONNECTION_DELAY_ON_KICK_MS / 60_000} minutes`
                :
                '🔌🔴 Disconnected',
            this.fluxInstanceId,
        );

        this.stateManager.emitNetworkState(reason === 'kicked' ? 'kicked' : 'disconnected');
    }

    private handleSocketConnecting(
        retryAttempt: number,
    ): void {
        this.stateManager.emitNetworkState('connecting');

        if (retryAttempt > 0) {
            PicoLogger.log(`🔄 Connecting attempt: #${retryAttempt} of ${this.options.retries ?? 'none'}`, this.fluxInstanceId);
        } else {
            PicoLogger.log(`🔄 Connecting: ${this.fluxInstanceId}`);
        }
    }

    private handleSocketError(
        error: Error,
    ): void {
        PicoLogger.log(`❌ Error: "${error.message}".`, this.fluxInstanceId);
    }

    /**
     * Handles incoming WebSocket messages.
     */
    private handleMessage(
        message_: string,
    ): void {
        for (const cb of this.callbacks) {
            cb(message_);
        }

        const packageType: string | undefined = message_.split(':')[0];

        const msgInterceptors: Set<TMessageCallback> | undefined = this.packageTypeInterceptorCallbacks.get(packageType);
        if (msgInterceptors && msgInterceptors.size > 0) {
            const channelName: string = message_.substring(message_.indexOf(':') + 1);

            for (const msgInterceptor of msgInterceptors) {
                msgInterceptor(channelName);
            }

            // There are interceptors of this package type, don't proceed
            return;
        }

        switch (packageType) {

            case ON_NETWORK_CHANNEL_PUBLISH: {

                // Message format: nc-on-pub:{agentId}:{channelName}:{data}
                const firstColon = message_.indexOf(':');
                const secondColon = message_.indexOf(':', firstColon + 1);
                const thirdColon = message_.indexOf(':', secondColon + 1);

                const channelName: string = message_.slice(secondColon + 1, thirdColon);

                if (validateChannelNameOrThrow(channelName)) {

                    const topicCallbacks: Set<TMessageCallback> | undefined = this.channelCallbacks.get(channelName);
                    if (topicCallbacks) {
                        const raw: string = message_.slice(thirdColon + 1);

                        // Decode the payload tag written by `publish`:
                        //   'o:' → JSON, 's:' → raw string. Untagged payloads are
                        //   treated as legacy raw strings.
                        let data: string;
                        if (raw.startsWith('o:')) {
                            try {
                                data = JSON.parse(raw.substring(2));
                            } catch {
                                data = raw.substring(2);
                            }
                        } else if (raw.startsWith('s:')) {
                            data = raw.substring(2);
                        } else {
                            data = raw;
                        }

                        for (const cb of topicCallbacks) {
                            cb(data);
                        }
                    }
                }

                return;
            }

            case RPC_REQUEST: {

                const payload: RPCRequest<any> = JSON.parse(message_.substring(message_.indexOf(':') + 1));

                void this.socket
                    .handleMessage(payload, (
                        data: RPCResponse,
                    ) => {
                        this.socket.send(`${RPC_RESPONSE}:${JSON.stringify(data)}`);
                    });

                return;
            }

            case RPC_RESPONSE: {
                const payload = message_.substring(message_.indexOf(':') + 1);

                PicoLogger.log("🔌 Unhandled type rpc response", 'ws-client');
                PicoLogger.log(`payload: ${payload}`, 'ws-client');

                return;
            }

            default:
                if (message_.startsWith(`${ERROR}:`)) {
                    // ! TODO HANDLE ERRORS BETTER throw new Error(message_.substring(message_.indexOf(':') + 1) ?? 'Unknown error');
                }

                PicoLogger.log(`🔌 Unhandled type: "${message_}"`, 'ws-client');
                return;
        }
    }
}
