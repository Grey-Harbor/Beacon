# Cache propagation

Use this decision record when setting Compactor cache values or communicating the effect of a redirect mutation. It prevents Beacon from promising immediate redirect-runtime propagation it cannot provide.

## Status

Accepted for the bundled v0.1.0 Compose deployment.

## Context

Compactor caches source definitions to protect redirect availability and source load. Beacon has no targeted cache-invalidation integration in v0.1.0, so a management write cannot immediately remove an already cached redirect definition from the runtime.

## Decision

The Compose deployment pins `COMPACTOR_REDIRECT_CACHE_TTL_SECONDS=30`. Beacon communicates this maximum configured propagation interval in the UI and operational guidance. It does not claim cache invalidation or override Compactor's stale-on-source-failure behavior.

## Consequences

Edits, disables, and archives can take up to 30 seconds to affect a cache miss or cache expiry at Compactor. A cached definition may continue serving during a Beacon or Drift outage. Operators who require lower latency must make an explicit deployment-level cache decision and understand the availability/load tradeoff; Beacon must not infer it. See [the self-hosting guide](../../how-to/self-hosting.md) and [the integration architecture](../../../ARCHITECTURE.md#security-and-operational-boundaries).
