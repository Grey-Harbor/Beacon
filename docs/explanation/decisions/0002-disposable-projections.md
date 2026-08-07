# Disposable read projections

Use this decision record when changing search, resolution lookup, activity history, reporting, or SQLite storage. It explains why Beacon has a local index without making it a second authoritative database.

## Status

Accepted for v0.1.0.

## Context

The productivity UI needs full-text resource search, the Compactor source needs efficient canonical URL lookup, and reports need event filtering and aggregation. Drift is authoritative but does not provide every exact lookup, reverse-order, range, or aggregation operation needed for those reads.

## Decision

Beacon maintains `/data/beacon-index.sqlite` for FTS search, canonical URL → redirect ID lookup, management activity, event reporting, and freshness metadata. Authoritative writes go to Drift first; only then does Beacon attempt projection maintenance. Projection update failures mark the index stale and never roll back a successful Drift mutation. A rebuild rereads Drift records and replaces derived rows as a generation.

## Consequences

SQLite is disposable and excluded from authoritative backups. Search, reports, activity, and the resolution lookup can be temporarily stale; operators rebuild them after recovery or when Settings reports stale state. Resolution never trusts the index alone: it rereads redirect, edge, and destination records from Drift, and scans Drift on an index miss to self-heal. This trades occasional authoritative scans for bounded v0.1.0 behavior without introducing a durable duplicate. See [Architecture](../../../ARCHITECTURE.md#request-and-persistence-lifecycles) and [the API projection reference](../../reference/api.md#search-activity-projections-and-reports).
