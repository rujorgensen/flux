/**
 * A WS connection to Flux, no validation yet.
 */

import {
    type TChannelTopic,
    type TClientOwnUId,
    CONNECT_TO_CLIENT,
    SUBSCRIBE_NETWORK_CHANNEL_TOPIC,
    RPC_REQUEST,
    RPC_RESPONSE,
    RPCRequest,
    RPCResponse,
    SET_OWN_UID,
    TCallback2,
    SUBSCRIBED_NETWORK_CHANNEL_TOPIC,
    NETWORK_CHANNEL_PUBLISH,
    validateTopic,
    ON_NETWORK_CHANNEL_PUBLISH,
} from '@flux/shared';
import {
    FluxWebSocketClientConnection,
} from './low-level-com/websocket/ws-client';
import { FluxNetworkConnection } from '../flux-network.class';
import { FluxNetworkChannel } from '../flux-network-channel.class';
import { TRTCState } from './low-level-com/web-rtc/ice-connection';
import { TChannnelAuthCallback } from '../channel/channel.type';
import { TAuthorizeCallback } from 'apps/flux/shared/src/lib/auth/auth.fn';

export type TNetworkConnectionState = 'disconnected' | 'connected' | 'connecting' | 'authorizing' | 'denied';

interface IOptions {
    secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
    retries?: number; // Number of times to retry a failed message
}

// Has the client preivously connected to the network or registered as an authority?
const previousNetworkActions: {
    networkConnection: {
        identification: unknown,
        clientName?: string,
    } | null;
    registerAuthority: {
        authorityKey: string,
        cb: (...args: any) => Promise<boolean>;
        authorizeNetworkChannel: TChannnelAuthCallback<any>,
    } | null;
} = {
    networkConnection: null,
    registerAuthority: null,
};

export const createWSConnection = <T, M>(
    id: string,
    ticket: string,
    webRTCConnectionState$$: BehaviorSubject<TRTCState>,
    registerAuthority: (
        authorityKey: string,
        cb: (
            jwt: T,
        ) => Promise<boolean>,
        registerNetworkChannelAuthority: TChannnelAuthCallback<M>,
    ) => Promise<FluxNetworkConnection>,
    options?: {
        domain?: string,
        secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
        retries?: number; // Number of times to retry a failed message
    },
): FluxWebSocketConnection => {
    return new FluxWebSocketConnection(
        id,
        // Reconnected to WebSocket
        async () => {
            if (previousNetworkActions.registerAuthority || previousNetworkActions.networkConnection) {
                console.log('🔗 Re-connected to WebSocket');

                if (previousNetworkActions.registerAuthority) {
                    console.log('⭕🗝️ Re-registering authority');
                    await registerAuthority(
                        previousNetworkActions.registerAuthority.authorityKey,
                        previousNetworkActions.registerAuthority.cb,
                        previousNetworkActions.registerAuthority.authorizeNetworkChannel,
                    );
                }
            }
        },
        webRTCConnectionState$$.next.bind(webRTCConnectionState$$),
        ticket,
        options,
    );
};

export class FluxWebSocketConnection {
    // public readonly connectionState$$: BehaviorSubject<TWSConnectionState> = new BehaviorSubject<TWSConnectionState>('disconnected');
    public readonly networkState$$: BehaviorSubject<TNetworkConnectionState> = new BehaviorSubject<TNetworkConnectionState>('disconnected');

    private readonly socket: FluxWebSocketClientConnection;
    private readonly callbacks: Set<TCallback2> = new Set();

    private readonly topicCallbacks: Map<TChannelTopic, Set<TCallback2>> = new Map();

    private webSocketClient: FluxWebSocketClientConnection | undefined;
    private first: boolean = true;

