# Get started with Beacon locally

Use this tutorial to run Beacon locally for the first time. Beacon provides the management API and browser interface, [Drift](https://github.com/Grey-Harbor/drift) stores the authoritative data, and [Compactor](https://github.com/Grey-Harbor/Compactor) executes redirects. You need Drift for this tutorial; you can add Compactor later when you want to test redirect traffic.

## Before you begin

You need Node.js 22 or newer and a reachable Drift tenant with a read/write key. If you do not have those yet, follow Drift's [getting-started tutorial](https://github.com/Grey-Harbor/drift/blob/main/docs/tutorial/getting-started.md) and [tenant and key tutorial](https://github.com/Grey-Harbor/drift/blob/main/docs/tutorial/administering-tenants-and-keys.md).

From the Beacon repository root, install dependencies and create your local configuration:

```sh
cd /path/to/beacon
npm ci
cp .env.example .env
```

Edit `.env`: set `DRIFT_URL` to the Drift base URL, set `DRIFT_API_KEY` to the tenant key, and replace the four Beacon credential placeholders with independent random values. See [the environment-variable reference](../reference/environment.md) for every variable, default, constraint, and rotation effect.

## Start Beacon

Beacon reads the process environment; it does not load `.env` itself. In one terminal, export the file and start the API:

```sh
set -a
. ./.env
set +a
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

Then sign in at `http://localhost:5173`, create a redirect with a new destination, and confirm it appears in search.

## What to do next

Use [the self-hosting guide](../how-to/self-hosting.md) to run the complete Beacon, Drift, and Compactor stack. Compactor's [HTTP-adapter tutorial](https://github.com/Grey-Harbor/Compactor/blob/main/docs/tutorials/http-adapters.md) explains the runtime side of Beacon's resolver and event-sink connection; [Beacon's API reference](../reference/api.md#compactor-integration) defines the matching endpoints. Do not reuse development secrets in a deployment.
