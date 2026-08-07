# Beacon architecture decisions

Use these explanation records when evaluating or changing a durable architectural choice. Each decision record states the v0.1.0 context, decision, and consequences; implementation and API details remain canonical in [Architecture](../../../ARCHITECTURE.md) and [the HTTP API reference](../../reference/api.md).

| Decision                                                        | Use it when                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Drift graph mapping](./0001-drift-graph.md)                    | Changing resource relationships, lifecycle, or authoritative record fields |
| [Disposable read projections](./0002-disposable-projections.md) | Changing SQLite indexing, rebuilds, or write ordering                      |
| [Compactor HTTP boundary](./0003-compactor-http.md)             | Changing source resolution or event ingestion contracts                    |
| [Single-administrator authentication](./0004-authentication.md) | Changing setup, passwords, sessions, or browser mutation protection        |
| [Cache propagation](./0005-cache-propagation.md)                | Changing deployment cache configuration or communicating mutation timing   |
