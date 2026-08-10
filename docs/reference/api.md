# Beacon HTTP API reference

Use this page when integrating a browser client, configuring Compactor, or diagnosing an HTTP response. It defines implemented v0.1.0 routes, exact request validation, authentication, output shapes, and failures; it is the canonical Beacon-side reference for external contracts.

All management routes are same-origin under `/api/v1` and return JSON. Browser mutations require an authenticated `beacon_session` HTTP-only cookie and reject a present `Origin` header unless it matches `BEACON_BROWSER_ORIGIN` when configured; otherwise its host must equal the request host. API request bodies are limited to 256 KiB. Fastify applies a global limit of 180 requests per minute, with stricter setup and login limits noted below.

**Guaranteed** identifies the Beacon v0.1.0 contract. **Adapter-specific** identifies behavior caused by Drift or SQLite integration. **Recommended** identifies operational advice that an operator may deliberately adapt.

## Common behavior

All application errors use this shape. Validation errors additionally include an implementation-specific `details` array.

```json
{
  "error": {
    "code": "machine_code",
    "message": "Human-readable message"
  }
}
```

| Status | Meaning                                                                                                 | Caller action                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `400`  | Invalid or unknown request field, malformed URL/header, missing version, or invalid event               | Correct the request; strict event payloads reject unknown fields                     |
| `401`  | No valid browser session or integration bearer credential                                               | Authenticate or supply the correct endpoint-specific bearer token                    |
| `403`  | Invalid setup token or disallowed request origin                                                        | Use the deployment token or same-origin browser request                              |
| `404`  | Resource is absent, archived, disabled for resolution, or route is unknown                              | Do not use a projection result as proof that a redirect exists                       |
| `409`  | Setup is closed/in progress, a redirect conflicts, a destination is in use, or a Drift version is stale | Reload current state and make an explicit next change                                |
| `502`  | Drift graph state is malformed                                                                          | Repair the authoritative data before retrying                                        |
| `500`  | Unexpected server or Drift failure                                                                      | Treat the result as indeterminate; do not assume a projection reflects durable state |

## Identity and session routes

Use these routes for the single-administrator bootstrap and browser session lifecycle. Setup requires the deployment-provided token and permanently closes after an active admin vertex exists. Passwords must have at least 12 characters; usernames normalize to lowercase and must match `[a-z0-9._-]{3,64}`.

| Method   | Route                  | Authentication      | Request / response                                                          | Limits              |
| -------- | ---------------------- | ------------------- | --------------------------------------------------------------------------- | ------------------- |
| `GET`    | `/api/v1/setup/status` | None                | Returns `{ "configured": boolean }`                                         | Global rate limit   |
| `POST`   | `/api/v1/setup`        | Setup token in JSON | `{ "setupToken", "username", "password" }` → `{ "username" }`               | 5 requests / 15 min |
| `POST`   | `/api/v1/session`      | None                | `{ "username", "password" }` → `{ "username" }` and session cookie          | 8 requests / 15 min |
| `GET`    | `/api/v1/session`      | Optional            | Returns `{ "authenticated", "user" }`; `user` is `null` or `{ "username" }` | Global rate limit   |
| `DELETE` | `/api/v1/session`      | None                | Clears cookie and returns `{ "ok": true }`                                  | Global rate limit   |

Session cookies are path-wide, HTTP-only, strict same-site, and expire after 12 hours. When `BEACON_BROWSER_ORIGIN` is configured, its scheme controls the `Secure` flag: HTTPS uses `Secure`, while an explicit HTTP origin supports local development. Without that setting, production uses `Secure`. Session records are not stored durably; changing `BEACON_SESSION_SECRET` invalidates all existing sessions.

## Redirect and destination management

All routes in this section require a valid browser session. Successful redirect responses contain `id`, `title`, `slug`, canonical `sourceUrl`, `status`, `statusCode`, `responseHeaders`, `destination`, `version`, and `updatedAt`. Successful destination responses contain `id`, `title`, `url`, `version`, `updatedAt`, and may include `redirectCount`.

| Method   | Route                      | Request                                  | Result                                        |
| -------- | -------------------------- | ---------------------------------------- | --------------------------------------------- |
| `GET`    | `/api/v1/redirects`        | None                                     | All current redirects with their destinations |
| `GET`    | `/api/v1/redirects/:id`    | Path `id`                                | One redirect and its destination              |
| `POST`   | `/api/v1/redirects`        | Redirect input                           | Created redirect                              |
| `PATCH`  | `/api/v1/redirects/:id`    | Redirect input with current `version`    | Updated redirect                              |
| `DELETE` | `/api/v1/redirects/:id`    | `{ "version": positive-integer }`        | `{ "ok": true }` after Drift soft deletion    |
| `GET`    | `/api/v1/destinations`     | None                                     | All current destinations and reference counts |
| `POST`   | `/api/v1/destinations`     | Destination input                        | Created destination                           |
| `PATCH`  | `/api/v1/destinations/:id` | Destination input with current `version` | Updated destination                           |
| `DELETE` | `/api/v1/destinations/:id` | `{ "version": positive-integer }`        | `{ "ok": true }` after Drift soft deletion    |

### Redirect input

Provide exactly one destination choice: an existing `destinationId`, or an inline `destination` object to create. `slug` is lower-case URL-safe text matching `^[a-z0-9]+(?:-[a-z0-9]+)*$` and is unique case-insensitively. `title` is 1–160 trimmed characters. `status` defaults to `active`; updates must include `version`.

