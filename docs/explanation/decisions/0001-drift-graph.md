# Drift graph mapping

Use this decision record when changing redirect, destination, event, activity, or administrator persistence. It keeps Drift authoritative while making Beacon's required relationships and lifecycle rules explicit.

## Status

Accepted for v0.1.0.

## Context

Beacon needs reusable destinations, one redirect target at a time, optimistic versions, tenant isolation, and durable history. A local relational model would duplicate Drift's authority and create another source of truth.

## Decision

- Store redirects as `beacon.redirect` vertices and destinations as `beacon.destination` vertices.
- Store exactly one active outgoing `points_to` edge from each redirect to its destination. Many redirects may share a destination.
- Store Compactor observations as immutable, unconnected `beacon.event` vertices, with `externalId` containing the event ID and `data` preserving the complete event object.
- Store management actions as immutable, unconnected `beacon.activity` vertices with actor, resource identity, action, timestamp, and version metadata.
- Store the one administrator as a `beacon.admin` vertex holding a normalized username and Argon2id password hash.
- Let Drift own identifiers, tenant isolation, timestamps, optimistic versions, and soft deletion. Let Beacon own field semantics, source canonicalization, destination reuse, and lifecycle validation.

## Consequences

Drift reads are required for authoritative management and resolution. Archiving a redirect or destination means Drift soft deletion, not an inferred local state. A destination cannot be archived while redirect edges still reference it. Events and activities intentionally have no graph edge to redirects, so downstream consumers must not assume relationship traversal exists. See [Architecture](../../../ARCHITECTURE.md#data-model-and-lifecycle-invariants) for the implemented record fields and [disposable read projections](./0002-disposable-projections.md) for derived SQLite rows.
