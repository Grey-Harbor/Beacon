# ADR 0003: Compactor HTTP boundary

Beacon implements Compactor 0.2's HTTP source and event contracts without extension. Resolution returns an exact validated definition or an authoritative 404. Event ingestion accepts the strict sanitized event object and acknowledges only after Drift persists it. Separate bearer credentials isolate source reads from event writes.
