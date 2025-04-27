import type {
    TChannelName,
    TClientOwnUId,
} from '@flux/shared/types';
import type {
    FluxWebSocketConnection,
} from './flux-ws-connection';
import {
    FluxRemoteClient,
} from '../../../../../../packages/flux/agent/src/lib/flux-remote-client.class';
import { ICEConnection } from 'packages/flux/agent/src/lib/connector/low-level-com/web-rtc/ice-connection';
import type { TRTCState } from '@flux/shared/utils';
import type {
    FluxWebSocketClientConnection,
} from '@flux/shared/ws';
import type {
    FluxNetworkChannel,
} from './flux-network-channel.class';

export class FluxAgentNetworkConnection {

    private readonly iceConnection: ICEConnection | undefined;

    constructor(
        private readonly _fluxWebSocketConnection: FluxWebSocketConnection,
        private readonly _fluxWebSocketClientConnection: FluxWebSocketClientConnection,
        private readonly _webRTCStateChange: (state: TRTCState) => void,
    ) {
        if (typeof RTCPeerConnection !== 'undefined') {
            this.iceConnection = new ICEConnection(
                this._fluxWebSocketClientConnection,
                this._webRTCStateChange,
            );
            console.log('RTCPeerConnection is available', !!this.iceConnection);
        } else {
            console.warn('❗WebRTC is not available in this environment.');
        }
    }

    /**
     * Joins a channel on the network.
     * 
     * @param { string } channelName 
     */
    public joinChannel(
        channelName: string,
    ): Promise<FluxNetworkChannel> {
        console.log(`Joining channel "${channelName}"`);

        if (!validateChannelNameOrThrow(channelName)) {
            throw new Error('This will not actually be thrown');
        }

        return this._fluxWebSocketConnection
            .joinChannel(
                channelName,
            );
    }

    /**
     * Connects to a client.
     * 
     * @param clientId
     * 
     * @returns 
     */
    public connectToClient(
        clientId: string,
    ): FluxRemoteClient {
        this._fluxWebSocketConnection.connectToClient(clientId as TClientOwnUId);

        return new FluxRemoteClient(this.iceConnection as ICEConnection);

        // return new Promise((_resolve, _reject) => {
        // 
        //     // setTimeout(() => {
        //     //     reject(new Error('Timeout'));
        //     // }, 600_000);
        // });
    }
}