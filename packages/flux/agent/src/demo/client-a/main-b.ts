import Alpine from 'alpinejs';
import { FluxAgent } from '../../lib/flux';
import { TNetworkId_S } from '@flux/shared';
import { TNetworkConnectionState } from '../../lib/connector/flux-ws-connection';
import { TRTCState } from '../../lib/connector/low-level-com/web-rtc/ice-connection';
import { FluxNetworkConnection } from '../../lib/flux-network.class';
import { FluxNetworkChannel } from '../../lib/flux-network-channel.class';

// Define observable component
Alpine.data('fluxApplicationB', () => ({
    flux: new FluxAgent(
        'network-id' as unknown as TNetworkId_S,
        {
            //         domain?: string,
            //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
            //         retries?: number; // Number of times to retry a failed message
        },
    ),
    webRTCConncetionState: <undefined | TRTCState>undefined,
    fluxNetworkConnection: <undefined | FluxNetworkConnection>undefined,
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
            .networkState$$
            .subscribe({
                next: (networkState: TNetworkConnectionState) => {
                    this.networkState = networkState;
                },
            });

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