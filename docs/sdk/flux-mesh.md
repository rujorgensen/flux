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

## Notes

- Point every Agent and Authority at your mesh via the `domain` option, e.g. `new FluxAgent('my-network-id', { domain: 'https://mesh.example.com' })`.
- The Mesh is stateless beyond its coordination bus and never touches the Portal's database on the message hot-path.
