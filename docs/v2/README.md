# Greenpill Website V2

This folder is now consolidated into three canonical human docs plus one machine handoff artifact.

The repo now uses `.plans/` for execution sequencing, live decision packs, handoffs, and readiness state. Keep durable product and architecture truth here in `docs/v2/`; keep active follow-up state in a plan hub.

## Canonical Set

- `v2-brief.md`
  - goals, audiences, locked defaults, and success signals
- `v2-architecture.md`
  - domain model, hosting split, auth/content boundaries, monorepo posture, and infrastructure defaults
- `v2-delivery-plan.md`
  - phase plan, acceptance criteria, and Charmverse migration mapping
- `ai-build-manifest.yaml`
  - machine-oriented implementation handoff derived from the canonical docs

## Supporting Artifacts

- `steward-brief-one-page.md`
  - short steward-facing context brief for the active V2 decision pass
- `steward-telegram-polls.md`
  - Telegram polls and nomination prompt for unresolved narrative choices
- `workshop-runbook.md`
  - workshop facilitation guide
- `workshop-notes-template.md`
  - workshop capture template
- `private-node-intake.md`
  - contracts-first scaffold for user-submitted map nodes, private email handling, and CMS/admin options
- `private-map-node-schema.sql`
  - Postgres table/view contract for private submissions and approved public map projections
- `impact-data-integration.md`
  - chapter-page impact source bindings, KarmaGAP/Green Goods read model, server cache contract, and public payload privacy rules
- `fly-postgres-hosting.md`
  - Fly Managed Postgres hosting model, access boundaries, connection flow, and migration path
- `prompts/`
  - synthesis and repo-refinement prompts

## Active Plan Hubs

- `.plans/active/v2-steward-decision-pack/`
  - tracks steward decisions for homepage promise, proof of activity, Greenpill Garden framing, and first featured examples
- `.plans/active/content-private-node-scaffold/`
  - tracks public content expansion, private map-node intake contracts, approved public projections, and CMS/admin follow-up

## Backlog Plan Hubs

- `.plans/backlog/chapter-impact-data-integration/`
  - tracks chapter-page impact source bindings, server-cache implementation, and UI follow-up
- `.plans/backlog/knowledge-commons-graph-explorer/`
  - tracks the deferred graph as a future source-aware, reviewed, stewarded knowledge commons artifact

Use `node scripts/plan-hub.mjs validate` after editing active or backlog plan hubs.

## Current Defaults

- public site on Vercel
- workspace frontend on Vercel
- agent, auth, realtime, and Postgres on Fly
- Fly Managed Postgres for the production database
- Tigris for uploads and media
- Keystatic as canonical public content
- shared contracts in `packages/shared`
- agent service contracts in `packages/agent`
- workspace boundary scaffold in `packages/workspace`
