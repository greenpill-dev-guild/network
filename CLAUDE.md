# CLAUDE.md

This file gives Claude Code guidance for working in this repository.

## Project Overview

Greenpill Network is a packages-first monorepo for the public Astro website, Fly-hosted agent service, shared public/private contracts, and future authenticated workspace.

Canonical package boundaries:

- `packages/website`: static Astro + Keystatic public website for `greenpill.network`.
- `packages/agent`: Hono service for `agent.greenpill.network`, local Postgres readiness, and future cache/intake jobs.
- `packages/admin`: self-hosted Directus admin service for `network-admin` / future `admin.greenpill.network`.
- `packages/shared`: reusable payload normalization and privacy-boundary contracts.
- `packages/workspace`: scaffold for the future authenticated workspace at `app.greenpill.network`.

## Commands

Run installs and validation from the repo root.

- `bun install --frozen-lockfile` - install the checked-in workspace dependency graph.
- `bun run dev` or `bun run dev:website` - run the Astro dev server and local Keystatic authoring UI.
- `bun run build` or `bun run build:website` - build the static website into `packages/website/dist/`.
- `bun run preview` or `bun run preview:website` - preview the built website.
- `bun run dev:agent` - run the local Hono agent server.
- `bun run dev:admin` - run the local Directus admin service against local Postgres.
- `bun run db:local:up` / `bun run db:local:down` - start or stop local Postgres.
- `bun run db:migrate` - apply the local agent database baseline.
- `bun run test:agent`, `bun run test:chapter-impact`, `bun run test:map-nodes`, `bun run plans:validate` - focused contract checks.

## Architecture Notes

The public website remains static. Keystatic is enabled only during local website dev for file-backed content authoring; there is no deployed CMS server or website database connection.

Website source and config live under `packages/website`:

- `packages/website/src/pages/index.astro` - homepage.
- `packages/website/src/content/` - file-backed content collections and singletons.
- `packages/website/src/content/config.ts` - Astro content schema validation.
- `packages/website/keystatic.config.ts` - local Keystatic config.
- `packages/website/src/scripts/` - browser interaction scripts.
- `packages/website/src/styles/global.css` - global site styles.

Generated public JSON routes include `/locations.json` and `/impact-sources.json`. Keep those outputs public-safe.

The agent package owns private runtime concerns. `/health` is process health, `/ready` checks `DATABASE_URL`, and the impact/map-node routes are scaffolded route contracts until implementation lands.

The admin package owns the self-hosted Directus deployment surface. Directus may
manage `directus_*` system tables, roles, permissions, and Data Studio views, but
Greenpill-owned schema migrations remain in `packages/agent/migrations`.

## Deployment Notes

- The current public site can remain on GitHub Pages. If the project later migrates to Vercel, use repo root, `bun run build:website`, and `packages/website/dist`.
- Fly deploys should run from the repo root with `fly deploy --config packages/agent/fly.toml`.
- The Directus admin Fly app is `network-admin`; deploy it from the repo root with `fly deploy packages/admin --config packages/admin/fly.toml`.
- `DATABASE_URL` belongs only on private Fly services, starting with the agent app. Do not expose database credentials to the public website deploy, Keystatic content, generated JSON, browser bundles, or any future Vercel project.

## Privacy Boundary

Private map/member node intake must never expose emails, raw notes, IP addresses, user agents, spam metadata, steward review notes, pending submissions, or raw upstream EAS/Green Goods work and media feedback.

Use `packages/shared` contracts for public/private projections instead of duplicating privacy filters inside the website or agent.

## Supply Chain And Agent Safety

- Do not install or upgrade Bun, Python, or package-manager dependencies unless the user explicitly approves that install in the current task.
- Prefer existing repo tooling, checked-in lockfiles, and standard library options over adding new packages.
- Treat `package.json`, lockfiles, package-manager config, `.github/workflows/**`, `AGENTS.md`, `CLAUDE.md`, `.codex/**`, and `.claude/**` as security-sensitive surfaces. Call out changes to them in final summaries.
- Keep dependency installs on the checked-in Bun lockfile path and preserve the `bunfig.toml` release-age gate configuration.
