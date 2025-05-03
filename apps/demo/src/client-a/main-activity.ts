import Alpine from 'alpinejs';
import { FluxAgent } from '@persistica/flux-agent';
import { DEMO_CHANNEL_PASSWORD, DEMO_NETWORK_ID } from '../definitions';
import type { FluxAgentNetworkConnection } from '@flux/shared/connection';

Alpine.data('fluxActivityDemoApplication', () => ({
    agents: new Set<FluxAgent>(),
    networkConnections: new Set<FluxAgentNetworkConnection>(),
    channels: new Set<string>(),
    clientLog: new Array<string>(0),

    init() {
        console.log('🚀 Flux Demo Activity Application is live');

        // Simulate agent attachment every 2 seconds
        setInterval(async () => {
            const fluxAgent: FluxAgent = new FluxAgent(DEMO_NETWORK_ID);

            const fluxNetworkConnection: FluxAgentNetworkConnection = await fluxAgent.connect(
                {
                    code: DEMO_CHANNEL_PASSWORD,
                    user: 'client-a',
                },
                `client-${fluxAgent.id}}-unique-identification-token`,
            );

            this.networkConnections.add(fluxNetworkConnection);
            this.agents.add(fluxAgent);

            this.log(`🧠 Attached and connected ${fluxAgent.id}`);

            callRandomly(() => this.disconnectFromNetwork(fluxAgent));

            callRandomly(() => this.connectToChannel(fluxNetworkConnection));

        }, 200);
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

        callRandomly(() => this.disconnectFromChannel(fluxAgentNetworkConnection, channelName));
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

console.log('⚙️ Starting alpine');
Alpine.start();
