import Alpine from 'alpinejs';
import {
    type FluxRemoteClient,
    FluxAgent,
} from '@persistica/flux-agent';
import type { TNetworkConnectionState, TRTCState } from '@flux/shared/utils';
import type { FluxAgentNetworkConnection } from '@flux/shared/connection';
import { getFluxUrl } from '../flux-url';
import { getAuthorityObject } from '../auth-settings';
import { getNetworkId } from '../network-id';

// Define observable component
Alpine.data('fluxApplicationA', () => ({
    channelName: 'channel-abc',
    flux: new FluxAgent(
        getNetworkId(),
        {
            domain: getFluxUrl(),
            //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
            //         retries?: number; // Number of times to retry a failed message
        },
    ),
    webRTCConncetionState: <undefined | TRTCState>undefined,
    fluxNetworkConnection: <undefined | FluxAgentNetworkConnection>undefined,
    networkState: <string | null>null,
    clientLog: ['empty'],
    joinedChannelName: <string | null>null,
    remoteClient: <FluxRemoteClient | undefined>undefined,
    rtcMessageInterval: <ReturnType<typeof setInterval> | undefined>undefined,
    log(
        message: string,
    ) {
        this.clientLog.unshift(message);
    },
    stopRTCMessageLoop() {
        if (!this.rtcMessageInterval) {
            return;
        }

        clearInterval(this.rtcMessageInterval);
        this.rtcMessageInterval = undefined;
    },
    startRTCMessageLoop() {
        if (this.rtcMessageInterval) {
            return;
        }

        this.rtcMessageInterval = setInterval(() => {
            this.sendRTCMessage('WEB RTC IS WORKING 🥳🎉🎊');
        }, 200);
    },
    async init() {
        console.log('🚀 Flux Application is live');

        this.flux
            .onMessage((
                message: string,
            ) => {
                this.log(message);
            });

        this.flux
            .onWebRTConnectionState((
                webRTCConncetionState: TRTCState,
            ) => {
                // console.log('webRTCConncetionState updated', webRTCConncetionState);
                this.webRTCConncetionState = webRTCConncetionState;

                if (webRTCConncetionState === 'connected') {
                    this.startRTCMessageLoop();
                    return;
                }

                this.stopRTCMessageLoop();
            });

        this.flux
            .onNetworkState((
                networkState: TNetworkConnectionState,
            ) => {
                this.networkState = networkState;
                this.log(`📡 Network state changed to '${networkState}'`);

                if (networkState === 'disconnected') {
                    this.stopRTCMessageLoop();
                    this.remoteClient = undefined;
                    this.joinedChannelName = null;
                }
            });

        try {
            this.fluxNetworkConnection = await this.flux
                .connect(
                    getAuthorityObject(
                        'client-a',
                    ),
                    'client-a-unique-identification-token',
                );
        } catch (error) {
            this.log(`❌ Client A failed to connect: ${(error as Error).message}`);
            return;
        }

        console.log('✅ Client A connected to network', this.flux.id);
    },

    connectToNamedAgent(
        clientName: string,
    ) {
        console.log('Conneting to remo');
        this.remoteClient = this.fluxNetworkConnection?.connectToAgent(clientName);
        this.log(`🔗 Connecting to '${clientName}'`);
    },

    // Send message over DataChannel
    sendRTCMessage(
        message: string,
    ) {
        if (!this.remoteClient) {
            alert('No remote client');
        }

        this.remoteClient?.send(
            message,
        );

        // if (this.dataChannel && this.dataChannel.readyState === 'open') {
        //     this.dataChannel.send(this.message);
        // } else if (this.receiveChannel && this.receiveChannel.readyState === 'open') {
        //     this.receiveChannel.send(this.message);
        // } else {
        //     
        // }
    },

    async joinChannel(
        channelTopic: string,
    ) {
        if (!this.fluxNetworkConnection) {
            throw new Error('No network connection');
        }

        if (this.joinedChannelName === channelTopic) {
            return;
        }

        await this.fluxNetworkConnection
            .joinChannel(
                channelTopic,
            );

        this.joinedChannelName = channelTopic;
        this.log(`🟢 Joined '${channelTopic}'`);
    },

    async leaveChannel(
        channelTopic: string,
    ) {
        if (!this.fluxNetworkConnection) {
            throw new Error('No network connection');
        }

        if (this.joinedChannelName !== channelTopic) {
            return;
        }

        await this.fluxNetworkConnection
            .leaveChannel(
                channelTopic,
            );

        this.joinedChannelName = null;
        this.log(`🚪 Left '${channelTopic}'`);
    },

    async disconnect() {
        if (this.joinedChannelName && this.fluxNetworkConnection) {
            await this.fluxNetworkConnection.leaveChannel(this.joinedChannelName);
            this.log(`🚪 Left '${this.joinedChannelName}'`);
            this.joinedChannelName = null;
        }

        this.stopRTCMessageLoop();
        this.remoteClient = undefined;
        this.flux.disconnect();
        this.log('🚪 Client A disconnected from network');
    },

}));