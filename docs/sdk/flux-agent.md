# Flux Agent (`@persistica/flux-agent`)

Connect an **Agent** to a Flux network, join Channels, and publish/subscribe over the Flux mesh.
Agents run on end-user (untrusted) machines. An Agent holds a *claim*, never the Network Access Token.

Install: `npm i @persistica/flux-agent` (or `bun add @persistica/flux-agent`).

## Prerequisite

A network needs at least one **Authority** ([`@persistica/flux-authority`](./flux-authority.md))
registered on it before any Agent can join. With none present, `connect()` stays in the
`waiting-for-authority` state and keeps retrying until one appears, then rejects with
`NetworkAuthorityNotFoundError`.

## Connect and exchange messages

```ts
import { FluxAgent, type FluxAgentNetworkConnection, type FluxNetworkChannel } from '@persistica/flux-agent';

const agent = new FluxAgent('my-network-id');

// identification is a string or JSON-serializable object — whatever the Authority's
// authorizeAgentConnection callback expects. Second arg is your own stable Agent UID.
const connection: FluxAgentNetworkConnection = await agent.connect({ user: 'alice', code: 'secret' }, 'alice');

const channel: FluxNetworkChannel = await connection.joinChannel('connected-agents');
channel.onPublish<{ text: string }>((msg) => console.log('received', msg));
channel.publish({ text: 'hello mesh' });
```

`publish` broadcasts to every *other* member of a Channel (never echoes to the sender). Delivery is
fire-and-forget / at-most-once.

## Constructor options — `new FluxAgent(networkId, options?)`

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `domain` | `string` | `https://mesh.persistica.io` | Mesh URL incl. protocol. Override only for self-hosted Flux. Point at the **Mesh**, not the Portal. |
| `secretKey` | `string` | – | Optional client-side payload encryption key. Not known to Flux. |
| `retries` | `number` | `10000` | Times to retry a failed message send. |

The wait budget for `connect()` while no Authority is present is fixed by the SDK (not configurable)
because Agents run on untrusted machines.

## Methods

- `agent.connect(identification, agentUid?) → Promise<FluxAgentNetworkConnection>` — authenticates the claim and opens the socket. Rejects on a bad claim, an unreachable/incorrect mesh, or after the retry budget with no Authority present.
- `agent.onNetworkState(cb)` — subscribe to connection state. Always attach this.
- `agent.onMessage(cb)` — messages delivered to the agent.
- `agent.onDirectPublish(cb)` — off-mesh WebRTC peer messages (sender identity is not mesh-stamped).
- `agent.disconnect()`.
- `connection.joinChannel(name) → Promise<FluxNetworkChannel>` / `connection.leaveChannel(name)`.
- `channel.publish(message)` / `channel.onPublish(cb)`.

## Network states — `TNetworkConnectionState`

| State | Meaning |
| --- | --- |
| `authorizing` | Verifying the claim with the mesh. |
| `waiting-for-authority` | Authenticated, but no Authority is registered on the network yet. Retrying until one appears. |
| `connecting` | Opening the WebSocket. |
| `connected` | Ready to join channels and exchange messages. |
| `auth-error` | `connect()` rejected (bad claim, unreachable mesh, or authority never appeared). |
| `disconnected` / `kicked` | Socket closed / removed by an Authority. Not terminal: the SDK signs on again by itself — after ~2 s for a plain disconnect, after 30 min for a kick — and if an attempt fails it keeps retrying with backoff (capped at 30 s), forever. Do not build reconnection app-side; just listen for the state changes. |

## Error-handling pattern

Always attach a state listener and catch the rejection:

```ts
const agent = new FluxAgent('my-network-id');

agent.onNetworkState((state) => {
    if (state === 'waiting-for-authority') {
        console.warn('No Authority online yet — is your authority process running?');
    }
});

try {
    const connection = await agent.connect({ user: 'alice' });
} catch (err) {
    // e.g. NetworkAuthorityNotFoundError — no Authority ever appeared
    console.error('Flux connect failed:', err);
}
```

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Stuck on `waiting-for-authority`, then `NetworkAuthorityNotFoundError` | No Authority running on the network | Start your `@persistica/flux-authority` process first; verify its Network Access Token. |
| Rejects with `Auth failed: 401` | Claim rejected by the Authority | Send what `authorizeAgentConnection` expects. |
| Rejects with `Mesh server not found` (404) | Wrong `domain` | Use the mesh URL (`https://mesh.persistica.io`), with protocol — not the Portal. |
| `❗WebRTC is not available` warning | Running off-browser (Node/Bun) | Harmless. Only Agent-to-Agent peering needs WebRTC; channel messaging goes over the mesh. |
