# ADR 0002: Disposable read projections

Beacon maintains a local SQLite read model for FTS search, canonical resolution lookup, recent activity, and event reporting. Drift remains authoritative. Writes go to Drift first. Projection errors mark the database stale, and a generation can be rebuilt entirely from active Drift records. The index is never included in authoritative backups.
