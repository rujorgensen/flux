# Agent-to-Agent data may bypass the Mesh via a Mesh-brokered WebRTC Peer Connection

Two Agents can establish a direct WebRTC Peer Connection and exchange data off the Mesh; the Mesh
brokers only the signaling handshake (offer/answer/ICE) over the existing WS connection. It exists as
a high-throughput / low-latency escape hatch a developer can opt into (e.g. a video link) for data
that shouldn't traverse the Mesh's pub/sub fan-out.

**Status: early / partial.** The developer-facing path exists but is unfinished. Outbound sending
(`FluxRemoteClient.send`) and inbound delivery (`FluxAgent.onDirectPublish`) are wired end-to-end, but
the following remain open:

- **Single peer only.** One `ICEConnection` per Agent; `connectToAgent()` reuses it, so a second call
  clobbers the first. Multi-peer needs a `Map<clientUID, ICEConnection>`.
- **No sender identity.** `onDirectPublish` delivers `(message)` without a `fromClientId` — per-peer
  identity depends on the multi-peer keying above.
- **No ICE candidate exchange.** `onicecandidate` only logs; candidates are never sent to the peer.
  Cross-network connections also need a TURN server.
- **Duplicated code.** The `authority` package carries its own `ICEConnection`; the inbound wiring
  landed in `agent` only. Both should be consolidated into `libs/flux/shared/connection`.

A future direction — not yet implemented — is for the Mesh to *automatically promote* qualifying Agents
onto a Peer Connection, giving them a higher data rate and offline capability while reducing load on
the Mesh.

## Consequences

- **Browser-gated** — requires `RTCPeerConnection`; unavailable in server/Bun Agents.
- **Needs NAT traversal** (STUN/TURN) to connect Agents across networks.
- **Invisible to the Mesh** — data on a Peer Connection is not seen by Member Distribution or
  Subscription limits, and not observable in Portal stats. Anything that must be metered or observed
  has to stay on the Mesh.
