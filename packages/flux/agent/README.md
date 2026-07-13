# @persistica/flux-agent

Connect an **Agent** to a Flux network, join channels, and publish/subscribe over the Flux mesh.

```bash
bun add @persistica/flux-agent    # or: npm i @persistica/flux-agent
```

```ts
import { FluxAgent } from '@persistica/flux-agent';

const agent = new FluxAgent('my-network-id');

// The argument is your claim — whatever your Authority accepts.
const connection = await agent.connect({ user: 'alice' });

const channel = await connection.joinChannel('connected-agents');
channel.onPublish((msg) => console.log('received', msg));
channel.publish({ text: 'hello mesh' });
```

> A network needs an **Authority** ([`@persistica/flux-authority`](../authority/README.md)) running
> before any Agent can join. With none present, `connect()` stays in the `waiting-for-authority`
> state and keeps retrying. Attach `agent.onNetworkState(...)` and wrap `connect()` in a `try/catch`
> to observe this.

Full reference (options, connection states, error handling, troubleshooting):
[docs/sdk/flux-agent.md](../../../docs/sdk/flux-agent.md).
