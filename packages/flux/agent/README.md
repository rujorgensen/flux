# Flux Agent

```TypeScript
import { FluxAgent, FluxAgentNetworkConnection } from '@persistica/flux-agent';

const NETWORK_ID = 'network-id-to-connect-to';

const fluxAgent = new FluxAgent(NETWORK_ID);

// * Connect to network
const fluxNetworkConnection: FluxAgentNetworkConnection = await fluxAgent
    .connect(
        'CODE_TO_ACCESS_NETWORK',
    );

console.log(`✅ Agent connected to network ID: '${NETWORK_ID}'`);

// * Join network channel
const fluxConnectedAgentNetworkChannel: FluxNetworkChannel = await fluxNetworkConnection
    .joinChannel('connected-agents');

```