    constructor(
        private readonly fluxInstanceId: string,
        private readonly onReconnectCallback: () => void,
        private readonly onWebRTCStateChange: (
            state: TRTCState,
        ) => void,
        private readonly token: string,
        private readonly options?: IOptions,
    ) {
        this.options = {
            retries: 10_000,
            ...this.options,
        };

        // 1. Connect to 
        this.socket = new FluxWebSocketClientConnection(
            {
                // this.options.url ? token = ${ token }`,

                url: `ws://localhost:8080?token=${this.token}`,
                autoReconnect: true,
                reconnectDelay: 2_000,
                retries: this.options.retries,
            }
        );
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

                    this.networkState$$.next('connected');

                    this.webSocketClient = this.socket;

                    resolve(this.socket);

                    if (!this.first) {
                        this.onReconnectCallback();
                    }

                    this.first = false;
                })

                .on('message', (
                    message_: string,
                ) => {
                    for (const cb of this.callbacks) {
                        cb(message_);
                    }

                    const packageType: string | undefined = message_.split(':')[0];

                    switch (packageType) {
                        case SUBSCRIBED_NETWORK_CHANNEL_TOPIC: {
                            const channelTopic: TChannelTopic = message_.substring(message_.indexOf(':') + 1) as TChannelTopic;

                            console.log(`Connected to topic: "${channelTopic}"`);

                            break;
                        }

                        case ON_NETWORK_CHANNEL_PUBLISH: {

                            const firstColon = message_.indexOf(':');
                            const secondColon = message_.indexOf(':', firstColon + 1);

                            const channelTopic: TChannelTopic = message_.slice(firstColon + 1, secondColon) as TChannelTopic;

                            if (validateTopic(channelTopic)) {
                                const data: string = message_.slice(secondColon + 1);

                                const topicCallbacks: Set<TCallback2> | undefined = this.topicCallbacks.get(channelTopic);
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
                    this.networkState$$.next('disconnected');
                    console.log('🔌🔴 Disconnected', this.fluxInstanceId);
                })

                .on('connecting', (retryAttempt: number) => {
                    this.networkState$$.next('disconnected');

                    console.log(`🔄 Connecting attempt: #${retryAttempt} of ${this.options!.retries}`, this.fluxInstanceId);
                })
                .on('error', (error: Error) => {
                    console.log(`❌ Error: "${error.message}".`, this.fluxInstanceId);
                })
                ;

            this.networkState$$.next('connecting');

            this.socket.connect();
        });
    }

    /**
     * Registers an authority to the network.
     * 
     * @param { TAuthorizeCallback }        cb
     * @param { TChannnelAuthCallback<M> }  authorizeNetworkChannel
     * 
     * @returns { Promise<FluxNetworkConnection> }
     */
    public async registerAuthority<T, M>(
        cb: TAuthorizeCallback<T>,
        authorizeNetworkChannel: TChannnelAuthCallback<M>,
    ): Promise<FluxNetworkConnection> {
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
        return Promise.resolve(new FluxNetworkConnection(this, webSocketClient, this.onWebRTCStateChange));
    }

    /**
     * Connects to a network.
     * 
     * @param { string }    [clientName]
     * 
     * @returns { Promise<FluxNetworkConnection> }
     */
    public async connectToNetwork(
        clientUUIDToken?: TClientOwnUId,
    ): Promise<FluxNetworkConnection> {
        const webSocketClient: FluxWebSocketClientConnection = await this.connect();

        // Attmpt to set the client UUID token
        if (clientUUIDToken) {
            await this.setClientUUIDToken(clientUUIDToken);
        }

        return Promise.resolve(new FluxNetworkConnection(this, webSocketClient, this.onWebRTCStateChange));
    }

    /**
     * 
     * @param { TChannelTopic } channelTopic
     * 
     * @returns { Promise<FluxNetworkChannel> } 
     */
    public async joinChannel(
        channelTopic: TChannelTopic,
    ): Promise<FluxNetworkChannel> {

        if (this.webSocketClient) {
            this.webSocketClient.send(`${SUBSCRIBE_NETWORK_CHANNEL_TOPIC}:${channelTopic}`);

            // TODO wait for acknowledgment
            return Promise.resolve(new FluxNetworkChannel(this, channelTopic));
        }

        return Promise.reject(new Error('Not connected'));
    }

    /**
     * 
     * @param { TChannelTopic } channelTopic
     * @param { string } message
     * 
     * @returns { void } 
     */
    public publish(
        channelTopic: TChannelTopic,
        message: string,
    ): void {

        if (this.webSocketClient) {
            this.webSocketClient.send(`${NETWORK_CHANNEL_PUBLISH}:${channelTopic}:${message}`);
        }
    }

    /**
     * Adds a callback to the list of callbacks for a given channel topic.
     * 
     * @param { TChannelTopic } channelTopic
     * @param { string } message
     * 
     * @returns { void } 
     */
    public onPublish(
        channelTopic: TChannelTopic,
        fn: TCallback2,
    ): void {
        const existingSubscriber: Set<TCallback2> | undefined = this.topicCallbacks.get(channelTopic);
        if (existingSubscriber) {
            existingSubscriber.add(fn);
        } else {
            const newSubscriber: Set<TCallback2> = new Set();
            newSubscriber.add(fn);
            this.topicCallbacks.set(channelTopic, newSubscriber);
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
     * @param { TCallback2 } cb
     * 
     * @returns { void } 
     */
    public onMessage(
        cb: TCallback2,
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

}