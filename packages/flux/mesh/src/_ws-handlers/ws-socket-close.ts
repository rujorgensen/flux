import { PicoLogger } from '@utils/pico-logger';
import { TConnectedClientSocket } from '../connected-client-socket.types';
import { NetworkAuthorityCache } from '../register/network-authority-cache.class';
import { NetworkAgentService } from '../register/network-agent.service';

export const onSocketClosed = (
    clientMap: Map<string, TConnectedClientSocket>,
    networkAuthorityRedisCache: NetworkAuthorityCache,
    networkAgentService: () => NetworkAgentService,
) => async (
    ws: TConnectedClientSocket,
    code: number,
) => {
        clientMap.delete(ws.data.id);

        if (ws.data.isAuthority) {
            PicoLogger.log(`🛑 Authority socket disconnecting ${code} ${ws.data.id}`, 'ws-disconnect'); // 1001

            // `.catch()` with no handler does NOT handle the rejection — it returns
            // a fresh rejected promise nobody owns. An Authority disconnecting while
            // Redis is unreachable therefore raised an unhandled rejection, which is
            // fatal under Bun (and made the portal specs fail at random).
            void networkAuthorityRedisCache
                .unregister(
                    ws.data.id,
                    ws.data.networkId,
                )
                .catch(() => {
                    PicoLogger.error(`Caught error while unregistering authority.`, 'ws-disconnect');
                });
        } else {
            PicoLogger.log(`🛑🤵 Agent socket disconnecting ${code} ${ws.data.id}`, 'ws-disconnect'); // 1001

            // * Unsubscribe from topics
            for (const channelName of ws.data.channelNames) {
                ws.unsubscribe(
                    `networks/${ws.data.networkId}/channels/${channelName}`
                );
            }

            // * Unregister agent and leave channels
            await networkAgentService()
                .unregister(
                    ws.data.id,
                    ws.data.address,
                    ws.data.networkId,
                    ws.data.channelNames,
                    ws.data.uid ? {
                        clientOwnUId: ws.data.uid,
                        networkId: ws.data.networkId,
                    } : undefined,
                )
                .catch(() => {
                    PicoLogger.error(`Caught error while unregistering agent.`, 'ws-disconnect');
                });
        }
    };