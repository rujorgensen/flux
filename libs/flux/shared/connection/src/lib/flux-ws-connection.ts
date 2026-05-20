/**
 * A WS connection to Flux, no validation yet.
 */

import {
    type TChannelName,
    type TAgentOwnUId,
    type TAuthorizeCallback,
    type TAddress,
    CONNECT_TO_CLIENT,
    SUBSCRIBE_NETWORK_CHANNEL_NAME,
    RPC_REQUEST,
    RPC_RESPONSE,
    SUBSCRIBED_NETWORK_CHANNEL_NAME,
    NETWORK_CHANNEL_PUBLISH,
    validateChannelNameOrThrow,
    ON_NETWORK_CHANNEL_PUBLISH,
    AUTHORITY_CHANNEL_SUBSCRIBE,
    UNSUBSCRIBE_NETWORK_CHANNEL_NAME,
    AUTHORITY_DISCONNECT_AGENT,
    ERROR,
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
import { isNanoId } from '@flux/shared/types';
import { PicoLogger } from '@utils/pico-logger';

interface IOptions {
    domain?: string; // Override the domain for self hosted Flux instances. Should include protocol, e.g. "https://my-flux-instance.com"
    secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
    retries?: number; // Number of times to retry a failed message
}

/**
 * Creates a WebSocket connection to the Flux platform.
 */
export const createWSConnection = <T, M>(
    id: string,
    ticket: string,
    stateManager: StateManager,
    onReconnectCallback: () => void,
    options?: {
        domain?: string,
        secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
        retries?: number; // Number of times to retry a failed message
    },
): FluxWebSocketConnection => {
    return new FluxWebSocketConnection(
        id,
        onReconnectCallback,
        stateManager,
        ticket,
        {
            domain: options?.domain,
            secretKey: options?.secretKey,
            retries: options?.retries,
        },
    );
};


export class FluxWebSocketConnection {
    private readonly socket: FluxWebSocketClientConnection;
    private readonly callbacks: Set<TMessageCallback> = new Set();

    private readonly channelCallbacks: Map<TChannelName, Set<TMessageCallback>> = new Map();

    // Handles messages before the rest of the logic. Will not continue if there are interceptors
    private readonly packageTypeInterceptorCallbacks: Map<string, Set<TMessageCallback>> = new Map();

    private webSocketClient: FluxWebSocketClientConnection | undefined;
    private first: boolean = true;

    constructor(
        private readonly fluxInstanceId: string,
        private readonly onReconnectCallback: () => void,
        private readonly stateManager: StateManager,
        private readonly token: string,
        private readonly options?: IOptions,
    ) {
        this.options = {
            domain: this.options?.domain,
            secretKey: this.options?.secretKey,
            retries: this.options?.retries ?? 10_000,
        };
        const url = new URL(this.options?.domain ?? 'http://localhost:5100');

        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.searchParams.set('token', this.token);

        // 1. Connect to websocket
        this.socket = new FluxWebSocketClientConnection(
            {
                url: url.toString(),
                autoReconnect: true,
                reconnectDelay: 2_000,
                retries: this.options.retries,
            }
        );
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

        return new Promise((resolve) => {
            this.interceptPackageTypeMessages(
                'isReady',
                () => {
                    this.stateManager.emitNetworkState('connected');

                    this.webSocketClient = this.socket;

                    resolve(this.socket);

                    if (this.first) {
                        this.first = false;
                        return;
                    }

                    this.onReconnectCallback();
                },
            );

            this.socket.clearEventSubscribers();

            this.socket
                .on('message', this.handleMessage.bind(this))

                .on('close', () => {
                    this.webSocketClient = undefined;
                    this.stateManager.emitNetworkState('disconnected');
                    PicoLogger.log('🔌🔴 Disconnected', this.fluxInstanceId);
                })

                .on('connecting', (retryAttempt: number) => {
                    this.stateManager.emitNetworkState('disconnected');

                    if (retryAttempt > 0) {
                        PicoLogger.log(`🔄 Connecting attempt: #${retryAttempt} of ${this.options?.retries ?? 'none'}`, this.fluxInstanceId);
                    } else {
                        PicoLogger.log(`🔄 Connecting: ${this.fluxInstanceId}`);
                    }
                })

                .on('error', (error: Error) => {
                    PicoLogger.log(`❌ Error: "${error.message}".`, this.fluxInstanceId);
                })
                ;

            this.stateManager.emitNetworkState('connecting');

            this.socket.connect();
        });
    }

    /**
     * Disconnects from the Flux platform.
     */
    public disconnect(

    ): void {
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
        ));
    }

    /**
     * Join a channel.
     */
    public async joinChannel(
        channelName: TChannelName,
    ): Promise<FluxNetworkChannel> {
        if (this.webSocketClient) {
            this.webSocketClient.send(`${SUBSCRIBE_NETWORK_CHANNEL_NAME}:${channelName}`);

            return new Promise((resolve, reject) => {
                const cb = (
                    message: string,
                ) => {
                    // ! TODO implement timeout
                    // Remove the interceptor
                    this.removePackageTypeInterceptor(SUBSCRIBED_NETWORK_CHANNEL_NAME, cb);

                    const receivedChannelName: TChannelName = message.substring(message.indexOf(':') + 1) as TChannelName;

                    if (channelName !== receivedChannelName) {
                        reject(new Error(`Channel name mismatch: "${channelName}" !== "${receivedChannelName}"`));
                        return;
                    }

                    resolve(new FluxNetworkChannel(channelName, this));
                };

                this.interceptPackageTypeMessages(
                    SUBSCRIBED_NETWORK_CHANNEL_NAME,
                    cb,
                );
            });
        }

        return Promise.reject(new Error('Not connected'));
    }

    /**
     * Leaves a channel.
     */
    public async leaveChannel(
        channelName: TChannelName,
    ): Promise<void> {

        if (this.webSocketClient) {
            this.webSocketClient.send(`${UNSUBSCRIBE_NETWORK_CHANNEL_NAME}:${channelName}`);

            // TODO wait for acknowledgment
            return Promise.resolve(void 0);
        }

        return Promise.reject(new Error('Not connected'));
    }

    /**
     * Publishes a message to a channel.
     */
    public publish<T>(
        channelName: TChannelName,
        message: string | T,
    ): void {

        if (this.webSocketClient) {
            // TODO NB! There is a risk of the string message already starting with 'o:'
            const messageString: string = typeof message === 'string' ? message : `o:${JSON.stringify(message)}`;

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
        if (!isNanoId(id)) {
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
                        let data: string = message_.slice(thirdColon + 1);

                        if (data.startsWith('o:')) {
                            try {
                                data = JSON.parse(data.substring(2));
                            } catch {
                                data = data.substring(2);
                            }
                        }

                        for (const cb of topicCallbacks) {
                            cb(data);
                        }
                    }
                }

                break;
            }

            case RPC_REQUEST: {

                const payload: RPCRequest<any> = JSON.parse(message_.substring(message_.indexOf(':') + 1));

                this.socket
                    .handleMessage(payload, (
                        data: RPCResponse,
                    ) => {
                        this.socket.send(`${RPC_RESPONSE}:${JSON.stringify(data)}`);
                    });

                break;
            }

            case RPC_RESPONSE: {
                const payload = message_.substring(message_.indexOf(':') + 1);

                PicoLogger.log("🔌 Unhandled type rpc response", 'ws-client');
                PicoLogger.log(`payload: ${payload}`, 'ws-client');

                break;
            }

            default:
                if (message_.startsWith(`${ERROR}:`)) {
                    // ! TODO HANDLE ERRORS BETTER throw new Error(message_.substring(message_.indexOf(':') + 1) ?? 'Unknown error');
                }

                PicoLogger.log(`🔌 Unhandled type: "${message_}"`, 'ws-client');
                break;
        }
    }
}
