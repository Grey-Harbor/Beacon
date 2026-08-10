# Self-host Beacon with Compose

Use this guide when deploying the bundled single-replica Beacon, Drift, and Compactor stack. It explains required operator inputs, verification, recovery, and the 30-second propagation limit before redirect traffic is exposed.

## Prerequisites

Run the following commands from the repository root on a host with Docker Compose. You need a protected `.env` file and an HTTPS reverse proxy for the Beacon management interface.

```sh
cd /path/to/beacon
cp .env.example .env
```

Set `BEACON_SESSION_SECRET` to at least 32 random characters. Set independent, high-entropy `BEACON_SETUP_TOKEN`, `BEACON_SOURCE_TOKEN`, and `BEACON_EVENT_TOKEN` values. Set `BEACON_BROWSER_ORIGIN` to the exact public HTTPS origin of the management UI, such as `https://beacon.example.com`; do not use the internal container address or add a path. Do not put those secrets, a Drift tenant key, or deployment `.env` files in version control.

Use [the environment-variable reference](../reference/environment.md) for every value, validation constraint, default, and rotation effect.

## Deploy the stack

Bootstrap the pre-provisioned Drift tenant first:

```sh
docker compose up -d drift
docker compose exec drift node dist/cli.js bootstrap --slug beacon --name Beacon
```

Save the returned key as `DRIFT_API_KEY` in `.env`, then build and start the remaining services:

```sh
docker compose pull drift compactor
docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:3100/health
```

**Guaranteed:** the bundled Compose configuration runs Drift and Compactor using their `latest` image tags. `docker compose pull drift compactor` resolves the image versions before the stack starts. Beacon is bound to `127.0.0.1:3100`; Compactor listens publicly on port `8080`; Compactor uses `COMPACTOR_REDIRECT_CACHE_TTL_SECONDS=30`.

**Recommended:** terminate HTTPS and authenticated operator access before exposing Beacon's management UI. Keep Drift private and expose Compactor, not Beacon, to redirect traffic. Configure proxy trust explicitly; Beacon does not infer it. Approve image updates before pulling; use a tested specific image tag when you need a repeatable rollback point.

## Configure and rotate secrets

The setup token gates only initial admin creation; it does not reopen setup after an admin vertex exists. The session secret signs 12-hour browser cookies, so rotating it invalidates all sessions. The source and event tokens independently authorize Compactor's resolver and event sink.

To rotate any value, update the deployment configuration and restart the affected container. Rotate the source and event tokens together with the matching Compactor configuration; mismatched values produce `401` integration failures. Never log or return the secret values while diagnosing a deployment.

## Back up, restore, and rebuild

**Guaranteed:** Drift is authoritative. Back up and restore its volume according to Drift's documented procedure. Beacon's `/data/beacon-index.sqlite` is a disposable projection and is not an authoritative backup.

After restoring Drift, start Beacon, sign in, and use **Settings → Rebuild**. The rebuild rereads current Drift records and reconstructs search, resolution, activity, and reporting rows. It does not restore deleted records, recreate events that Compactor failed to deliver, or provide a restore UI.

To roll back a Beacon release, deploy a prior compatible Beacon image with the same Drift tenant and Beacon volume, verify `/health`, then rebuild projections if their status is stale. Do not roll back Drift data just to match a Beacon image without a tested Drift recovery plan.

## Monitor and operate the deployment

- `GET /health` proves that the Beacon process is responding; it does not prove Drift data integrity or Compactor cache freshness.
- **Adapter-specific:** projection freshness is available in Settings and `GET /api/v1/projections` to an authenticated session. A stale projection can follow a successful Drift mutation and requires rebuilding.
- **Guaranteed:** Compactor can serve a cached definition for up to 30 seconds after an edit, disable, or archive. It may continue serving that cached definition during a Beacon or Drift source outage.
- Compactor event delivery is best-effort. Event reports are operational history, not billing-grade analytics.

The deployment has no multi-replica coordination, targeted cache invalidation, restore UI, multi-user recovery, or event-retention tooling in v0.1.0. An operator must decide whether those limits meet the deployment's risk and retention requirements.

For exact endpoint behavior, consult [the API reference](../reference/api.md). For the ownership and persistence reasoning behind this topology, consult [Architecture](../../ARCHITECTURE.md).
