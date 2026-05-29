/**
 * This is the class exposed to the user. It represents an agent connection to the network.
 */
import {
    type TChannelName,
    type TAgentOwnUId,
    validateChannelNameOrThrow,
} from '@flux/shared/types';
import type {
    FluxWebSocketConnection,
} from '../flux-ws-connection';
import {
    FluxRemoteClient,
} from '../../../../../../../packages/flux/agent/src/lib/flux-remote-client.class';
import { ICEConnection } from '../../../../../../../packages/flux/agent/src/lib/connector/low-level-com/web-rtc/ice-connection';
import type { TRTCState } from '@flux/shared/utils';
import type {
    FluxWebSocketClientConnection,
} from '@flux/shared/ws';
import type {
    FluxNetworkChannel,
} from '../flux-network-channel.class';

export class FluxAgentNetworkConnection {

    private readonly iceConnection: ICEConnection | undefined;
    private readonly connectedChannelSet: Set<TChannelName> = new Set();

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
            console.log(`RTCPeerConnection is available`);
        } else {
            console.warn('❗WebRTC is not available in this environment.');
        }
    }

    /**
     * Joins a channel on the network.
     */
    public async joinChannel(
        channelName: string,
    ): Promise<FluxNetworkChannel> {
        console.log(`Joining channel "${channelName}"`);

        if (!validateChannelNameOrThrow(channelName)) {
            throw new Error('This will not actually be thrown');
        }

        const fluxNetworkChannel: FluxNetworkChannel = await this._fluxWebSocketConnection
            .joinChannel(
                channelName,
            );

        this.connectedChannelSet.add(fluxNetworkChannel.channelName);

        return fluxNetworkChannel;
    }

    /**
     * Leaves a channel on the network.
     */
    public async leaveChannel(
        channelName: string,
    ): Promise<void> {
        console.log(`Leaving channel "${channelName}"`);

        if (!validateChannelNameOrThrow(channelName)) {
            throw new Error('This will not actually be thrown');
        }

        await this._fluxWebSocketConnection
            .leaveChannel(
                channelName,
            );

        this.connectedChannelSet.delete(channelName);
    }

    /**
     * Connects to a remote agent.
     */
    public connectToAgent(
        clientId: string,
    ): FluxRemoteClient {
        this._fluxWebSocketConnection.connectToAgent(clientId as TAgentOwnUId);

        return new FluxRemoteClient(this.iceConnection as ICEConnection);
    }

    /**
     * Returns a list of channels the agent is currently subscribed to.
     */
    public readConnectedChannels(

    ): string[] {
        return [...this.connectedChannelSet];
    }
}