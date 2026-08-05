# Beacon

Beacon is a focused, self-hosted application for managing redirect infrastructure. It persists connected management records in [Drift](https://github.com/Grey-Harbor/drift), implements [Compactor](https://github.com/Grey-Harbor/compactor)'s HTTP source and event-sink contracts, and keeps its own local read models disposable.

## v0.1.0 capabilities

- Search-first redirect and destination management
- Disable and archive lifecycles with optimistic conflict handling
- Destination reuse and QR code downloads
- Exact management activity, Compactor event history, and basic reports
- First-run single-administrator setup with Argon2id password hashing
- Rebuildable full-text, resolution, activity, and reporting projections

Beacon is not the redirect runtime, an analytics platform, or a multi-user administration console.

## Development

Requirements: Node.js 22, a Drift v0.1.0 tenant, and a read/write Drift key.

1. Copy `.env.example` to `.env` and replace every example secret.
2. Start Drift and set `DRIFT_URL` and `DRIFT_API_KEY`.
3. Run `npm install`, then run the Fastify API with `npm run dev` and the Next.js development server with `npm run dev:web` in separate terminals.
4. Open `http://localhost:5173`; Next.js proxies API requests to Fastify. Complete setup with `BEACON_SETUP_TOKEN`.

Run the full verification suite with `npm run ci`.

## Self-hosting

Bootstrap Drift before starting the complete stack:

```sh
docker compose up -d drift
docker compose exec drift node dist/cli.js bootstrap --slug beacon --name Beacon
```

Store the returned key as `DRIFT_API_KEY`. Generate independent, random values for the four Beacon secrets in `.env`, then run `docker compose up --build -d`.

Only Compactor's public listener should receive redirect traffic. Keep Drift private. Put Beacon's management port behind an HTTPS reverse proxy before exposing it outside the host. The included mapping binds Beacon to loopback.

## Operational behavior

- Drift is authoritative. Back up its volume using Drift's documented process.
- `/data/beacon-index.sqlite` is disposable. Use Settings → Rebuild after restoring Drift or whenever projection state is stale.
- Compactor uses a 30-second cache TTL. Edits may take that long to propagate, and cached redirects can remain available while the source is unavailable.
- Compactor makes one event delivery attempt. Reporting is operational and must not be treated as billing-grade analytics.
- Rotate the two Compactor bearer tokens and the session secret through deployment configuration, then restart the affected containers.

See the [documentation index](./docs/README.md), [Architecture](./ARCHITECTURE.md), and the [ADR index](./docs/adr/README.md) for the public contracts and durable design decisions. Release-facing behavior is summarized in [RELEASE.md](./RELEASE.md).
