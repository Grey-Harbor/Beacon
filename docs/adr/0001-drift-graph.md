# ADR 0001: Drift graph mapping

Redirects and destinations are typed Drift vertices connected by exactly one active `points_to` edge per redirect. Many redirects may share one destination. Events and management activities are immutable, unconnected vertices. Drift owns IDs, tenant isolation, versions, timestamps, and soft deletion; Beacon owns field meaning and lifecycle rules.
