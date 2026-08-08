![Beacon](https://beacon.greyharborsoftware.com/brand/social-card.png)

# Beacon

Use Beacon to create, organize, and understand redirects from one focused management application. Start with the [getting-started tutorial](./docs/tutorial/getting-started.md) for local development or the [Compose deployment guide](./docs/how-to/self-hosting.md) for production.

Beacon is a focused management application, not a redirect runtime, analytics platform, or multi-user administration console. [Drift][drift] owns authoritative persistence and tenant isolation. [Compactor][compactor] owns redirect execution, caching, and event production. Beacon owns management workflows and rebuildable read projections.

v0.1.0 provides search-first redirect and destination management, active/disabled/archive lifecycles, destination reuse, QR code export, first-run single-administrator setup, management activity, [Compactor][compactor] event history, basic reports, and rebuildable SQLite projections.

Use [the documentation index](./docs/README.md) to select tutorials, how-to guides, reference, or explanations. [Architecture](./ARCHITECTURE.md) defines system boundaries, and [RELEASE.md](./RELEASE.md) is the canonical current-release summary and annotated-tag description.

[compactor]: https://compactor.greyharborsoftware.com
[drift]: https://drift.greyharborsoftware.com
