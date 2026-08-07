# ADR 0003: Compactor HTTP boundary

Use this decision when modifying redirect resolution or event ingestion. It preserves exact Compactor 0.2 source and event-sink semantics instead of treating Beacon as a new redirect runtime.

## Status

Accepted for v0.1.0.

## Context

Compactor owns redirect execution, response behavior, caching, and event production. Beacon needs to provide its configured source definitions and receive its observations without leaking Drift credentials or altering Compactor's contract.

## Decision

Beacon exposes bearer-authenticated `GET /integrations/compactor/v1/resolve` and `POST /integrations/compactor/v1/events` endpoints with independent secrets. Resolution returns the exact ID, canonical URL, destination URL, supported status code, and response-header object, or an authoritative empty `404` for a missing, disabled, or archived redirect. Event ingestion strictly validates the complete Compactor object and returns `204` only after the immutable event vertex persists in Drift.

## Consequences

Browser sessions cannot call these integration endpoints, and Compactor never receives Drift credentials. Contract changes require source fixtures/tests plus synchronized updates to [the HTTP API reference](../reference/api.md) and [Architecture](../../ARCHITECTURE.md). Event reporting updates happen after Drift persistence, so a projection failure does not invalidate a successful acknowledgement. Compactor has no Beacon-managed durable spool or retry policy: a sink outage can lose events.
