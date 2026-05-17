# Fly Postgres Hosting

Greenpill V2 should use Fly.io Managed Postgres for production operational data.

## Decision

- Use Fly.io Managed Postgres as the production Postgres service.
- Do not use the older unmanaged Fly Postgres app path for production unless there is a specific short-lived development reason.
- Keep `DATABASE_URL` only on Fly-hosted private services such as `agent.greenpill.network` and any future private admin service.
- Never expose database credentials to the public website deploy, Keystatic content, generated JSON, browser bundles, or any future Vercel project.

## Why Managed Postgres

Fly's current docs distinguish Managed Postgres from unmanaged Fly Postgres. Managed Postgres is the production path because it includes high availability, backups/recovery, performance monitoring, scaling support, support access, and encryption at rest and in transit.

The unmanaged Fly Postgres docs now explicitly say Fly is not able to provide support or guidance for unmanaged Postgres and points production users toward Managed Postgres.

## Initial Topology

| Surface | Host | Database Access |
| --- | --- | --- |
| Public site | GitHub Pages, `greenpill.network` | No direct Postgres access |
| Agent service | Fly, `agent.greenpill.network` | `DATABASE_URL` secret from Fly Managed Postgres |
| Admin/CMS candidate | Fly or workspace-only private app | Restricted Postgres role, not public-site credentials |
| Local development | Developer machine | `fly mpg proxy` or `fly mpg connect` |

Start with one Managed Postgres cluster in `iad` to match the agent primary region. Keep `fra` as the likely first secondary region only after traffic or resilience needs justify it.

## Data Ownership

The same production cluster can start with separate schemas rather than separate databases:

- `intake`: private map/member node submissions, contacts, reviews, and approved public projections.
- `impact`: chapter impact cache snapshots from KarmaGAP and Green Goods.
- `workspace`: future authenticated workspace operational tables.
- `audit`: future steward/admin audit records.

This keeps the first deployment simple while preserving clear ownership boundaries.

## Connection Model

1. Create the Managed Postgres cluster through the Fly dashboard or `fly mpg create`.
2. Attach `agent.greenpill.network` to the cluster with `fly mpg attach <clusterID> -a <agent-app>`.
3. Let Fly set `DATABASE_URL` as an app secret. Fly uses the pooled connection URL for attached apps, which is the default we want for agent route traffic.
4. Use a direct connection string only for migrations or admin maintenance, stored as a separate private secret such as `DATABASE_MIGRATION_URL`.
5. For local maintenance, use `fly mpg connect` for `psql` or `fly mpg proxy` for local tools.

## Repo Runtime Setup

The repo now includes a runnable local agent and Postgres baseline:

- `.env.example` documents local agent and database variables.
- `packages/agent/docker-compose.yml` runs local Postgres on `localhost:54329`.
- `scripts/agent-db.migrate.mjs` applies the private map-node schema plus the chapter impact cache table.
- `packages/agent/src/server.js` runs the Hono app locally.
- `packages/agent/fly.toml` and `packages/agent/Dockerfile` define the Fly agent deployment shape.

Local Docker Postgres path:

```sh
cp .env.example .env.local
bun run db:local:up
bun run db:migrate
bun run dev:agent
```

Local Fly Managed Postgres proxy path:

```sh
fly mpg proxy
# Set DATABASE_URL in .env.local to the local proxy connection string.
bun run db:migrate
bun run dev:agent
```

Production Fly path:

```sh
fly apps create network-agent
fly mpg create --name greenpill-prod --region iad --plan basic
fly mpg attach <clusterID> -a network-agent
fly deploy --config packages/agent/fly.toml
```

Provisioning the Managed Postgres cluster and deploying the app can create billable Fly resources, so these commands should be run only after confirming the org, app name, plan, and region.

## Migration Path

This scaffold starts with a small SQL migration runner so local and first Fly environments can share the same contracts. A later implementation can replace or extend it with:

- `postgres` plus SQL migration files for a lightweight code path.
- `drizzle-orm` and `drizzle-kit` if we want typed query helpers and migration generation.

The existing SQL contract in `packages/agent/migrations/001_private_map_node_schema.sql` remains the source for the first private node-intake migration.

## References

- Fly Managed Postgres overview: https://fly.io/docs/mpg/
- Fly Managed Postgres create/connect: https://fly.io/docs/mpg/create-and-connect/
- Fly unmanaged Postgres notice: https://fly.io/docs/postgres/
