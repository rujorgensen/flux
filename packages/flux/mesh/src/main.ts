/**
 * https://bun.sh/docs/api/websockets
 */

globalThis.meshLoadCount ??= 0;
globalThis.meshLoadCount++;

console.log(`[flux-mesh] Reloaded ${globalThis.meshLoadCount} time(s)`);

// import { Elysia } from 'elysia';
// import { swagger } from '@elysiajs/swagger';

// //go to http://localhost:3000/swagger
// // https://elysiajs.com/plugins/swagger
// new Elysia()
//     .use(swagger())
//     .get('/', () => 'hi')
//     .post('/hello', () => 'world')
//     .listen(3000);

if (!process.env['FLUX_JWT_KEY']) {
    throw new Error('Missing FLUX_JWT_KEY in .env');
}

// if (!process.env['FLUX_DOMAIN']) {
//     throw new Error('Missing FLUX_DOMAIN in .env');
// }

import {
    type TNetworkId_S,
    type TAddress,
    type TChannelName,
    type TClientId,
    type TMachineAddress,
    type TProcessAddress,
    type TProcessId,
    type TClientOwnUId,
    UnknownClientError,
    CONNECT_TO_CLIENT,
    SUBSCRIBE_NETWORK_CHANNEL_TOPIC,
    ERROR,
    RPC_RESPONSE,
    SET_OWN_UID,
    SUBSCRIBED_NETWORK_CHANNEL_TOPIC,
    NETWORK_CHANNEL_PUBLISH,
    validateChannelNameOrThrow,
    ON_NETWORK_CHANNEL_PUBLISH,
} from '@flux/shared/types';
import * as Bun from 'bun';
import { nanoid } from 'nanoid';
import { OutgoingMessageRouter } from './routing/outgoing-message-router.class';
import { NetworkAuthorityManager } from './register/register-network-authority.class';
import { verifyTokenOrThrow } from './auth/auth';
import { GlobalRPCClient } from './routing/rpc/core/global-rpc-client.class';
import { ProcessMessageRouter } from './routing/process-message-router.class';
import {
    GlobalWebRTCClient,
    WebRTCClient,
} from './_classes/web-rtc-client-interface.class';
import { facilitateWebRTCConnection } from './orchestrators/facilitate-webrtc-connection.class';
import {
    readMachineAddress,
    readProcessAddress,
    readProcessId,
} from './routing/addressing.utils';
import { NetworkClientManager } from './register/network-client-manager.class';
import { OPTIONS_RESPONSE } from './_routes/options.route';
import { authorizeNetworkAuthority } from './_routes/auth/network-authority.post.route';
import { authorizeNetworkClient } from './_routes/auth/network-client.post.route';
import type {
    RPCClient,
    RPCResponse,
    TRPCResponseCallbackFunction,
} from '@flux/shared/ws';
import * as nodeURL from 'node:url';
import {
    type RedisConnection,
    getRedisConnection,
} from './routing/redis/redis-connection.class';
import { GlobalChannelPubsub } from './routing/global-channel/global-channel-pubsub.class';

export type TConnectedClientSocket = Bun.ServerWebSocket<{
    ip: Bun.SocketAddress | null;
    id: TClientId;
    uid?: TClientOwnUId;
    address: TAddress;
    networkId: TNetworkId_S;
    isAuthority?: boolean;
    rtcClient?: WebRTCClient;
    claim?: string;
    rpcClient: RPCClient<'channel'>;
    channelTopics: Set<TChannelName>;
}>;

const clientMap: Map<TClientId, TConnectedClientSocket> = new Map();
const processId: TProcessId = readProcessId();
const machineAddress: TMachineAddress = readMachineAddress();
const processAddress: TProcessAddress = readProcessAddress();

const clientRPCResponseCallbacks: Map<
    TClientId,
    Set<TRPCResponseCallbackFunction>
> = new Map();

// const incommingClientMessageRouter: IncommingClientMessageRouter = new IncommingClientMessageRouter(
//     (
//         clientId: TClientId,
//         onMessage: TCallbackFunction,
//     ) => {
//         clientCallbacks.set(clientId, [onMessage]);
//     },
// );

