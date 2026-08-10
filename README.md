![Beacon](https://beacon.greyharborsoftware.com/brand/social-card.png)

# Beacon

Beacon is a focused redirect-management application for teams that want link operations to stay understandable.

It gives operators a calm, search-first place to create redirects, reuse destinations, review activity, and understand runtime events—while [Drift][drift] keeps authoritative state and [Compactor][compactor] serves redirect traffic.

Visit the [Beacon project site](https://beacon.greyharborsoftware.com) for a concise public overview.

## Start here

- [Getting started tutorial](./docs/tutorial/getting-started.md) — connect a Drift tenant, run Beacon locally, and create your first redirect.
- [Self-hosting guide](./docs/how-to/self-hosting.md) — deploy the bundled Beacon, Drift, and Compactor stack with Compose.
- [API reference](./docs/reference/api.md) — management routes, Compactor integration contracts, validation, and failures.
- [Environment reference](./docs/reference/environment.md) — every setting, default, secret, and bundled service mapping.
- [Architecture](./ARCHITECTURE.md) — ownership, persistence, security, and extension boundaries.
- [Current release](./RELEASE.md) — supported behavior, operational notes, and known limits for v0.1.0.

## Run the complete stack

Beacon includes a Compose topology that builds the management application and tracks the latest Drift and Compactor images. Follow the [self-hosting guide](./docs/how-to/self-hosting.md) to generate independent credentials, bootstrap the Drift tenant, update the services, and place the management interface behind HTTPS.

## Why it exists

Redirects rarely stay as a handful of source and destination pairs. They become shared operational data with lifecycle state, reusable targets, activity history, runtime events, and people who need to understand what will happen before they publish a change.

Beacon keeps that work explicit:

- search brings redirects, destinations, and common actions into one workspace;
- reusable destinations keep shared target changes intentional;
- Drift remains authoritative while local SQLite projections stay disposable and rebuildable;
- Compactor owns redirect execution, caching, and event production;
- optimistic versions surface concurrent edits instead of silently overwriting them; and
- activity, request history, reports, and QR export stay close to the assets they describe.

## What it is not

Beacon is not a redirect runtime, hosted link platform, billing-grade analytics system, identity provider, or general-purpose administration console. v0.1.0 deliberately supports one Drift tenant, one administrator, and one Beacon replica. Redirect changes can take up to the configured 30-second Compactor cache window to propagate.

Use [the documentation index](./docs/README.md) when you need a tutorial, focused operating procedure, exact reference, or architectural explanation.

## License

Beacon is licensed under the [Apache License, Version 2.0](./LICENSE).

[compactor]: https://compactor.greyharborsoftware.com
[drift]: https://drift.greyharborsoftware.com
