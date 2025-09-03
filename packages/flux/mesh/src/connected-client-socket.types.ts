import type { TAddress, TAgentOwnUId, TChannelName, TClientId, TNetworkId_S } from '@flux/shared/types';
import type { TFluxClientUID } from '@flux/shared/utils';
import type { WebRTCClient } from './_classes/web-rtc-client-interface.class';
import type { RPCClient } from '@flux/shared/ws';

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