# Redis-protocol coordination bus (DragonflyDB)

Flux coordinates all cross-Process and cross-Machine mesh state and message fan-out through a
Redis-protocol server — **DragonflyDB** in practice. It was chosen for familiarity and Dragonfly's
performance, and because the same store already holds mesh state (Channel Member sets, Authority
sorted-sets), so one system serves both state and pub/sub rather than running two.

## Considered / future direction

- **Cross-machine messaging:** Redis-style pub/sub is fire-and-forget (at-most-once, no replay). If
  delivery guarantees, ordering, or higher fan-out throughput are needed, **NATS** (core pub/sub, or
  JetStream for durability) is the purpose-built alternative — at the cost of a second system beside
  Dragonfly (kept for state). Not urgent; revisit only if messaging semantics/throughput bite.
- **Intra-machine (same-Machine, Process↔Process):** using the Redis bus for two Processes on the
  *same* Machine is deliberately temporary — it pays a network round-trip for a same-host hop. Intended
  to move to a same-host IPC path: **Unix domain sockets** first (simple, big latency win), reaching for
  a **shared-memory ring buffer** (zero-copy) only if profiling shows the socket path is the bottleneck.
