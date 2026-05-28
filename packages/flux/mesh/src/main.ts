import {
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
    TNetworkId_S,
    VALIDATION_ERROR_NO_NETWORK_AUTHORITY_SOCKET_PACKAGE,
} from '@flux/shared/types';
import * as Bun from 'bun';
import { nanoid } from 'nanoid';
import { OutgoingMessageRouter } from './routing/outgoing-message-router.class';
import { NetworkAuthorityRedisCache } from './register/network-authority-redis-cache.class';
import { NetworkAgentRedisCache } from './register/network-agent-redis-cache.class';
import {
    type TTokenPayload,
    verifyTokenOrThrow,
} from './auth/auth';
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
import { OPTIONS_RESPONSE } from './_routes/options.route';
import { authorizeNetworkAuthority } from './_routes/auth/network-authority.post.route';
import { authorizeAgentConnection } from './_routes/auth/network-client.post.route';
import type {
    RPCResponse,
    TRPCResponseCallbackFunction,
} from '@flux/shared/ws';
import * as nodeURL from 'node:url';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from './routing/redis/redis-connection.class';
import { GlobalChannelPubsub } from './routing/global-channel/global-channel-pubsub.class';
import {
    NetworkChannelManager,
    readSubscriptionTypeFromClaim,
} from './business-logic/channels/channel-manager.class';
import { isNanoId } from '@flux/shared/types';
import { PicoLogger } from '@utils/pico-logger';
import { TConnectedClientSocket } from './connected-client-socket.types';
import { AgentManager } from './_managers/agent.manager';
import { interactWithNpc } from './_routes/npc-interact.get.route';
import { truncateString } from '@flux/shared/utils';

PicoLogger.configure({
    allowScopes: '*',
});

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

type TWebSocketData = {};

type TOptions = {
    port?: number;
    redisConnectionString?: string;
    hardcodedNetworkCredentials?: Map<TNetworkId_S, string>,
};

export class FluxMeshServer {

    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly onReadyListeners: Set<() => void> = new Set();
    private readonly bunServer: Bun.Server<TWebSocketData>;
    private readonly globalChannelPubsub: GlobalChannelPubsub;
    private readonly channelManager: NetworkChannelManager;
    private readonly agentManager: AgentManager;

