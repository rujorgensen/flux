# Flux

Flux is a WebSocket **mesh**: participants connect over sockets to a distributed set of mesh
processes and exchange messages within named **Networks** and their **Channels**. This document is
the ubiquitous language of the mesh domain — a glossary, not a spec.

## Language

### Planes

**Mesh**:
The data plane — the WebSocket server Processes (spread across Machines, coordinated via DragonflyDB)
that authorize joins and route messages between Members in real time. Stateless beyond Dragonfly: it
holds no persistent configuration and never touches the Portal's database on the message hot-path.

**Portal**:
The control plane — a Prisma-backed application (backend API + dashboard frontend) that manages
Networks, rotates Network Tokens, sets Subscriptions, and surfaces live stats. It owns all persistent
configuration and never sits in the message hot-path.

### Participants

**Client**:
Any party holding a live socket connection to the mesh. The base concept — every connected party is
a Client, identified by a Client ID and reachable at an Address. An Agent and an Authority are the
two roles a Client can play.

**Client ID** (`TClientId`):
The mesh-assigned, per-connection identifier for a Client (a server-generated nanoid). Distinct from
an Agent UID.
_Avoid_: socket id

**Agent** (`FluxAgent`):
A Client that participates in a Network — joins Channels, publishes and subscribes, and can peer
directly with other Agents. Carries its own caller-supplied Agent UID in addition to its Client ID.
_Avoid_: Client (an Agent is a *kind of* Client, not a synonym), Peer, Node

**Agent UID** (`TAgentOwnUId`):
An Agent's own, caller-supplied, stable identifier — chosen by the connecting application, not
assigned by the mesh. Distinct from the Client ID.
_Avoid_: clientUID, ownUID (the code mixes these; "Agent UID" is canonical)

**Authority** (Network Authority):
A Client that authorizes Agents to join a specific Network by verifying their claim. A Network may
have **many** Authorities, which share the authorization load. Identified by its Client ID and
Address; has no Agent UID.
_Avoid_: Network owner (a Network is not owned by a single Authority), verifier

### Networks

**Network**:
A named, hard-isolated namespace on the mesh that Agents join to exchange messages. Agents and
Channels always belong to exactly one Network — there is no cross-Network messaging. Authorized by
one or more Authorities, capped by a Subscription, and accessed via Network Tokens.

**Network Token** (`TNetworkToken_S`):
The Network's secret, managed and rotated by the Portal. It serves two purposes with one value: an
Authority presents a valid Network Token to register itself for the Network, and the Portal API
validates it for control-plane reads. A Network can have several; exactly one is primary; a retired
token carries a `rotatedOutAt`.
_Avoid_: Network Access Token, API key (the authority-registration token *is* the Network Token)

**Agent Claim**:
The credential an Agent presents when requesting to join a Network. An Authority verifies it via its
`authorizeAgentConnection` callback; the verification logic is application-defined, not prescribed by
the mesh (a parallel `authorizeChannelAccess` gates per-Channel joins). Distinct from a Network Token
— Agents never hold a Network Token.
_Avoid_: access code, agent token

**Subscription**:
A Network's plan — `free`, `medium`, or `high` — that caps the number of Members allowed per Channel
(25 / 500 / 100 000).
_Avoid_: Plan, tier (use "Subscription")

### Channels

**Channel**:
A pub/sub topic scoped to one Network. An Agent joins a Channel as a Member, publishes messages to it,
and receives other Members' messages via `onPublish`. A Channel exists only while it has Members — it
is deleted when the last Member leaves.

**Member** (Channel Member):
An Agent that has joined a Channel, located by its Address. The Network's Subscription caps the number
of Members per Channel.
_Avoid_: subscriber, participant

### Topology & routing

**Machine**:
A physical or virtual host running one or more mesh Processes.

**Process**:
A single mesh server process on a Machine. Clients connect to a Process; many Processes across many
Machines together form the mesh.

**Address** (`machine/process/client`):
A Client's full location on the mesh — its Machine, the Process it is connected to, and its Client ID.
Routing uses the Address to reach a Client.

**Member Distribution** (`TMemberDistribution`):
A derived classification of how a Channel's Members are spread across the topology — `same-process`,
`same-machine`, or `distributed` — used to avoid unnecessary cross-Process/-Machine fan-out when a
message is published.
