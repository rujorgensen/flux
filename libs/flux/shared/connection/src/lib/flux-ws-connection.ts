/**
 * A WS connection to Flux, no validation yet.
 */

import {
    type TChannelName,
    type TClientOwnUId,
    type TAuthorizeCallback,
    CONNECT_TO_CLIENT,
    SUBSCRIBE_NETWORK_CHANNEL_NAME,
    RPC_REQUEST,
    RPC_RESPONSE,
    SET_OWN_UID,
    SUBSCRIBED_NETWORK_CHANNEL_NAME,
    NETWORK_CHANNEL_PUBLISH,
    validateChannelNameOrThrow,
    ON_NETWORK_CHANNEL_PUBLISH,
    AUTHORITY_CHANNEL_SUBSCRIBE,
    UNSUBSCRIBE_NETWORK_CHANNEL_NAME,
    AUTHORITY_DISCONNECT_AGENT,
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
import { isNanoId } from 'libs/flux/shared/types/src/lib/client-id.type';

interface IOptions {
    secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
    retries?: number; // Number of times to retry a failed message
    port?: number;
}

export const createWSConnection = <T, M>(
    id: string,
    ticket: string,
    stateManager: StateManager,
    cb: () => void,
    options?: {
        domain?: string,
        secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
        retries?: number; // Number of times to retry a failed message
    },
): FluxWebSocketConnection => {
    return new FluxWebSocketConnection(
        id,
        cb,
        stateManager,
        ticket,
        options,
    );
};

export class FluxWebSocketConnection {
    private readonly socket: FluxWebSocketClientConnection;
    private readonly callbacks: Set<TMessageCallback> = new Set();

    private readonly topicCallbacks: Map<TChannelName, Set<TMessageCallback>> = new Map();

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
            retries: 10_000,
            port: 8080,
            ...this.options,
        };

        // 1. Connect to websocket
        this.socket = new FluxWebSocketClientConnection(
            {
                url: `ws://localhost:${this.options.port}?token=${this.token}`,
                autoReconnect: true,
                reconnectDelay: 2_000,
                retries: this.options.retries,
            }
        );
    }

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
     * Connect to the Flux platform.
     * 
     * @returns { Promise<FluxWebSocketClientConnection> }
     */
    public async connect(

    ): Promise<FluxWebSocketClientConnection> {

        if (this.webSocketClient) {
            return Promise.resolve(this.webSocketClient);
        }

        return new Promise((resolve) => {
            this.socket.clearEventSubscribers();

            this.socket
                .on('open', () => {
                    console.log('🔌✅ Socket connected');

                    this.stateManager.emitNetworkState('connected');

                    this.webSocketClient = this.socket;

                    resolve(this.socket);

                    if (this.first) {
                        this.first = false;
                        return;
                    }

                    this.onReconnectCallback();
                })

                .on('message', (
                    message_: string,
                ) => {
                    for (const cb of this.callbacks) {
                        cb(message_);
                    }

                    const packageType: string | undefined = message_.split(':')[0];

                    const msgInterceptors: Set<TMessageCallback> | undefined = this.packageTypeInterceptorCallbacks.get(packageType);
                    if (msgInterceptors && msgInterceptors.size > 0) {
                        const channelName: string = message_.substring(message_.indexOf(':') + 1) as TChannelName;

                        for (const msgInterceptor of msgInterceptors) {
                            msgInterceptor(channelName);
                        }

                        // There are interceptors of this package type, don't proceed
                        return;
                    }

                    switch (packageType) {
                        case SUBSCRIBED_NETWORK_CHANNEL_NAME: {
                            const channelName: TChannelName = message_.substring(message_.indexOf(':') + 1) as TChannelName;

                            console.log(`Connected to channel name: "${channelName}"`);

                            break;
                        }

                        case ON_NETWORK_CHANNEL_PUBLISH: {

                            const firstColon = message_.indexOf(':');
                            const secondColon = message_.indexOf(':', firstColon + 1);

                            const channelName: string = message_.slice(firstColon + 1, secondColon);

                            if (validateChannelNameOrThrow(channelName)) {
                                const data: string = message_.slice(secondColon + 1);

                                const topicCallbacks: Set<TMessageCallback> | undefined = this.topicCallbacks.get(channelName);
                                if (topicCallbacks) {
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

                            console.log(`[WS Client] 🔌 Unhandled type rpc response`);
                            console.log('[WS Client]', { payload });

                            break;
                        }

                        default:
                            console.log(`[WS Client] 🔌 Unhandled type: "${message_}"`);
                            break;
                    }
                })

                .on('close', () => {
                    this.webSocketClient = undefined;
                    this.stateManager.emitNetworkState('disconnected');
                    console.log('🔌🔴 Disconnected', this.fluxInstanceId);
                })

                .on('connecting', (retryAttempt: number) => {
                    this.stateManager.emitNetworkState('disconnected');

                    console.log(`🔄 Connecting attempt: #${retryAttempt} of ${this.options?.retries ?? 'none'}`, this.fluxInstanceId);
                })
                .on('error', (error: Error) => {
                    console.log(`❌ Error: "${error.message}".`, this.fluxInstanceId);
                })
                ;

            this.stateManager.emitNetworkState('connecting');

            this.socket.connect();
        });
    }

    /**
     * Registers an authority to the network.
     * 
     * @param { TAuthorizeCallback }        cb
     * @param { TChannnelAuthCallback<M> }  authorizeNetworkChannel
     * 
     * @returns { Promise<void> }
     */
    public async registerAuthority<T, M>(
        cb: TAuthorizeCallback<T>,
        authorizeNetworkChannel: TChannnelAuthCallback<M>,
    ): Promise<void> {
        const webSocketClient: FluxWebSocketClientConnection = await this.connect();

        // * 1 Register function for handling authorization
        webSocketClient
            .registerMethod('authorize', (messageWithType: string) => {
                const dataType: string | undefined = messageWithType.split(':')[0];

                const message: string = messageWithType.substring(messageWithType.indexOf(':') + 1);

                return cb((dataType === 'json') ? JSON.parse(message) : message as T);
            });

        // * 2 Register function for authorizing a channel
        webSocketClient
            .registerMethod('authorizeNetworkChannel', authorizeNetworkChannel);

        // TODO: WAIT FOR CONNECTION TO BE ACCEPTED
        return Promise.resolve(void 0);
    }

    /**
     * Connects to a network.
     * 
     * @param { string }    [clientName]
     * 
     * @returns { Promise<FluxAgentNetworkConnection> }
     */
    public async connectToNetwork(
        clientUUIDToken?: TClientOwnUId,
    ): Promise<FluxAgentNetworkConnection> {
        const webSocketClient: FluxWebSocketClientConnection = await this.connect();

        // Attmpt to set the client UUID token
        if (clientUUIDToken) {
            await this.setClientUUIDToken(clientUUIDToken);
        }

        return Promise.resolve(new FluxAgentNetworkConnection(
            this, webSocketClient,
            this.stateManager.emitWebRTCState.bind(this.stateManager),
        ));
    }

    /**
     * 
     * @param { TChannelName } channelName
     * 
     * @returns { Promise<FluxNetworkChannel> } 
     */
    public async joinChannel(
        channelName: TChannelName,
    ): Promise<FluxNetworkChannel> {

        if (this.webSocketClient) {
            this.webSocketClient.send(`${SUBSCRIBE_NETWORK_CHANNEL_NAME}:${channelName}`);

            // TODO wait for acknowledgment
            return Promise.resolve(new FluxNetworkChannel(channelName, this));
        }

        return Promise.reject(new Error('Not connected'));
    }

    /**
     * 
     * @param { TChannelName } channelName
     * 
     * @returns { Promise<void> } 
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
     * 
     * @param { TChannelName } channelName
     * @param { string } message
     * 
     * @returns { void } 
     */
    public publish(
        channelName: TChannelName,
        message: string,
    ): void {

        if (this.webSocketClient) {
            this.webSocketClient.send(`${NETWORK_CHANNEL_PUBLISH}:${channelName}:${message}`);
        }
    }

    /**
     * Adds a callback to the list of callbacks for a given channel topic.
     * 
     * @param { TChannelName } channelName
     * @param { string } message
     * 
     * @returns { void } 
     */
    public onPublish(
        channelName: TChannelName,
        fn: TMessageCallback,
    ): void {
        const existingSubscriber: Set<TMessageCallback> | undefined = this.topicCallbacks.get(channelName);
        if (existingSubscriber) {
            existingSubscriber.add(fn);
        } else {
            const newSubscriber: Set<TMessageCallback> = new Set();
            newSubscriber.add(fn);
            this.topicCallbacks.set(channelName, newSubscriber);
        }
    }

    /**
     * 
     * @param { string } channelName
     * 
     * @returns { Promise<FluxNetworkChannel> } 
     */
    public async connectToClient(
        destinationClientId: TClientOwnUId,
    ): Promise<void> {

        if (this.webSocketClient) {
            this.webSocketClient.send(`${CONNECT_TO_CLIENT}:${destinationClientId}`);
        }

        return Promise.resolve();
    }

    /**
     * 
     * @param { TMessageCallback } cb
     * 
     * @returns { void } 
     */
    public onMessage(
        cb: TMessageCallback,
    ): void {
        this.callbacks.add(cb);
    }

    private setClientUUIDToken(
        clientUUIDToken?: TClientOwnUId,
    ) {

        if (this.webSocketClient) {
            this.webSocketClient.send(`${SET_OWN_UID}:${clientUUIDToken}`);
        }

        return Promise.resolve();
    }

    // ****************************************************************************
    // *** For Authorities
    // ****************************************************************************

    /**
     * Subscribes to the channel changes.
     * 
     * @returns { void }
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
     * 
     * @param { string } id
     * 
     * @returns { void }
     */
    public disconnectAgent(
        id: string,
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

}