```json
{
  "title": "Documentation",
  "slug": "docs",
  "sourceUrl": "https://go.example/docs?campaign=spring",
  "destination": {
    "title": "Product docs",
    "url": "https://docs.example.com/start"
  },
  "status": "active",
  "statusCode": 302,
  "responseHeaders": {
    "Cache-Control": "no-store"
  }
}
```

`sourceUrl` must be an absolute HTTP(S) URL without credentials or backslashes. Beacon lowercases the scheme and host, removes default ports and query/fragment, and preserves the raw path case, escapes, repeated separators, and trailing slash. A source URL and slug must each be unique among current redirects. The only accepted status codes are `301`, `302`, `303`, `307`, and `308`. Response-header names and values must be valid HTTP fields; Beacon rejects Compactor-controlled `location`, `content-length`, `connection`, `transfer-encoding`, `date`, and `server` headers.

### Destination input and lifecycle

```json
{
  "title": "Product docs",
  "url": "https://docs.example.com/start",
  "version": 4
}
```

Destination URLs must be absolute. Archive a destination only after every redirect edge that points to it has been reassigned or removed; otherwise Beacon returns `409 destination_in_use` with a `redirectCount`. Disabling a redirect changes its status but does not archive it or remove its destination edge. Archiving is soft deletion in Drift.

## Search, activity, projections, and reports

Use these authenticated routes for management UI reads. Search, activity, event history, and reports are SQLite projections, so they can be stale after an authoritative write failure until rebuilt.

| Method | Route                         | Query / request                           | Result and limits                                                                           |
| ------ | ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/search`              | `q` (string, default empty)               | Up to 8 matching redirect/destination results; empty or punctuation-only query returns `[]` |
| `GET`  | `/api/v1/activity`            | None                                      | Ten most recent management activity rows                                                    |
| `GET`  | `/api/v1/events`              | Optional `redirectId`, `outcome`, `since` | Most-recent-first events; at most 100 for this route                                        |
| `GET`  | `/api/v1/reports/redirects`   | Optional `since`                          | Counts grouped by redirect and outcome                                                      |
| `GET`  | `/api/v1/projections`         | None                                      | Projection metadata including `status` and, after a rebuild, `rebuiltAt`                    |
| `POST` | `/api/v1/projections/rebuild` | None                                      | Reads Drift and rebuilds projection rows; returns resource counts                           |

`since` is compared to stored ISO timestamps. It is an input filter, not a retention policy. v0.1.0 retains authoritative events and activities indefinitely and provides no deletion or retention endpoint.

## Compactor integration

Use these server-to-server routes only when configuring Compactor 0.2. Browser cookies do not authorize them. Each endpoint has an independent bearer secret; callers send `Authorization: Bearer <token>`. Do not share either token with browsers or use one endpoint's token at the other endpoint.

### Resolve a redirect

`GET /integrations/compactor/v1/resolve?url=<canonical-or-raw-url>` requires `BEACON_SOURCE_TOKEN`. Beacon canonicalizes the provided URL, finds a candidate in its local resolution index, then rereads the redirect, edge, and destination from Drift before responding.

Success is `200` with exactly this shape:

```json
{
  "id": "redirect_123",
  "canonical_url": "https://go.example/docs",
  "redirect_url": "https://docs.example.com/start",
  "status_code": 302,
  "response_headers": {
    "Cache-Control": "no-store"
  }
}
```

Beacon returns an empty `404` for a missing, disabled, or archived redirect. A malformed URL is `400`; an invalid source token is `401`; malformed authoritative graph state or an upstream failure is an error rather than a false miss. A projection miss causes an authoritative scan and local self-heal before Beacon returns `404`.

### Ingest an event

`POST /integrations/compactor/v1/events` requires `BEACON_EVENT_TOKEN` and accepts only the exact strict Compactor event object below. Unknown fields at any nested level are invalid.

```json
{
  "event_id": "evt_123",
  "redirect_id": "redirect_123",
  "occurred_at": "2026-08-07T12:34:56.000Z",
  "duration_ms": 12.4,
  "outcome": "redirected",
  "client": {
    "address": "203.0.113.5",
    "user_agent": "Example Browser/1.0"
  },
  "request": {
    "method": "GET",
    "scheme": "https",
    "host": "go.example",
    "path": "/docs",
    "query": null,
    "protocol": "HTTP/1.1",
    "headers": {
      "accept": "text/html"
    }
  },
  "response": {
    "status_code": 302,
    "location": "https://docs.example.com/start"
  }
}
```

`event_id` is non-empty; `redirect_id`, `client.address`, `client.user_agent`, `request.query`, and `response.location` can be `null`. `occurred_at` must be an offset ISO datetime, `duration_ms` a finite non-negative number, `response.status_code` an integer from 100 through 599, and `outcome` one of `redirected`, `not_found`, `invalid_request`, or `source_error`.

Beacon returns `204` only after Drift persists the event vertex. It updates the reporting projection afterward; a projection failure marks projections stale and does not invalidate the `204`. Repeated events already present in the projection are idempotent. Compactor delivery remains best-effort, so an unavailable sink can lose an event; reporting is not billing-grade analytics.

For the broader ownership, cache, and recovery implications of these contracts, see [Architecture](../../ARCHITECTURE.md) and [the self-hosting guide](../how-to/self-hosting.md).
