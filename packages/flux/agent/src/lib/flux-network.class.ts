import type {
    TChannelTopic,
    TClientOwnUId,
} from '@flux/shared';
import type {
    FluxWebSocketConnection,
} from './connector/flux-ws-connection';
import { ICEConnection, type TRTCState } from './connector/low-level-com/web-rtc/ice-connection';
import { FluxWebSocketClientConnection } from './connector/low-level-com/websocket/ws-client';
import type {
    FluxNetworkChannel,
} from './flux-network-channel.class';
import {
    FluxRemoteClient,
} from './flux-remote-client.class';

export class FluxNetworkConnection {

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

        return this._fluxWebSocketConnection
            .joinChannel(
                channelName as TChannelTopic,
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