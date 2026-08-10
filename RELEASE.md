# Beacon v0.1.0

Use this page when preparing the annotated `v0.1.0` release tag or assessing the current release's supported behavior and limits. It is the canonical release summary; use [the documentation index](./docs/README.md) for operational instructions and exact contracts.

Beacon v0.1.0 is the first end-to-end management application built on [Drift][drift] and [Compactor][compactor].

## Highlights

- Global search-first redirect and reusable destination management from every authenticated page.
- Active, disabled, and archived resource lifecycles with optimistic conflict handling.
- Exact [Compactor][compactor] 0.2 HTTP source and event-sink adapters.
- [Drift][drift]-backed single-administrator setup with Argon2id password hashing and signed browser sessions.
- Rebuildable SQLite projections for search, resolution, activity, event history, and reporting.
- Redirect QR code export, inline statistics, recent management activity, and calm table-based reporting.
- A keyboard-accessible two-row navigation shell with asset suggestions, application commands, and account actions.
- Reliable bodyless account sign-out and projection rebuild requests.
- Session cookies stay secure for HTTPS management origins while an explicit local HTTP origin supports Compose-based development.
- Consistently aligned editor fields when adjacent controls include supporting guidance.
- A composed Next.js 16 and React 19 interface with focused screen and presentation modules.
- A guided-beam visual identity shared by the application and public documentation website.
- A self-hosted Compose topology that tracks the `latest` [Drift][drift] and [Compactor][compactor] images with a 30-second redirect cache TTL.
- Beacon is available under the [Apache License, Version 2.0](./LICENSE).

## Operational notes

- [Drift][drift] is authoritative; Beacon's local SQLite read model is disposable and rebuildable.
- [Compactor][compactor] event delivery is best-effort and reporting is not billing-grade analytics.
- Redirect mutations can take up to the configured 30-second cache TTL to propagate.
- Configure Beacon behind HTTPS, keep [Drift][drift] private, and provide independent source, event, setup, and session secrets.
- The bundled Compose file tracks external images with `latest`; approve updates deliberately and use a specific tag when a repeatable rollback point is required.

## Known limits

Beacon v0.1.0 supports one [Drift][drift] tenant, one administrator, and one Beacon replica. Import/export, restore UI, multi-user roles, event retention controls, external analytics, and targeted [Compactor][compactor] cache invalidation are deferred.

[compactor]: https://compactor.greyharborsoftware.com
[drift]: https://drift.greyharborsoftware.com
