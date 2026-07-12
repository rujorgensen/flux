# Strict separation of control plane (Portal) and data plane (Mesh)

The Portal owns all persistent configuration — Networks, Network Tokens, Subscriptions — in its
database; the Mesh owns none and is stateless beyond DragonflyDB. The boundary is strict, not just
layered: the message hot-path runs entirely in the Mesh and never calls the Portal or its database,
and the Portal never sits in the path of a published message.

This keeps message routing fast and independently scalable and keeps config/billing concerns out of
the real-time path. The trade-off: the Mesh must obtain any network config it enforces (e.g. limits)
via the shared store rather than reading the Portal's source-of-truth database directly, and the two
planes scale and deploy as separate concerns. Recorded because a future reader will otherwise wonder
why the Mesh has no database access — and may be tempted to "just add one" on the hot-path.
