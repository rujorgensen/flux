# Flux Mesh (`@persistica/flux-mesh`)

The **Mesh** is the WebSocket data-plane server that routes messages between Clients. Use the hosted
mesh at `https://mesh.persistica.io`, or self-host with this package.

Install: `npm i @persistica/flux-mesh` (or `bun add @persistica/flux-mesh`).

## Run a mesh server

```ts
import { FluxMeshServer } from '@persistica/flux-mesh';

const mesh = new FluxMeshServer();
mesh.onReady(() => console.log('🚀 Mesh server running! Ready to receive connections.'));
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `port` | `5100` | Port to listen on. |
| `redisConnectionString` | `FLUX_MESH_REDIS_URL` | Coordination bus. |
| `hardcodedNetworkCredentials` | – | Network Access Tokens accepted without a Portal lookup. |
| `upgradeTokenTTL` | `'15m'` | Lifetime of the WebSocket upgrade token issued by `/auth/*`. |

The upgrade token gates the WebSocket upgrade only; live sockets are not re-checked. Agents and
Authorities re-run the auth handshake for every reconnect, so this is deliberately short and does not
limit how long a connection may stay up.

## Notes

- Point every Agent and Authority at your mesh via the `domain` option, e.g. `new FluxAgent('my-network-id', { domain: 'https://mesh.example.com' })`.
- The Mesh is stateless beyond its coordination bus and never touches the Portal's database on the message hot-path.
