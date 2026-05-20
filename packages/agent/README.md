# @greenpill-network/agent

Scaffold package for the future `agent.greenpill.network` service.

This package starts with agent route contracts, a runnable Hono server, and a Postgres readiness boundary. Cache workers, auth/session endpoints, steward admin integration, and later interactive agent workflows should land here as implementation continues.

Current responsibilities:

- use `hono` as the HTTP framework for deterministic agent routes
- run locally with `bun run dev:agent` from the repo root
- expose `/health` for process health and `/ready` for database readiness
- define public route constants for chapter impact, map-node intake, map state, and operational content snapshots
- depend on `@greenpill-network/shared` for privacy and payload contracts
- depend on `postgres` for Fly Managed Postgres/local Postgres connectivity
- keep agent code under `packages/*` instead of embedding service logic in the root Astro app
- leave room for future nondeterministic or interactive workflows without changing the public-site boundary

Current dependencies:

- `hono`: HTTP app/router runtime
- `@hono/node-server`: local and Fly HTTP server adapter
- `postgres`: Postgres client for readiness checks and migrations
- `@greenpill-network/shared`: shared payload normalization and privacy contracts

## Local Runtime

From the repo root:

```sh
cp .env.example .env.local
bun run db:local:up
bun run db:migrate
bun run dev:agent
```

The local agent defaults to `http://127.0.0.1:8787` when using `.env.example`.

Useful checks:

```sh
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ready
curl http://127.0.0.1:8787/impact/chapters/nigeria
curl http://127.0.0.1:8787/content/public-snapshot
```

`/content/public-snapshot` reads only published operational content from the
Greenpill-owned `content` schema and applies the shared public-content privacy
guard before returning data. `/impact/chapters/:slug`, `POST /map-nodes`, and
`GET /map-nodes/public` preserve the same public/private boundary for impact and
map-node data.

`POST /webhooks/resend` receives Resend email delivery and inbound metadata at
`https://agent.greenpill.network/webhooks/resend`. Set `RESEND_WEBHOOK_SECRET`
from the Resend webhook details page before enabling the production endpoint, and
set `RESEND_WEBHOOK_RECIPIENT_HASH_SECRET` so stored recipient hashes are keyed.
The route verifies Svix signatures and stores only operational metadata, never
message bodies, raw recipient addresses, or free-form provider diagnostics.
