# Handoffs

## Current Handoff

Read first:

- `.plans/backlog/chapter-impact-data-integration/artifacts/impact-data-integration.md`
- `packages/shared/src/chapter-impact.js`
- `packages/agent/src/app.js`
- `packages/agent/src/server.js`
- `packages/agent/src/db.js`
- `packages/agent/src/impact.js`
- `packages/agent/fly.toml`
- `scripts/agent-db.migrate.mjs`
- `packages/website/src/pages/impact-sources.json.ts`
- `packages/website/src/pages/chapters/[slug].astro`

Implemented in this repo:

- Chapter content and Keystatic now support public-safe `impactSources`.
- `/impact-sources.json` publishes enabled bindings for the future Fly agent cache worker.
- `packages/agent` reserves the future Fly agent route contract with a Hono app scaffold, and `packages/workspace` reserves the authenticated workspace boundary.
- `packages/agent` now runs locally with `bun run dev:agent` / `bun run start:agent`.
- `/ready` checks `DATABASE_URL` connectivity, while `/health` stays a process-level health check.
- `scripts/agent-db.migrate.mjs` applies the private map-node schema and `chapter_impact_snapshots` table.
- `packages/agent/fly.toml` and `packages/agent/Dockerfile` define the Fly deployment shape.
- `network-agent` is deployed on Fly with Managed Postgres attached.
- The production database has the `chapter_impact_snapshots` table and private map-node schema applied.
- The chapter page contains an impact section scaffold for enabled source bindings.
- The chapter page UI is scaffold-gated and will not render publicly until `CHAPTER_IMPACT_UI_ENABLED` is enabled after the cache endpoint returns real payloads.
- Contract tests cover agent route constants, source bindings, Karma normalization, Green Goods aggregates, outage status, and privacy exclusions.

Still not complete:

- Implement the cache job that writes `chapter_impact_snapshots`.
- Wire `GET /impact/chapters/:slug`.
- Curate KarmaGAP IDs for each chapter.
- Add browser proof after the cache endpoint is implemented.
