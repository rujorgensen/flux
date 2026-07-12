# The Mesh is the trusted routing & identity authority; Clients are untrusted

The Mesh is operator-hosted (by us, or by a self-hoster) and trusted. Agents and Authorities run on
third-party machines and are **not** trusted. Therefore the Mesh never honours routing, destination,
or sender-identity claims made by a Client: it assigns each Client its Client ID, stamps that
authoritative id onto every delivered frame, and only routes a publish to a Channel the sender is
actually a Member of.

This prevents a malicious Client from spoofing another sender or targeting an arbitrary destination.
It is also why a Message's application payload is opaque to the Mesh while its sender Client ID is
Mesh-assigned rather than Client-supplied: apps trust the Mesh for *which Client* sent a Message, and
map Client ID → app-level identity via the Agent's join-time Claim (verified by the app's Authority),
never via anything a Client puts into a Message.

The trust direction is easy to invert on a casual read (the Mesh sounds like "someone else's server"),
which is exactly why it is recorded here.
