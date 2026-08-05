# ADR 0004: Single-administrator authentication

Beacon v0.1.0 has one administrator. A deployment-provided setup token gates first-run creation of a Drift-backed admin vertex. Passwords use Argon2id. Browser sessions are signed, expiring, HTTP-only, same-site cookies; mutation requests also enforce same-origin submission. Multi-user roles and recovery workflows are deferred.
