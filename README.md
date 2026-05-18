# Greenpill Network

Packages-first monorepo for the Greenpill Network public website, Fly-hosted agent service, shared public/private contracts, and future authenticated workspace.

## Package Layout

- `packages/website`: static Astro + Keystatic public website for `greenpill.network`.
- `packages/agent`: Hono service scaffold for `agent.greenpill.network`, local Postgres readiness, and future cache/intake jobs.
- `packages/admin`: self-hosted Directus admin service for `network-admin` / future `admin.greenpill.network`.
- `packages/shared`: reusable payload normalization and privacy-boundary contracts.
- `packages/workspace`: placeholder for the future authenticated workspace at `app.greenpill.network`.

## Repo Truth And Artifacts

- `.plans/` is the durable planning, research, handoff, and design-artifact surface.
- Runtime code, migrations, and shared contracts belong under `packages/`.
- Root-level `data/` is intentionally unused; graph research data lives with `.plans/backlog/knowledge-commons-graph-explorer/` until that backlog work becomes product code.
- Root `scripts/` should stay limited to active repo validation, migration, and package tooling. One-off plan generators belong beside the plan artifacts they produce.

## Requirements

- Bun `1.3.10` from the checked-in `packageManager` field.
- Node `>=22.12.0` for Astro and local agent commands.
- Docker Desktop for local Postgres.
- Fly CLI for validating and deploying the agent service.

## Install

```sh
bun install --frozen-lockfile
```

The root workspace owns the lockfile. Run installs from the repo root, not from an individual package.

## Website

```sh
bun run dev:website
bun run build:website
bun run preview:website
```

`bun run dev`, `bun run build`, and `bun run preview` delegate to the website package. The production static build emits to `packages/website/dist/`.

Keystatic is enabled only during local website development for file-backed content authoring. There is no deployed Keystatic server, CMS API route, or public database connection in the website package.

Public assets live in `packages/website/public/`. Generated public JSON routes include:

- `/locations.json` from `packages/website/src/content/chapters/*`.
- `/impact-sources.json` from opt-in public chapter impact source bindings.

The current public site deployment can remain on the existing GitHub Pages path while this package restructure lands. If we later migrate the public site to Vercel, use the repo root as the project root, `bun install --frozen-lockfile` as install command, `bun run build:website` as build command, and `packages/website/dist` as output directory.

## Agent And Local Postgres

```sh
cp .env.example .env.local
bun run db:local:up
bun run db:migrate
bun run dev:agent
```

The local agent defaults to `http://127.0.0.1:8787` with the values in `.env.example`.

Useful checks:

```sh
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ready
curl http://127.0.0.1:8787/impact/chapters/nigeria
```

`/health` is process-level health. `/ready` checks `DATABASE_URL` connectivity. `/impact/chapters/:slug`, `POST /map-nodes`, and `GET /map-nodes/public` are still scaffolded route contracts until the cache and intake implementations land.

## Directus Admin

Directus is self-hosted as a separate admin service, not as part of the public
Astro website.

```sh
bun run db:local:up
bun run db:migrate
bun run dev:admin
```

The local Directus service runs at `http://localhost:8055` and connects to the
same local Postgres database as the agent. Use it for steward moderation and
internal data review only; keep public intake and public API traffic behind the
agent routes.

If Docker Desktop is installed but `docker` is not on your shell PATH, the local
Docker scripts fall back to Docker Desktop's bundled CLI path on macOS.

## Fly Deployment

Run Fly commands from the repo root so the workspace lockfile and package manifests are in Docker context.

```sh
fly config validate --config packages/agent/fly.toml
fly deploy --config packages/agent/fly.toml
```

The agent Dockerfile is `packages/agent/Dockerfile`. The production database direction is Fly Managed Postgres attached to the Fly agent app so `DATABASE_URL` is available only as a private Fly secret.

The Directus admin app is `network-admin` and deploys from `packages/admin`:

```sh
fly deploy packages/admin --config packages/admin/fly.toml
```

Attach the Fly Postgres connection to Directus as `DB_CONNECTION_STRING`, not as
`DATABASE_URL`, because Directus reads `DB_CONNECTION_STRING` for PostgreSQL
connection-string configuration.

Do not expose `DATABASE_URL` or direct database credentials to the public website deploy, Keystatic content, generated JSON, browser bundles, or any future Vercel project.

## Validation

```sh
bun run test:agent
bun run test:chapter-impact
bun run test:map-nodes
bun run test:plans
bun run plans:validate
bun run build
```

The contract tests verify that agent routes, chapter impact payloads, public map payloads, SQL projections, and plan hubs preserve the public/private boundary.

## Privacy Boundary

Private map/member node intake must not expose emails, raw notes, IP addresses, user agents, spam metadata, steward review notes, pending submissions, or raw upstream EAS/Green Goods work and media feedback.

Public website data should stay static and public-safe. Private intake, impact cache state, migrations, and future authenticated operations belong behind the Fly agent/workspace boundary.
