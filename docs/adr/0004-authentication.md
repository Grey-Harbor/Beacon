# ADR 0004: Single-administrator authentication

Use this decision when changing setup, credentials, session handling, or browser mutation protection. It defines the intentionally narrow v0.1.0 identity model and its security boundaries.

## Status

Accepted for v0.1.0.

## Context

Beacon is deployed for one pre-provisioned Drift tenant and has one administrator in v0.1.0. Adding durable sessions or a role system would increase persistence and recovery surface without a current product requirement.

## Decision

First-run creation requires both a deployment-provided setup token and user-supplied valid username/password. Beacon stores one normalized username and Argon2id password hash in a Drift admin vertex. Browser authentication uses signed, expiring, HTTP-only, same-site cookies with a deployment-provided session secret. Mutation endpoints require a valid session and enforce same-origin requests when an Origin header is supplied. Compactor uses separate bearer credentials rather than browser sessions.

## Consequences

There is no durable session table, role model, recovery workflow, password-reset flow, or multi-user support. Rotating the session secret invalidates active sessions; rotating the setup token does not reopen setup after the admin vertex exists. Operators must protect all deployment secrets and terminate HTTPS in front of production Beacon. See [the identity reference](../reference/api.md#identity-and-session-routes) for exact inputs and cookie behavior.
