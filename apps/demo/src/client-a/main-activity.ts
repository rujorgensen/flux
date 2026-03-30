import Alpine from 'alpinejs';
import { FluxAgent } from '@persistica/flux-agent';
import type { FluxAgentNetworkConnection } from '@flux/shared/connection';
import { PicoLogger } from '@utils/pico-logger';
import { getFluxUrl } from '../flux-url';
import { getAuthorityObject } from '../auth-settings';
import { getNetworkId } from '../network-id';

Alpine.data('fluxActivityDemoApplication', () => ({
    agents: new Set<FluxAgent>(),
    networkConnections: new Set<FluxAgentNetworkConnection>(),
    channels: new Set<string>(),
    clientLog: new Array<string>(0),

    init() {
        PicoLogger.configure({
            allowScopes: '*',
        });

        console.log('🚀 Flux Demo Activity Application is live');

        // Simulate agent connection every 200 ms
        for (let i = 0; i < 20; i++) {
            setTimeout(async () => {
                this.log('⭕ Connecting flux agent...');

                const fluxAgent: FluxAgent = new FluxAgent(
                    getNetworkId(),
                    {
                        domain: getFluxUrl(),
                    },
                );

                const fluxNetworkConnection: FluxAgentNetworkConnection = await fluxAgent.connect(
                    getAuthorityObject(
                        'client-a',
                    ),
                    `client-${fluxAgent.id.replaceAll('_', '-')}-uid-token`,
                );
                this.log(`🧠 Flux agent connected ${fluxAgent.id}`);

                this.networkConnections.add(fluxNetworkConnection);
                this.agents.add(fluxAgent);


                mayBeMaybeNot(() => {
                    callRandomly(() => this.disconnectFromNetwork(fluxAgent));
                });

                mayBeMaybeNot(() => {
                    callRandomly(() => this.connectToChannel(fluxNetworkConnection));
                });

            }, 200 * i);
        }
    },

    log(
        message: string,
    ) {
        const timestamp: string = new Date().toISOString();
        this.clientLog.push(`[${timestamp}] ${message}`);
    },

    async connectToChannel(
        fluxAgentNetworkConnection: FluxAgentNetworkConnection,
    ) {
        const channelName = `channel-${Math.floor(Math.random() * 10)}`;
        this.channels.add(channelName);
        await fluxAgentNetworkConnection.joinChannel(channelName);

        mayBeMaybeNot(() => {
            callRandomly(() => this.disconnectFromChannel(fluxAgentNetworkConnection, channelName));
        });
    },

    disconnectFromNetwork(
        fluxAgent: FluxAgent,
    ) {
        fluxAgent.disconnect();
        this.agents.delete(fluxAgent);
        //  this.networkConnections.delete(fluxAgent.networkConnection);
        this.log(`🚪 Disconnected from network ${fluxAgent.id}`);

        // Limit the log to max 50 entries
        if (this.clientLog.length > 50) {
            this.clientLog.length = 50;
        }
    },

    disconnectFromChannel(
        fluxAgentNetworkConnection: FluxAgentNetworkConnection,
        channelName: string,
    ) {
        this.log('🚪 Disconnected from channel.');
        fluxAgentNetworkConnection.leaveChannel(channelName);
        this.channels.delete(channelName);
    },
}));

const callRandomly = (
    fn: () => void,
) => setTimeout(() => fn(), Math.random() * 4000 + 1000);

const mayBeMaybeNot = (
    fn: () => void,
): void => {
    if (Math.random() > 0.5) {
        fn();
    }
};

console.log('⚙️ Starting alpine');
Alpine.start();
