# Flux Authority (`@persistica/flux-authority`)

An **Authority** authorizes Agents and Channels for a Network. It holds the Network Access Token and
must be online before any Agent can join. A Network may have several Authorities sharing the load.

Install: `npm i @persistica/flux-authority` (or `bun add @persistica/flux-authority`).

## Register an Authority

```ts
import { FluxAuthority } from '@persistica/flux-authority';

const authority = new FluxAuthority('my-network-id');

await authority.registerAuthority({
    networkAccessToken: process.env.NETWORK_ACCESS_TOKEN,       // the flx_… token, from the Portal
    authorizeAgentConnection: async (claim) => {                // return an identification string (e.g. a signed JWT)
        // Validate the claim; throw/reject to deny.
        return JSON.stringify({ allowAllChannels: true });
    },
    authorizeChannelAccess: async (channel, identification) => {
        // Return true to allow the Agent onto this channel.
        return true;
    },
});
```

## Notes

- `new FluxAuthority(networkId, options?)` takes the same `domain` / `secretKey` / `retries` options as the Agent. `domain` defaults to `https://mesh.persistica.io` and must point at the **Mesh**, not the Portal.
- `authorizeAgentConnection` receives the Agent's claim and returns an identification string that is later passed to `authorizeChannelAccess`. Use a signed JWT in production.
- `registerAuthority` rejects on an invalid token. Wrap it in `try/catch` so a bad token does not crash the process silently.
- `authority.onNetworkState(cb)` — subscribe to connection state. `authority.disconnect()` to leave.
