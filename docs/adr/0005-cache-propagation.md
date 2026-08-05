# ADR 0005: Cache propagation

The bundled deployment selects a 30-second Compactor cache TTL. Beacon communicates the propagation window and does not pretend to invalidate runtime state. Compactor's stale-on-source-failure behavior remains intact; cached definitions may continue to serve through a Beacon or Drift outage.
