# Beacon architecture decisions

Use these records when evaluating or changing a durable architectural choice. Each ADR records the v0.1.0 decision, why it exists, and its consequences; implementation and API details remain canonical in [Architecture](../../ARCHITECTURE.md) and [the HTTP API reference](../reference/api.md).

| ADR                                      | Decision                            | Use it when                                                                |
| ---------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| [0001](./0001-drift-graph.md)            | Drift graph mapping                 | Changing resource relationships, lifecycle, or authoritative record fields |
| [0002](./0002-disposable-projections.md) | Disposable read projections         | Changing SQLite indexing, rebuilds, or write ordering                      |
| [0003](./0003-compactor-http.md)         | Compactor HTTP boundary             | Changing source resolution or event ingestion contracts                    |
| [0004](./0004-authentication.md)         | Single-administrator authentication | Changing setup, passwords, sessions, or browser mutation protection        |
| [0005](./0005-cache-propagation.md)      | Cache propagation                   | Changing deployment cache configuration or communicating mutation timing   |
