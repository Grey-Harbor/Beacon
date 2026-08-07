# Beacon

Use Beacon to manage self-hosted redirect infrastructure backed by Drift and executed by Compactor. Start with the [getting-started tutorial](./docs/tutorial/getting-started.md) for local development or the [self-hosting guide](./docs/how-to/self-hosting.md) for the bundled Compose deployment.

Beacon is a focused management application, not a redirect runtime, analytics platform, or multi-user administration console. Drift owns authoritative persistence and tenant isolation. Compactor owns redirect execution, caching, and event production. Beacon owns management workflows and rebuildable read projections.

v0.1.0 provides search-first redirect and destination management, active/disabled/archive lifecycles, destination reuse, QR code export, first-run single-administrator setup, management activity, Compactor event history, basic reports, and rebuildable SQLite projections.

Use [the documentation index](./docs/README.md) to select tutorials, how-to guides, reference, or explanations. [Architecture](./ARCHITECTURE.md) defines system boundaries, and [RELEASE.md](./RELEASE.md) is the canonical current-release summary and annotated-tag description.
