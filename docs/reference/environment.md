# Environment variables

Use this reference when configuring Beacon, diagnosing a startup validation error, or rotating a credential. It defines every environment variable read by the Beacon server and explains the related Compactor settings in the bundled Compose stack.

## How Beacon loads configuration

**Guaranteed:** Beacon reads configuration from its process environment once during startup. Missing required values or invalid values stop startup with a validation error. Restart Beacon after changing any value.

The server does not load a `.env` file itself. For local development, copy [`.env.example`](../../.env.example), replace its placeholders, and export it before running Beacon:

```sh
cd /path/to/beacon
set -a
. ./.env
set +a
npm run dev
```

To generate all four Beacon credentials in `zsh` or `bash`, run the helper from the repository root:

```sh
source <(npm run --silent secrets:generate)
```

It exports `BEACON_SESSION_SECRET`, `BEACON_SETUP_TOKEN`, `BEACON_SOURCE_TOKEN`, and `BEACON_EVENT_TOKEN` into the current terminal and prints them. Copy the values into `.env` before starting Beacon; sourcing `.env` later replaces the current terminal values. Treat the output as a secret and do not send it to logs or version control.

**Adapter-specific:** Docker Compose reads the repository-root `.env` for interpolation. The bundled image also sets `NODE_ENV=production`, `BEACON_HOST=0.0.0.0`, `BEACON_PORT=3100`, and `BEACON_DATA_PATH=/data/beacon-index.sqlite`.

## Server and storage

| Variable           | Required | Default                      | Definition                                                                                                                                                                                                                       |
| ------------------ | -------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BEACON_HOST`      | No       | `0.0.0.0`                    | Network address Fastify binds to. Use `127.0.0.1` to restrict a directly run development server to the local host. Container deployments need `0.0.0.0` so the published port can reach the process.                             |
| `BEACON_PORT`      | No       | `3100`                       | Fastify listening port. It must be an integer from `1` through `65535`. The development web proxy expects `3100`.                                                                                                                |
| `BEACON_DATA_PATH` | No       | `./data/beacon-index.sqlite` | SQLite path for disposable search, resolution, activity, and reporting projections. Relative paths resolve from the server process's working directory; Beacon creates missing parent directories. Back up Drift, not this file. |
| `NODE_ENV`         | No       | `production`                 | Runtime mode: `development`, `test`, or `production`. Production marks browser session cookies `Secure`; development and test do not. The example file selects `development`.                                                    |

## Beacon credentials

| Variable                | Required | Constraint             | Definition                                                                                                                                                                              |
| ----------------------- | -------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BEACON_SESSION_SECRET` | Yes      | At least 32 characters | Signs 12-hour browser session cookies. Keep it server-side and independent from every other credential. Rotating it immediately invalidates all existing sessions.                      |
| `BEACON_SETUP_TOKEN`    | Yes      | At least 16 characters | Authorizes creation of the first administrator. It is required at startup even after setup closes, but it cannot create another administrator once one exists.                          |
| `BEACON_SOURCE_TOKEN`   | Yes      | At least 16 characters | Bearer credential for Compactor's `GET /integrations/compactor/v1/resolve` requests. It must match Compactor's `COMPACTOR_HTTP_SOURCE_BEARER_TOKEN`. Do not reuse the event token.      |
| `BEACON_EVENT_TOKEN`    | Yes      | At least 16 characters | Bearer credential for Compactor's `POST /integrations/compactor/v1/events` requests. It must match Compactor's `COMPACTOR_HTTP_EVENT_SINK_BEARER_TOKEN`. Do not reuse the source token. |

**Recommended:** generate high-entropy values, keep `.env` out of version control, and never expose these values to browser code or logs. Rotate the source and event tokens together with their matching Compactor values; a mismatch returns `401` until both services use the same credential.

## Drift connection

[Drift](https://github.com/Grey-Harbor/drift) is Beacon's authoritative persistence and tenant-isolation service. Beacon sends these values only from the server:

| Variable        | Required | Constraint | Definition                                                                                                                                                                                                                                                                                        |
| --------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DRIFT_URL`     | Yes      | Valid URL  | Base URL of the Drift service, such as `http://127.0.0.1:3000` for a local instance or `http://drift:3000` in the bundled Compose network. A trailing slash is accepted.                                                                                                                          |
| `DRIFT_API_KEY` | Yes      | Non-empty  | Read/write bearer key for the one Drift tenant managed by this Beacon instance. Obtain it through Drift's [tenant and key workflow](https://github.com/Grey-Harbor/drift/blob/main/docs/tutorial/administering-tenants-and-keys.md). Do not use an administrator key or a key for another tenant. |

Beacon validates the URL shape at startup, not Drift availability or key permissions. If Drift is unavailable during startup, Beacon can still answer `/health`, but its projection is stale and management operations cannot be considered operational until the Drift connection succeeds.

## Compactor settings in the bundled stack

[Compactor](https://github.com/Grey-Harbor/Compactor) owns redirect execution, caching, and event production. Beacon does not read `COMPACTOR_*` variables. The bundled [`compose.yaml`](../../compose.yaml) sets them directly so Compactor uses Beacon's HTTP integrations:

| Compactor variable                       | Bundled value or source | Purpose                                                                       |
| ---------------------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `COMPACTOR_SOURCE_TYPE`                  | `http`                  | Selects the HTTP redirect-definition source.                                  |
| `COMPACTOR_EVENT_SINK_TYPE`              | `http`                  | Selects the HTTP request-event sink.                                          |
| `COMPACTOR_HTTP_SOURCE_URL`              | Beacon resolver URL     | Requests current redirect definitions from Beacon.                            |
| `COMPACTOR_HTTP_EVENT_SINK_URL`          | Beacon event URL        | Sends redirect observations to Beacon.                                        |
| `COMPACTOR_HTTP_SOURCE_BEARER_TOKEN`     | `BEACON_SOURCE_TOKEN`   | Authenticates resolver requests.                                              |
| `COMPACTOR_HTTP_EVENT_SINK_BEARER_TOKEN` | `BEACON_EVENT_TOKEN`    | Authenticates event delivery.                                                 |
| `COMPACTOR_REDIRECT_CACHE_TTL_SECONDS`   | `30`                    | Caches a definition for 30 seconds, so edits can take that long to propagate. |
| `COMPACTOR_REDIRECT_CACHE_MAX_ENTRIES`   | `10000`                 | Caps the in-memory redirect-definition cache.                                 |
| `RUST_LOG`                               | `compactor=info`        | Enables informational Compactor logs.                                         |

These are deployment choices, not additional Beacon defaults. See Compactor's [configuration reference](https://github.com/Grey-Harbor/Compactor/blob/main/docs/reference/configuration.md) before changing them. An operator must decide cache policy, public exposure, proxy behavior, credential scope, and acceptable propagation delay.
