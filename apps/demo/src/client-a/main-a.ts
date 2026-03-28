import Alpine from 'alpinejs';
import { FluxAgent } from '@persistica/flux-agent';
import type { FluxRemoteClient } from '@persistica/flux-agent';
import type { TNetworkConnectionState, TRTCState } from '@flux/shared/utils';
import type { FluxAgentNetworkConnection } from '@flux/shared/connection';
import { DEMO_CHANNEL_PASSWORD, DEMO_NETWORK_ID } from '../definitions';
import { getFluxUrl } from '../flux-url';

// Define observable component
Alpine.data('fluxApplicationA', () => ({
    flux: new FluxAgent(
        DEMO_NETWORK_ID,
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
    remoteClient: <FluxRemoteClient | undefined>undefined,
    async init() {
        console.log('🚀 Flux Application is live');

        this.flux
            .onMessage((
                message: string,
            ) => {
                this.clientLog.unshift(message);
            });

        this.flux
            .onWebRTConnectionState((
                webRTCConncetionState: TRTCState,
            ) => {
                // console.log('webRTCConncetionState updated', webRTCConncetionState);
                this.webRTCConncetionState = webRTCConncetionState;

                if (webRTCConncetionState === 'connected') {
                    // Start sending messages
                    setInterval(() => {

                        this.sendRTCMessage('WEB RTC IS WORKING 🥳🎉🎊');
                    }, 200);
                }
            });

        this.flux
            .onNetworkState((
                networkState: TNetworkConnectionState,
            ) => {
                this.networkState = networkState;
            });

        this.fluxNetworkConnection = await this.flux.connect(
            {
                code: DEMO_CHANNEL_PASSWORD,
                user: 'client-a',
            },
            'client-a-unique-identification-token',
        );

        console.log('✅ Client A connected to network', this.flux.id);
    },

    connectToNamedAgent(
        clientName: string,
    ) {
        console.log('Conneting to remo');
        this.remoteClient = this.fluxNetworkConnection?.connectToAgent(clientName);

        // await new Promise((_resolve, reject) => {


        //     setTimeout(() => {
        //         reject(new Error('Timeout'));
        //     }, 600_000);
        // });

        // sendMessage
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

        await this.fluxNetworkConnection
            .joinChannel(
                channelTopic,
            );
    },

}));

console.log('⚙️ Starting alpine');
// Start Alpine.js
// Alpine.start();