import Alpine from 'alpinejs';
import { FluxAgent } from '@persistica/flux-agent';
import type { TNetworkId_S } from '@flux/shared/types';
import type { FluxAgentNetworkConnection, FluxNetworkChannel } from '@flux/shared/connection';
import type { TNetworkConnectionState, TRTCState } from '@flux/shared/utils';

// Define observable component
Alpine.data('fluxApplicationB', () => ({
    flux: new FluxAgent(
        'rAnD0M-network-id' as unknown as TNetworkId_S,
        {
            //         domain?: string,
            //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
            //         retries?: number; // Number of times to retry a failed message
        },
    ),
    webRTCConncetionState: <undefined | TRTCState>undefined,
    fluxNetworkConnection: <undefined | FluxAgentNetworkConnection>undefined,
    networkState: <string | null>null,
    clientLog: ['empty'],
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
            });

        this.flux
            .onNetworkState(
                (networkState: TNetworkConnectionState) => {
                    this.networkState = networkState;
                },
            );

        this.fluxNetworkConnection = await this.flux.connect(
            {
                code: 'code-to-access-network',
                user: 'client-b',
            },
            'client-b-unique-identification-token',
        );

        console.log('✅ Client B connected to network', this.flux.id);
    },
    async joinChannel(
        channelTopic: string,
    ) {
        if (!this.fluxNetworkConnection) {
            throw new Error('No network connection');
        }

        const fluxNetworkChannel: FluxNetworkChannel = await this.fluxNetworkConnection
            .joinChannel(
                channelTopic,
            );

        let i = 0;
        fluxNetworkChannel.publish(`${i++} - Hello from client`);

        setInterval(() => {
            fluxNetworkChannel.publish(`${i++} - Hello from client`);
        }, 1_000);
    },
}));

console.log('⚙️ Starting alpine');
// Start Alpine.js
Alpine.start();