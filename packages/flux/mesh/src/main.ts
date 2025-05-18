/**
 * https://bun.sh/docs/api/websockets
 */

globalThis.meshLoadCount ??= 0;
globalThis.meshLoadCount++;

console.log(`[flux-mesh] Reloaded ${globalThis.meshLoadCount} time(s)`);

// import { Elysia } from 'elysia';
// import { swagger } from '@elysiajs/swagger';

if (!process.env['FLUX_MESH_JWT_KEY']) {
    throw new Error('Missing FLUX_MESH_JWT_KEY in .env');
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
    type TAgentOwnUId,
    UnknownClientError,
    CONNECT_TO_CLIENT,
    SUBSCRIBE_NETWORK_CHANNEL_NAME,
    ERROR,
    RPC_RESPONSE,
    SUBSCRIBED_NETWORK_CHANNEL_NAME,
    NETWORK_CHANNEL_PUBLISH,
    validateChannelNameOrThrow,
    ON_NETWORK_CHANNEL_PUBLISH,
    AUTHORITY_CHANNEL_SUBSCRIBE,
    UNSUBSCRIBE_NETWORK_CHANNEL_NAME,
    UNSUBSCRIBED_NETWORK_CHANNEL_NAME,
    AUTHORITY_DISCONNECT_AGENT,
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
import { NetworkAgentManager } from './register/network-client-manager.class';
import { OPTIONS_RESPONSE } from './_routes/options.route';
import { authorizeNetworkAuthority } from './_routes/auth/network-authority.post.route';
import { authorizeNetworkAgent } from './_routes/auth/network-client.post.route';
import type {
    RPCClient,
    RPCResponse,
    TRPCResponseCallbackFunction,
} from '@flux/shared/ws';
import * as nodeURL from 'node:url';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from './routing/redis/redis-connection.class';
import { GlobalChannelPubsub } from './routing/global-channel/global-channel-pubsub.class';
import { NetworkChannelManager } from './business-logic/channels/channel-manager.class';
import { isNanoId } from 'libs/flux/shared/types/src/lib/client-id.type';
import { PicoLogger } from '@utils/pico-logger';
import type { TFluxClientUID } from '@flux/shared/utils';

PicoLogger.configure({
    allowScopes: [
        'routing',
        'authorize',
        'authorized',
        'ws-connection',
        'ws-disconnect',
        'rpc',
    ],
});

export type TConnectedClientSocket = Bun.ServerWebSocket<{
    ip: Bun.SocketAddress | null;
    id: TClientId;
    uid?: TAgentOwnUId;
    address: TAddress;
    networkId: TNetworkId_S;
    isAuthority?: boolean;
    rtcClient?: WebRTCClient;
    claim?: string;
    rpcClient: RPCClient<'channel'>;
    channelNames: Set<TChannelName>;
    machineUID?: TFluxClientUID,

    // The amount of data sent
    throughput: {
        bytes: number;
        packets: number;
    };
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

    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly onReadyListeners: Set<() => void> = new Set();
    private readonly bunServer: Bun.Server;
    private readonly globalChannelPubsub: GlobalChannelPubsub;
    private readonly channelManager: NetworkChannelManager;

    constructor(
        private readonly port: number = 8080,
    ) {
        const networkAuthorityManager: NetworkAuthorityManager = new NetworkAuthorityManager();
        const networkAgentManager: NetworkAgentManager = new NetworkAgentManager();

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
                        authorizeNetworkAgent(
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

                const token: string | string[] | undefined = nodeURL.parse(request.url, true)
                    .query['token'];

                try {
                    const decodedToken: {
                        networkId: TNetworkId_S;
                        claim?: string;
                        isAuthority?: boolean;
                        agentUID?: string,
                        machineUID?: TFluxClientUID,
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
                                uid: decodedToken.agentUID,
                                machineUID: decodedToken.machineUID,
                                channelNames: new Set(),
                                throughput: {
                                    bytes: 0,
                                    packets: 0,
                                },
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
                        PicoLogger.log(`👮 Authority connected at address: '${_ws.data.address}'`, 'ws-connection');

                        networkAuthorityManager
                            .register(
                                _ws.data.networkId,
                                _ws.data.id,
                                _ws.data.machineUID,
                            );

                        return;
                    }

                    PicoLogger.log(`🤵 Agent connected: ${_ws.data.id}`, 'ws-connection');

                    await networkAgentManager
                        .registerAgent(
                            _ws.data.networkId,
                            _ws.data.id,
                            _ws.data.ip,
                            _ws.data.address,
                            _ws.data.throughput,
                            _ws.data.uid,
                            _ws.data.machineUID,
                        );

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

                    // Calculate the throughput
                    ws.data.throughput.bytes = ws.data.throughput.bytes + new TextEncoder().encode(message_).length;
                    ws.data.throughput.packets++;

                    const packageType: string | undefined = message_.split(':')[0];

                    switch (packageType) {
                        case AUTHORITY_DISCONNECT_AGENT: {
                            if (!ws.data.isAuthority) {
                                ws.close(4000, 'Bad behavior');
                                return;
                            }

                            const clientId: string = message_.substring(message_.indexOf(':') + 1);

                            if (!isNanoId(clientId)) {
                                ws.send(`${ERROR}:Invalid ID`);
                                return;
                            }

                            // Attempt to get the client
                            const connectedClientSocket: TConnectedClientSocket | undefined = clientMap.get(clientId);

                            if (
                                !connectedClientSocket ||
                                (connectedClientSocket.data.networkId !== ws.data.networkId) ||
                                (connectedClientSocket.data.isAuthority)
                            ) {
                                ws.send(`${ERROR}:Cannot kick agent`);
                                return;
                            }

                            connectedClientSocket.close(1002, 'Kicked by authority');

                            break;
                        }

                        case AUTHORITY_CHANNEL_SUBSCRIBE: {
                            if (!ws.data.isAuthority) {
                                ws.close(4000, 'Bad behavior');
                                return;
                            }

                            // Subscribe to the events 
                            ws.subscribe(`~/networks/${ws.data.networkId}/channel-created`);
                            ws.subscribe(`~/networks/${ws.data.networkId}/channel-empty`);

                            break;
                        }

                        case NETWORK_CHANNEL_PUBLISH: {
                            const firstColon = message_.indexOf(':');
                            const secondColon = message_.indexOf(':', firstColon + 1);

                            const channelName: string = message_.slice(
                                firstColon + 1,
                                secondColon
                            );
                            const data: string = message_.slice(secondColon + 1);

                            if (validateChannelNameOrThrow(channelName)) {
                                if (ws.data.channelNames.has(channelName)) {
                                    // Don't publish to self
                                    this.globalChannelPubsub.publish(
                                        `networks/${ws.data.networkId}/channels/${channelName}`,
                                        `${ON_NETWORK_CHANNEL_PUBLISH}:${channelName}:${data}`,
                                        ws,
                                    );
                                }
                            }

                            break;
                        }

                        case SUBSCRIBE_NETWORK_CHANNEL_NAME: {
                            const channelNameString: string = message_.substring(message_.indexOf(':') + 1);

                            try {
                                validateChannelNameOrThrow(channelNameString);
                            } catch {
                                ws.send(`${ERROR}:Not authorized`);
                                return;
                            }

                            const channelName: TChannelName = channelNameString as TChannelName;

                            if (ws.data.channelNames.has(channelName)) {
                                ws.send(`${ERROR}:Agent is already subscribed to channnel`);

                                return;
                            }

                            try {
                                const networkAuthorityAddress: TAddress = await networkAuthorityManager
                                    .resolveNetworkAuthorityAddressOrThrow(
                                        ws.data.networkId,
                                    );

                                const canHaveMembers = await this.channelManager.canHaveMembers(
                                    ws.data.networkId,
                                    channelName,
                                );

                                if (!canHaveMembers) {
                                    ws.send(`${ERROR}:Channel limit is reached`);
                                }

                                try {
                                    const authorize: boolean = await globalRPCClient.call(
                                        networkAuthorityAddress,
                                        'authorizeNetworkChannel',
                                        channelName,
                                        ws.data.claim
                                    );

                                    if (authorize) {
                                        ws.subscribe(`networks/${ws.data.networkId}/channels/${channelName}`);
                                        ws.send(`${SUBSCRIBED_NETWORK_CHANNEL_NAME}:${channelName}`);
                                        ws.data.channelNames.add(channelName);
                                        PicoLogger.log(`🎉 Client was authorized on channel name '${channelName}'`, 'authorized');

                                        this.channelManager
                                            .joinNetworkChannel(
                                                ws.data.networkId,
                                                channelName,
                                                ws.data.address,
                                            );
                                    } else {
                                        console.error(`Client was not authorized to connect to channel name '${channelName}'`);
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
                            } catch {
                                ws.send(`${ERROR}:Not netrowk authority found`);
                                return;
                            }
                            break;
                        }

                        case UNSUBSCRIBE_NETWORK_CHANNEL_NAME: {
                            const channelNameString: string = message_.substring(message_.indexOf(':') + 1);

                            try {
                                validateChannelNameOrThrow(channelNameString);
                            } catch {
                                ws.send(`${ERROR}:Not authorized`);
                                return;
                            }

                            const channelName: TChannelName = channelNameString as TChannelName;

                            if (!ws.data.channelNames.has(channelName)) {
                                ws.send(`${ERROR}:Cannot unsubscribe. Agent is not connected to the channnel`);

                                return;
                            }

                            try {
                                ws.unsubscribe(`networks/${ws.data.networkId}/channels/${channelName}`);
                                ws.send(`${UNSUBSCRIBED_NETWORK_CHANNEL_NAME}:${channelName}`);
                                ws.data.channelNames.delete(channelName);
                                console.log(`🚪 Client left channel name '${channelName}'`);

                                this.channelManager
                                    .leaveNetworkChannel(
                                        ws.data.networkId,
                                        channelName,
                                        ws.data.address,
                                    );

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

                            PicoLogger.log('📡 Received RPC response.', 'rpc');

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

                            const clientOwnUId: TAgentOwnUId = message_.substring(
                                message_.indexOf(':') + 1
                            ) as TAgentOwnUId;
                            const networkClientAddress: TAddress =
                                await networkAgentManager.resolveNetworkClientAddressByUid(
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
                                    remoteClient,
                                );
                            } else {
                                ws.send(`${ERROR}:RPC clients could not be resolved`);

                                return;
                            }

                            break;
                        }
                    }
                },

                // A socket is closed
                close: (
                    ws: TConnectedClientSocket,
                    code: number,
                ) => {
                    clientMap.delete(ws.data.id);

                    if (ws.data.isAuthority) {
                        PicoLogger.log(`🛑 Authority socket disconnecting ${code} ${ws.data.id}`, 'ws-disconnect'); // 1001

                        networkAuthorityManager.unregister(
                            ws.data.networkId,
                            ws.data.address,
                        );
                    } else {
                        PicoLogger.log(`🛑🤵 Agent socket disconnecting ${code} ${ws.data.id}`, 'ws-disconnect'); // 1001
                        // Unsubscribe from topics

                        for (const channelName of (ws.data.channelNames ?? [])) {
                            ws.unsubscribe(
                                `networks/${ws.data.networkId}/channels/${channelName}`
                            );
                        }

                        //  * Leave all channels
                        if (ws.data.channelNames.size > 0) {
                            this.channelManager
                                .leaveAllNetworkChannels(
                                    ws.data.networkId,
                                    ws.data.address,
                                    ws.data.channelNames,
                                );
                        }

                        networkAgentManager.unregisterNetworkAgent(
                            ws.data.networkId,
                            ws.data.id,
                            ws.data.uid,
                        );
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

            setInterval(() => {
                this.redisConnection.setConnected(`${machineAddress}/${processId}`);
            }, 3_000);

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
        this.redisConnection.disconnect();
    }
}