export class FluxMeshServer {

    private readonly redisConnection: RedisConnection = getRedisConnection();
    private readonly onReadyListeners: Set<() => void> = new Set();
    private readonly bunServer: Bun.Server;
    private readonly globalChannelPubsub: GlobalChannelPubsub;
    private readonly channelManager: NetworkChannelManager;

    constructor(
        private readonly port: number = 8080,
    ) {

        const networkAuthorityManager: NetworkAuthorityManager = new NetworkAuthorityManager();
        const networkClientManager: NetworkClientManager = new NetworkClientManager();

        const outgoingMessageRouter: OutgoingMessageRouter = new OutgoingMessageRouter(
            // passToLocalClient:
            (
                clientId: TClientId,
                message: string,
            ) => {
                const client: TConnectedClientSocket | undefined =
                    clientMap.get(clientId);

                if (!client) {
                    throw new UnknownClientError(clientId, processAddress);
                }

                client.send(message);
            }
        );
        const processMessageRouter: ProcessMessageRouter = new ProcessMessageRouter();

        const globalRPCClient: GlobalRPCClient<
            'authorize' | 'authorizeNetworkChannel'
        > = new GlobalRPCClient(outgoingMessageRouter, processMessageRouter);

        this.bunServer = Bun.serve({
            port: this.port,
            idleTimeout: 0, // deactivate timeout
            routes: {
                // ****************************************************************************
                // *** Authenticate Network Authority
                // ****************************************************************************
                '/auth/network-authority': {
                    OPTIONS: OPTIONS_RESPONSE,
                    POST: authorizeNetworkAuthority,
                },

                // ****************************************************************************
                // *** Authenticate Client on Network
                // ****************************************************************************
                '/auth/network-client': {
                    OPTIONS: OPTIONS_RESPONSE,
                    POST: (request: Bun.BunRequest) =>
                        authorizeNetworkClient(
                            request,
                            networkAuthorityManager,
                            globalRPCClient,
                        ),
                },
            },

            async fetch(
                request: Request,
                server: Bun.Server,
            ) {
                // Upgrade the request to a WebSocket

                //      const cookies = request.headers.get('Cookie');
                // const token = cookies['X-Token'];
                //         console.log('CVookies: ', cookies);

                const token: string | undefined = nodeURL.parse(request.url, true).query
                    .token as string;

                try {
                    const decodedToken: {
                        networkId: TNetworkId_S;
                        claim?: string;
                        isAuthority?: boolean;
                    } = verifyTokenOrThrow(token) as any;

                    const socketId: TClientId = nanoid() as TClientId;
                    if (
                        server.upgrade(request, {
                            data: {
                                ip: server.requestIP(request),
                                id: socketId,
                                networkId: decodedToken.networkId,
                                isAuthority: decodedToken.isAuthority,
                                address: `${machineAddress}/${processId}/${socketId}`,
                                claim: decodedToken.claim,
                                channelTopics: new Set(),
                            },
                        })
                    ) {
                        // Do not return a Response
                        return;
                    }
                } catch {
                    console.error('Token verification failed');

                    return new Response('Token verification failed', {
                        status: 500,
                    });
                }

                return new Response('Upgrade failed', { status: 500 });
            },

            websocket: {
                perMessageDeflate: true,
                maxPayloadLength: 1024 * 1024, // 1 MB
                // publishToSelf: true,

                // A socket is opened, validate it
                async open(_ws: TConnectedClientSocket): Promise<void> {
                    clientMap.set(_ws.data.id, _ws);

                    if (_ws.data.isAuthority) {
                        console.log(`👮 Authority connected at address: '${_ws.data.address}'`);

                        networkAuthorityManager.register(
                            _ws.data.networkId,
                            _ws.data.id
                        );
                    } else {
                        console.log('🤵 Agent connected:', _ws.data.id);

                        _ws.data.rtcClient = new WebRTCClient(
                            processAddress,
                            _ws.send.bind(_ws),
                            (cb: TRPCResponseCallbackFunction) => {
                                const cbs:
                                    | Set<TRPCResponseCallbackFunction>
                                    | undefined = clientRPCResponseCallbacks.get(
                                        _ws.data.id
                                    );

                                clientRPCResponseCallbacks.set(
                                    _ws.data.id,
                                    cbs === undefined ? new Set([cb]) : cbs.add(cb)
                                );
                            }
                        );
                    }

                    // This will make the client retry: _ws.terminate();
                    //       ws.close(1001, 'Client not validated'); // ! Check correct error code
                },

                message: async (
                    ws: TConnectedClientSocket,
                    message_: string | Buffer,
                ) => {
                    if (typeof message_ !== 'string') {
                        throw new Error('Message is not a string');
                    }

                    const packageType: string | undefined = message_.split(':')[0];

                    switch (packageType) {
                        case AUTHORITY_CHANNEL_SUBSCRIBE: {
                            if (!ws.data.isAuthority) {
                                ws.close(4000, 'Bad behavior');
                                return;
                            }

                            // Subscribe to the events 
                            ws.subscribe(`${INTERNAL_EVENT}/networks/${ws.data.networkId}/channel-created`);
                            ws.subscribe(`${INTERNAL_EVENT}/networks/${ws.data.networkId}/channel-empty`);

                            break;
                        }

                        case NETWORK_CHANNEL_PUBLISH: {
                            const firstColon = message_.indexOf(':');
                            const secondColon = message_.indexOf(':', firstColon + 1);

                            const channelTopic: string = message_.slice(
                                firstColon + 1,
                                secondColon
                            );
                            const data: string = message_.slice(secondColon + 1);

                            if (validateChannelNameOrThrow(channelTopic)) {
                                if (ws.data.channelTopics.has(channelTopic)) {
                                    // Don't publish to self
                                    this.globalChannelPubsub.publish(
                                        `networks/${ws.data.networkId}/channels/${channelTopic}`,
                                        `${ON_NETWORK_CHANNEL_PUBLISH}:${channelTopic}:${data}`,
                                        ws,
                                    );
                                }
                            }

                            break;
                        }

                        case SUBSCRIBE_NETWORK_CHANNEL_TOPIC: {
                            const channelNameString: string = message_.substring(message_.indexOf(':') + 1);

                            try {
                                validateChannelNameOrThrow(channelNameString);
                            } catch {
                                ws.send(`${ERROR}:Not authorized`);
                                return;
                            }

                            const channelName: TChannelName = channelNameString as TChannelName;

                            if (ws.data.channelTopics.has(channelName)) {
                                ws.send(`${ERROR}:Agent is already subscribed to channnel`);

                                return;
                            }

                            const networkAuthorityAddress: TAddress =
                                await networkAuthorityManager.resolveNetworkAuthorityAddressOrThrow(
                                    ws.data.networkId
                                );

                            try {
                                const authorize: boolean = await globalRPCClient.call(
                                    networkAuthorityAddress,
                                    'authorizeNetworkChannel',
                                    channelName,
                                    ws.data.claim
                                );

                                if (authorize) {
                                    ws.subscribe(`networks/${ws.data.networkId}/channels/${channelName}`);
                                    ws.send(`${SUBSCRIBED_NETWORK_CHANNEL_TOPIC}:${channelName}`);
                                    ws.data.channelTopics.add(channelName);
                                    console.log(`🎉 Client was authorized on channel topic '${channelName}'`);
                                } else {
                                    console.error(`Client was not authorized to connect to channel topic '${channelName}'`);
                                    ws.send(`${ERROR}:Not authorized`);
                                }
                            } catch (error) {
                                if (error instanceof Error) {
                                    ws.send(`${ERROR}:${error.message}`);
                                    break;
                                }

                                console.error('Unknown error', error);
                                ws.send(`${ERROR}:Unknown error`);
                            }

                            break;
                        }

                        case RPC_RESPONSE: {
                            const rpcResponseMessage: RPCResponse = JSON.parse(
                                message_.substring(message_.indexOf(':') + 1)
                            ) as RPCResponse;

                            console.log('📡 Received RPC response.');

                            processMessageRouter.message(
                                rpcResponseMessage.rpcProcessAddress,
                                message_
                            );

                            const cbs: Set<TRPCResponseCallbackFunction> | undefined =
                                clientRPCResponseCallbacks.get(ws.data.id);

                            for (const clientCallback of cbs ?? []) {
                                clientCallback(rpcResponseMessage);
                            }

                            break;
                        }

                        case CONNECT_TO_CLIENT: {
                            const initiatingClient: WebRTCClient | undefined =
                                ws.data.rtcClient;

                            if (!initiatingClient) {
                                console.warn('Initiating client could not be resolved');
                            }

                            const clientOwnUId: TClientOwnUId = message_.substring(
                                message_.indexOf(':') + 1
                            ) as TClientOwnUId;
                            const networkClientAddress: TAddress =
                                await networkClientManager.resolveNetworkClientAddressByUid(
                                    ws.data.networkId,
                                    clientOwnUId
                                );

                            const remoteClient: GlobalWebRTCClient | undefined =
                                new GlobalWebRTCClient(
                                    networkClientAddress,
                                    outgoingMessageRouter,
                                    processMessageRouter
                                );

                            if (!remoteClient) {
                                console.warn('Remote client could not be resolved');
                            }

                            if (initiatingClient && remoteClient) {
                                facilitateWebRTCConnection(
                                    initiatingClient,
                                    remoteClient
                                );
                            } else {
                                ws.send(`${ERROR}:RPC clients could not be resolved`);

                                return;
                            }

                            break;
                        }

                        case SET_OWN_UID: {
                            const uid: TClientOwnUId = message_.substring(
                                message_.indexOf(':') + 1
                            ) as TClientOwnUId;

                            ws.data.uid = uid;
                            networkClientManager.registerClientUId(
                                ws.data.networkId,
                                ws.data.address,
                                uid
                            );
                            break;
                        }
                    }
                },

                // A socket is closed
                close(
                    ws: TConnectedClientSocket,
                    code: number,
                ) {
                    console.log('🛑 Socket disconnected', code, ws.data.id); // 1001

                    clientMap.delete(ws.data.id);

                    if (ws.data.isAuthority) {
                        networkAuthorityManager.unregister(
                            ws.data.networkId,
                            ws.data.address,
                        );
                    } else {
                        // Unsubscribe from topics
                        for (const topic of ws.data.channelTopics ?? []) {
                            ws.unsubscribe(
                                `networks/${ws.data.networkId}/channels/${topic}`
                            );
                        }
                        console.log('🤵 Agent disconnected:');

                        // TODO
                        // localClientManager.unregister(
                        //     ws.data.networkId,
                        //     ws.data.id,
                        // );
                    }
                },

                drain(_ws: Bun.ServerWebSocket<unknown>) {
                    console.log('drain');
                }, // the socket is ready to receive more data
            },
        });

        this.globalChannelPubsub = new GlobalChannelPubsub(
            this.redisConnection,
            this.bunServer,
            processAddress,
        );

        this.channelManager = new NetworkChannelManager(this.globalChannelPubsub);

        // TODO: DETECT WHEN READY
        setTimeout(() => {
            console.log(`Reloaded ${(globalThis as any).meshLoadCount} time(s)`);
            console.log(`🚀 Server running on localhost:${this.port}`);

            for (const cb of this.onReadyListeners) {
                cb();
            }
        }, 50);
    }

    public onReady(
        fn: () => void,
    ): void {
        this.onReadyListeners.add(fn);
    }

    /**
     * Gracefully shuts down the server.
     * 
     * @returns { Promise<void> }
     */
    public async stop(
    ): Promise<void> {
        clientMap.clear();

        // 'true': Force stop and close all active connections
        await this.bunServer.stop(true);
        await this.redisConnection.setDisconnected(`${machineAddress}/${processId}`);
        await this.redisConnection.disconnect();
    }
}
