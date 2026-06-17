import Alpine from 'alpinejs';
import { FluxAgent } from '@persistica/flux-agent';
import type { FluxAgentNetworkConnection, FluxNetworkChannel } from '@flux/shared/connection';
import type { TNetworkConnectionState, TRTCState } from '@flux/shared/utils';
import { getFluxUrl } from '../flux-url';
import { getAuthorityObject } from '../auth-settings';
import { getNetworkId } from '../network-id';

// Define observable component
Alpine.data('fluxApplicationB', () => ({
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
    broadcastChannel: <FluxNetworkChannel | undefined>undefined,
    broadcastInterval: <ReturnType<typeof setInterval> | undefined>undefined,
    broadcastCounter: 0,
    log(
        message: string,
    ) {
        this.clientLog.unshift(message);
    },
    stopBroadcasting() {
        if (!this.broadcastInterval) {
            return;
        }

        clearInterval(this.broadcastInterval);
        this.broadcastInterval = undefined;
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
            });

        this.flux
            .onNetworkState(
                (networkState: TNetworkConnectionState) => {
                    this.networkState = networkState;
                    this.log(`📡 Network state changed to '${networkState}'`);

                    if (networkState === 'disconnected') {
                        this.stopBroadcasting();
                        this.broadcastChannel = undefined;
                        this.joinedChannelName = null;
                        this.broadcastCounter = 0;
                    }
                },
            );

        try {
            this.fluxNetworkConnection = await this.flux.connect(
                getAuthorityObject(
                    'client-b',
                ),
                'client-b-unique-identification-token',
            );
        } catch (error) {
            this.log(`❌ Client B failed to connect: ${(error as Error).message}`);
            return;
        }

        console.log('✅ Client B connected to network', this.flux.id);
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

        this.broadcastChannel = await this.fluxNetworkConnection
            .joinChannel(
                channelTopic,
            );

        this.joinedChannelName = channelTopic;
        this.broadcastCounter = 0;
        this.log(`🟢 Joined '${channelTopic}'`);
        this.broadcastChannel.publish(`${this.broadcastCounter++} - Hello from client`);

        this.broadcastInterval = setInterval(() => {
            this.broadcastChannel?.publish(`${this.broadcastCounter++} - Hello from client`);
        }, 1_000);
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

        this.stopBroadcasting();
        await this.fluxNetworkConnection.leaveChannel(channelTopic);
        this.broadcastChannel = undefined;
        this.joinedChannelName = null;
        this.broadcastCounter = 0;
        this.log(`🚪 Left '${channelTopic}'`);
    },
    async disconnect() {
        if (this.joinedChannelName && this.fluxNetworkConnection) {
            await this.leaveChannel(this.joinedChannelName);
        } else {
            this.stopBroadcasting();
        }

        this.flux.disconnect();
        this.log('🚪 Client B disconnected from network');
    },
}));