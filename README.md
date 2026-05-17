# Greenpill Network

Packages-first monorepo for the Greenpill Network public website, Fly-hosted agent service, shared public/private contracts, and future authenticated workspace.

## Package Layout

- `packages/website`: static Astro + Keystatic public website for `greenpill.network`.
- `packages/agent`: Hono service scaffold for `agent.greenpill.network`, local Postgres readiness, and future cache/intake jobs.
- `packages/shared`: reusable payload normalization and privacy-boundary contracts.
- `packages/workspace`: placeholder for the future authenticated workspace at `app.greenpill.network`.

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

## Fly Deployment

Run Fly commands from the repo root so the workspace lockfile and package manifests are in Docker context.

```sh
fly config validate --config packages/agent/fly.toml
fly deploy --config packages/agent/fly.toml
```

The agent Dockerfile is `packages/agent/Dockerfile`. The production database direction is Fly Managed Postgres attached to the Fly agent app so `DATABASE_URL` is available only as a private Fly secret.

Do not expose `DATABASE_URL` or direct database credentials to Vercel, Keystatic content, generated JSON, or browser bundles.

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
