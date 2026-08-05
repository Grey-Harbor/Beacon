# Beacon HTTP API

All management routes are same-origin under `/api/v1` and return JSON. Except setup and session creation, they require the `beacon_session` HTTP-only cookie. Browser mutations reject cross-origin requests. Expected errors use:

```json
{ "error": { "code": "machine_code", "message": "Human-readable message" } }
```

## Identity

| Method   | Route                  | Purpose                                                           |
| -------- | ---------------------- | ----------------------------------------------------------------- |
| `GET`    | `/api/v1/setup/status` | Report whether the one-time setup is complete.                    |
| `POST`   | `/api/v1/setup`        | Create the single admin with setup token, username, and password. |
| `POST`   | `/api/v1/session`      | Authenticate and set the session cookie.                          |
| `GET`    | `/api/v1/session`      | Read current session state.                                       |
| `DELETE` | `/api/v1/session`      | Clear the session.                                                |

## Management

| Method               | Route                         | Purpose                                                      |
| -------------------- | ----------------------------- | ------------------------------------------------------------ |
| `GET, POST`          | `/api/v1/redirects`           | List or create redirects.                                    |
| `GET, PATCH, DELETE` | `/api/v1/redirects/:id`       | Read, edit, or archive a redirect.                           |
| `GET, POST`          | `/api/v1/destinations`        | List or create destinations.                                 |
| `PATCH, DELETE`      | `/api/v1/destinations/:id`    | Edit or archive a destination.                               |
| `GET`                | `/api/v1/search?q=`           | Search the disposable resource index.                        |
| `GET`                | `/api/v1/activity`            | Read the ten latest management actions.                      |
| `GET`                | `/api/v1/events`              | Filter recent events by redirect, outcome, or ISO timestamp. |
| `GET`                | `/api/v1/reports/redirects`   | Return event counts grouped by redirect.                     |
| `GET`                | `/api/v1/projections`         | Read projection freshness.                                   |
| `POST`               | `/api/v1/projections/rebuild` | Rebuild every projection from Drift.                         |

PATCH and DELETE payloads require the current positive integer `version`. A stale version returns `409` without silently overwriting the record.

## Compactor integration

`GET /integrations/compactor/v1/resolve?url=` implements the Compactor 0.2 HTTP source protocol and requires the source bearer token. `POST /integrations/compactor/v1/events` implements the strict event-sink protocol and requires its independent event bearer token. The latter returns `204` only after Drift persists the event.