    constructor(
        private readonly optionsOrPort?: TOptions | number,
    ) {
        const port: number = typeof this.optionsOrPort === 'number' ? this.optionsOrPort : (this.optionsOrPort?.port ?? 5_100);

        const networkAuthorityRedisCache: NetworkAuthorityRedisCache = new NetworkAuthorityRedisCache();
        const networkAgentRedisCache: NetworkAgentRedisCache = new NetworkAgentRedisCache();

        const outgoingMessageRouter: OutgoingMessageRouter = new OutgoingMessageRouter(
            // passToLocalClient:
            (
                clientId: TClientId,
                message: string,
            ) => {
                const client: TConnectedClientSocket | undefined = clientMap.get(clientId);

                if (!client) {
                    throw new UnknownClientError(clientId, processAddress);
                }

                client.send(message);
            }
        );
        const processMessageRouter: ProcessMessageRouter = new ProcessMessageRouter();

        const globalRPCClient: GlobalRPCClient<
            'authorizeAgentConnection' | 'authorizeChannelAccess'
        > = new GlobalRPCClient(outgoingMessageRouter, processMessageRouter);

        this.agentManager = new AgentManager(
            this.redisConnection,
            clientMap,
            networkAgentRedisCache,
        );

        this.bunServer = Bun.serve({
            port,
            idleTimeout: 0, // deactivate timeout
            routes: {
                // ****************************************************************************
                // *** Authenticate Network Authority
                // ****************************************************************************
                '/auth/network-authority': {
                    OPTIONS: OPTIONS_RESPONSE,
                    POST: (request: Bun.BunRequest) =>
                        authorizeNetworkAuthority(
                            request,
                            optionsOrPort instanceof Object ? optionsOrPort.hardcodedNetworkCredentials : undefined,
                        ),
                },

                // ****************************************************************************
                // *** Authenticate Client on Network
                // ****************************************************************************
                '/auth/network-client': {
                    OPTIONS: OPTIONS_RESPONSE,
                    POST: (request: Bun.BunRequest) =>
                        authorizeAgentConnection(
                            request,
                            networkAuthorityRedisCache,
                            globalRPCClient,
                        ),
                },

                // ****************************************************************************
                // *** NPC Interaction
                // ****************************************************************************
                '/*': {
                    OPTIONS: OPTIONS_RESPONSE,
                    GET: interactWithNpc,
                },
            },

            async fetch(
                request: Request,
                server: Bun.Server<TWebSocketData>, //  Bun.Server<TWebsocketData>,
            ) {
                // Upgrade the request to a WebSocket

                //      const cookies = request.headers.get('Cookie');
                // const token = cookies['X-Token'];
                //         console.log('CVookies: ', cookies);

                const token: string | string[] | undefined = nodeURL.parse(request.url, true)
                    .query['token'];

                try {
                    const decodedToken: TTokenPayload = verifyTokenOrThrow(token);

                    const socketId: TClientId = nanoid() as TClientId;

                    const upgraded = server
                        .upgrade(
                            request,
                            {
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
                            },
                        );

                    if (!upgraded) {
                        return new Response('Request upgrade failed', {
                            status: 500,
                            headers: {
                                'Access-Control-Allow-Origin': '*',
                            },
                        });
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
                // Specify the type of ws.data
                data: {} as TConnectedClientSocket,
                perMessageDeflate: true,
                maxPayloadLength: 1024 * 1024, // 1 MB
                // publishToSelf: true,

                // A socket is opened, validate it
                async open(
                    _ws: TConnectedClientSocket,
                ): Promise<void> {
                    clientMap.set(_ws.data.id, _ws);

                    if (_ws.data.isAuthority) {
                        PicoLogger.log(`👮 Authority connected to network '${truncateString(_ws.data.networkId)}' at address: '${_ws.data.address}'`, 'ws-connection');

                        await networkAuthorityRedisCache
                            .register(
                                _ws.data.networkId,
                                _ws.data.id,
                                _ws.data.machineUID,
                            );
                    } else {
                        PicoLogger.log(`🤵 Agent connected: ${_ws.data.id}`, 'ws-connection');

                        await networkAgentRedisCache
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
                    }
                    // Let the client detect readyState. Regular ping cannot be detected by the WebSocket client in the browser 
                    _ws.send('isReady');
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
                    const packageSize: number = new TextEncoder().encode(message_).length;
                    ws.data.throughput.bytes = ws.data.throughput.bytes + packageSize;
                    ws.data.throughput.packets++;

                    const packageType: string | undefined = message_.split(':')[0];

                    switch (packageType) {
                        case AUTHORITY_DISCONNECT_AGENT: {
                            if (!ws.data.isAuthority) {
                                ws.close(4000, 'Bad behavior');
                                return;
                            }

                            const agentAddress: TAddress = message_.substring(message_.indexOf(':') + 1) as TAddress;

                            if (!isNanoId(agentAddress)) {
                                ws.send(`${ERROR}:Invalid agent ID`);
                                return;
                            }

                            this.agentManager.kick(agentAddress);

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
                                        `${ON_NETWORK_CHANNEL_PUBLISH}:${ws.data.id}:${channelName}:${data}`,
                                        ws,
                                    );

                                    // Add the usage to the channel
                                    this.channelManager
                                        .increaseUsageCount(
                                            ws.data.networkId,
                                            channelName,
                                            packageSize,
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
                                const networkAuthorityAddress: TAddress = await networkAuthorityRedisCache
                                    .resolveAuthorityAddressOrThrow(
                                        ws.data.networkId,
                                    );

                                const canHaveMembers = await this.channelManager.canHaveMembers(
                                    ws.data.networkId,
                                    channelName,
                                    readSubscriptionTypeFromClaim(ws.data.claim),
                                );

                                if (!canHaveMembers) {
                                    ws.send(`${ERROR}:Channel limit is reached`);
                                    return;
                                }

                                try {
                                    const authorized: boolean = await globalRPCClient.call(
                                        networkAuthorityAddress,
                                        'authorizeChannelAccess',
                                        channelName,
                                        ws.data.claim,
                                    );

                                    if (authorized) {
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
                            } catch (error) {
                                PicoLogger.error(`Failed to resolve network authority address for networkId '${ws.data.networkId}': ${error instanceof Error ? error.message : 'Unknown error'}`, 'not-authorized');

                                ws.send(`${ERROR}:${VALIDATION_ERROR_NO_NETWORK_AUTHORITY_SOCKET_PACKAGE}`);
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
                                await networkAgentRedisCache.resolveClientAddressByUid(
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
                close: async (
                    ws: TConnectedClientSocket,
                    code: number,
                ) => {
                    clientMap.delete(ws.data.id);

                    if (ws.data.isAuthority) {
                        PicoLogger.log(`🛑 Authority socket disconnecting ${code} ${ws.data.id}`, 'ws-disconnect'); // 1001

                        networkAuthorityRedisCache
                            .unregister(
                                ws.data.id,
                                ws.data.networkId,
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
                            await this.channelManager
                                .leaveAllNetworkChannels(
                                    ws.data.networkId,
                                    ws.data.address,
                                    ws.data.channelNames,
                                ).catch(() => {
                                    PicoLogger.error(`Caught error while leaving network channels.`, 'ws-disconnect');
                                });
                        }

                        await networkAgentRedisCache
                            .unregister(
                                ws.data.id,
                                ws.data.networkId,
                                ws.data.uid ? {
                                    clientOwnUId: ws.data.uid,
                                    networkId: ws.data.networkId,
                                } : undefined,
                            )
                            .catch(() => {
                                PicoLogger.error(`Caught error while unregistering agent.`, 'ws-disconnect');
                            });
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
            console.log(`🚀 Flux mesh server running on localhost:${port}`);

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
