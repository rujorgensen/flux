# Flux Lite (`@persistica/flux-lite`)

A small Flux **Agent** for devices that cannot run [`@persistica/flux-agent`](./flux-agent.md):
microcontrollers such as an ESP32 with Espruino. It signs on, joins Channels, publishes and receives,
keeps a heartbeat, and reconnects. It has no dependencies. The caller gives it a *transport* for HTTP and
WebSocket, so the same code runs on Espruino, Bun or a browser.

Install: `npm i @persistica/flux-lite` (or `bun add @persistica/flux-lite`).

The package is ES5-safe after a down-level build: no `async`, `Map`, `Set`, classes or `setInterval`.
Timers are `setTimeout` chains, because the Espruino clock jumps after SNTP and an interval then fires
again and again to catch up.

## Prerequisite

As for any Agent, the Network needs at least one **Authority** ([`@persistica/flux-authority`](./flux-authority.md)).
Without one, the mesh answers the sign-on with 401, and flux-lite retries with backoff.

## Connect and exchange messages

```ts
import { createFluxLiteAgent, espruinoFluxTransport, type IFluxLiteAgent } from '@persistica/flux-lite';

const agent: IFluxLiteAgent = createFluxLiteAgent(
    {
        domain: 'https://mesh.persistica.io', // the Mesh, with protocol
        networkId: 'my-network-id',
        claim: 'device-1', // what the Authority's authorizeAgentConnection checks
        agentUid: 'device-1', // the device's own stable id
        transport: espruinoFluxTransport,
    },
    {
        state: (state, detail) => console.log(state, detail),
        message: (channel, data) => console.log(channel, data),
        error: (message) => console.log('mesh error', message), // an `e:` frame, e.g. "Not authorized"
    },
);

agent.join('probe-5-1');
agent.publish('probe-5-1', { t: 21.5 });
```

`createFluxLiteAgent` signs on at once. `join` and `leave` work at any time: flux-lite keeps the list of
wanted Channels and joins them again after each reconnect. `publish` while the socket is down drops the
message. Delivery is at-most-once, as in `@persistica/flux-agent`. Payloads use the same wire format
(`s:` for a string, `o:` for JSON), so a flux-lite device and a `FluxAgent` read each other's messages.

## Methods — `IFluxLiteAgent`

- `join(channel)` / `leave(channel)`.
- `publish(channel, data)` — `data` is a string or a JSON-serializable value.
- `stop()` — closes the socket and stops all timers. No reconnect after it.

## States — `TFluxLiteState`

| State | Meaning |
| --- | --- |
| `authorizing` | Posting the claim to `<domain>/auth/network-client`. |
| `connecting` | Opening `wss://<domain>/?token=<ticket>`, until the mesh sends `isReady`. |
| `connected` | Ready. Joins and publishes go out. |
| `disconnected` | The socket closed after it was ready. `detail` is `'kicked'` after a kick. |
| `auth-error` | A sign-on or a connect failed. `detail` tells why. Not terminal. |

There is no `waiting-for-authority` state: the mesh answers that case with 401, and flux-lite treats it as
any other failed sign-on.

## Reconnect behaviour

Every reconnect signs on again from the start, with a new ticket. The app does not reconnect.

| Event | Next sign-on |
| --- | --- |
| The socket closes after `connected` | after 2 s |
| The mesh kicks the agent (close reason `Kicked by process`) | after 30 min, as `RECONNECTION_DELAY_ON_KICK_MS` in the official client |
| A failed sign-on, or a socket that closes before `isReady` | backoff: 2 s, 4 s, 8 s, … up to 30 s |
| No `isReady` within 20 s of the socket open | the socket is dropped, then backoff |
| No `hb-pong` for one 25 s tick, after the mesh answered a ping before | the socket is dropped, then after 2 s |

A heartbeat tick runs every 25 s while connected. It sends `hb-ping` and joins again each Channel without
an ack (for example one that the Authority refused until now). A mesh that never answers a ping is older
than the heartbeat; flux-lite then does no dead-socket check.

## The transport interface — `IFluxLiteTransport`

```ts
interface IFluxLiteTransport {
    // One HTTP POST. done() gets the status and the body; status 0 means no answer.
    post(url: string, body: string, headers: Record<string, string>, done: (status: number, body: string) => void): void;
    open(url: string, events: IFluxLiteSocketEvents): IFluxLiteSocket;
}

interface IFluxLiteSocketEvents {
    open(): void;
    message(text: string): void;
    close(reason: string): void; // the close frame's reason, or ''
}

interface IFluxLiteSocket {
    send(text: string): void;
    close(): void;
}
```

Rules for a transport:

- Call `events.close` exactly once per socket, also when the open fails. Otherwise the agent learns of the
  drop only from a timeout (the 20 s ready timeout, or the heartbeat).
- Pass the reason from the server's close frame to `events.close`. Without it, flux-lite cannot see a kick,
  and it reconnects after 2 s, not after 30 min.
- `send` may throw on a socket that is already closed. flux-lite counts that as a drop.

## The Espruino transport — `espruinoFluxTransport`

An HTTP/1.0 POST and a minimal WebSocket client, over Espruino's `net` and `tls` modules.

- The POST owns its socket and times out after 20 s. It closes the socket before it answers, so that the
  TLS session's heap is free before the WebSocket opens. Only one TLS connection fits at a time on an ESP32.
- The WebSocket supports only what the mesh needs: text frames, fragments, ping and close. It does not check
  the handshake hash (Espruino has no SHA-1 here); the `101` status line is the check.
- Client frames use a zero mask key, to save RAM. Over `wss` the mask has no security function.
- Frames over 65,535 bytes close the socket.
- It reads the reason from the close frame (a 2-byte status code, then the reason).

## Not supported

- **Payload encryption** (`secretKey` in `@persistica/flux-agent`). Flux uses AES-256-GCM with PBKDF2, and
  Espruino has no GCM. A device sees and sends plain payloads.
- **WebRTC** (Agent-to-Agent peering, `onDirectPublish`).
- **RPC** requests from the mesh. flux-lite ignores them.

## Troubleshooting

- **`auth-error` with `no answer: …`** — the POST got no HTTP answer: no network, no TLS heap, or a timeout.
- **`auth-error` with `401 …`** — the Authority refused the claim, or no Authority is online.
- **`auth-error` with `socket closed before the mesh was ready: no isReady in 20 s`** — the handshake hung.
  Check the domain and the network between the device and the mesh.
- **`disconnected` with `kicked`** — an Authority removed the agent. flux-lite waits 30 min before it signs on.
