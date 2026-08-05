# Beacon v0.1.0

Beacon v0.1.0 is the first end-to-end management application built on Drift and Compactor.

## Highlights

- Search-first redirect and reusable destination management.
- Active, disabled, and archived resource lifecycles with optimistic conflict handling.
- Exact Compactor 0.2 HTTP source and event-sink adapters.
- Drift-backed single-administrator setup with Argon2id password hashing and signed browser sessions.
- Rebuildable SQLite projections for search, resolution, activity, event history, and reporting.
- Redirect QR code export, inline statistics, recent management activity, and calm table-based reporting.
- A composed Next.js 16 and React 19 interface with focused screen and presentation modules.
- A self-hosted Compose topology pinned to Drift v0.1.0 and Compactor v0.2.0 with a 30-second redirect cache TTL.

## Operational notes

- Drift is authoritative; Beacon's local SQLite read model is disposable and rebuildable.
- Compactor event delivery is best-effort and reporting is not billing-grade analytics.
- Redirect mutations can take up to the configured 30-second cache TTL to propagate.
- Configure Beacon behind HTTPS, keep Drift private, and provide independent source, event, setup, and session secrets.

## Known limits

Beacon v0.1.0 supports one Drift tenant, one administrator, and one Beacon replica. Import/export, restore UI, multi-user roles, event retention controls, external analytics, and targeted Compactor cache invalidation are deferred.
