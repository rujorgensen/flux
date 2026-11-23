# flux-lite

A small Flux **Agent** for devices that cannot run `@persistica/flux-agent`: microcontrollers (Espruino), or any
runtime with an HTTP POST and a WebSocket. It has no dependencies. It uses the Espruino transport by default; another runtime
passes its own transport (`post` and `open`). It runs on ES5 after a down-level build, and uses no `async`, `Map` or `Set`.

It does what an agent needs to read live data:

- sign on: POST the claim to `<domain>/auth/network-client`, then open `wss://<domain>/?token=<ticket>`;
- join channels, and join them again after every reconnect;
- receive `nc-on-pub` messages, and publish;
- keep the socket alive with `hb-ping` / `hb-pong`, and sign on again after a drop (new ticket each time).

Not here: Agent-to-Agent peering (WebRTC), payload encryption (`secretKey`), and RPC requests from the mesh.

```ts
const agent: IFluxLiteAgent = createFluxLiteAgent(
	{ domain: 'https://mesh.persistica.io', networkId: 'my-network', claim: 'device-id', agentUid: 'device-id' },
	{ state: (state, detail) => {}, message: (channel, data) => {}, error: (message) => {} },
);
agent.join('sensor-1');
```

The lightweight alternative to `@persistica/flux-agent`. `espruinoFluxTransport` (ESP32: `tls`/`net`) is the default transport; other runtimes pass their own.

Full docs: [docs/sdk/flux-lite.md](https://github.com/rujorgensen/flux/blob/main/docs/sdk/flux-lite.md).
