# Get started with Beacon locally

Use this tutorial when developing Beacon against a reachable Drift v0.1.0 tenant. It gives you a known local starting state: Fastify runs the management API and Next.js proxies browser API requests to it.

## Before you begin

You need Node.js 22 or newer, a Drift v0.1.0 tenant, its read/write tenant key, and four independently generated Beacon secrets. Work from the repository root:

```sh
cd /path/to/beacon
cp .env.example .env
```

Set `DRIFT_URL`, `DRIFT_API_KEY`, `BEACON_SESSION_SECRET`, `BEACON_SETUP_TOKEN`, `BEACON_SOURCE_TOKEN`, and `BEACON_EVENT_TOKEN` in `.env`. Use high-entropy values that cannot be mistaken for production placeholders. The complete variable names and development defaults are in [the environment reference](../../.env.example).

## Start the services

Install dependencies and start Fastify in one terminal:

```sh
npm install
npm run dev
```

In another terminal, start the browser application:

```sh
npm run dev:web
```

Open `http://localhost:5173`. Complete first-run setup with the deployment-provided setup token, a lowercase-compatible username, and a password of at least 12 characters.

**Guaranteed:** the development server forwards `/api/*` and `/integrations/*` to Fastify at `http://127.0.0.1:3100`. It does not place Drift credentials or Compactor bearer tokens in browser code.

## Verify the result

Confirm Fastify is reachable:

```sh
curl --fail http://127.0.0.1:3100/health
```

Then sign in at `http://localhost:5173`, create a redirect with a new destination, and confirm it appears in search. Run the complete local verification suite before proposing a change:

```sh
npm run ci
npm audit --omit=dev --audit-level=high
```

## What to do next

Use [the HTTP API reference](../reference/api.md) for exact browser and Compactor contracts. Use [the self-hosting guide](../how-to/self-hosting.md) for Compose deployment, backup, and recovery. Do not reuse development secrets in a deployment; an operator chooses tenant mapping, public proxy configuration, token scope, and cache policy.
