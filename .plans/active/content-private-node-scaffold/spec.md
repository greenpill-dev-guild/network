# Content Private Node Scaffold Spec

## Goal

Create a contracts-first foundation for richer public content and private user-submitted map/member nodes, while preserving the public/private boundary that keeps emails and moderation data out of the static site.

## Current State

- The public website is a static Astro site. Keystatic remains local/file-backed for editorial and site-composition content.
- Operational public content for themes, reusable public people/stewards, chapters, guilds, and projects now has a Directus/Postgres ownership path through the `content` schema.
- `/locations.json` and `/impact-sources.json` are generated from the approved operational content snapshot through `packages/website/src/lib/operational-content.ts`.
- The public SQL projection is an explicit allowlist. Raw editor JSON in `content.*.data` is not forwarded by the public views.
- `bun run directus:content:setup` applies the Directus Steward Editor, Steward Moderator, Trusted Publisher, and Operator role/policy split after Directus boots.
- Private node intake is documented in `.plans/active/content-private-node-scaffold/artifacts/private-node-intake.md`.
- The Postgres table/view contract is documented in `packages/agent/migrations/001_private_map_node_schema.sql` and now lives under the `intake` schema with a compatibility public view.
- `POST /map-nodes` inserts pending submissions and private contact metadata through the agent; `GET /map-nodes/public` reads the approved public projection only.
- Privacy contract tests live in `scripts/map-node-contract.test.mjs` and `scripts/agent-contract.test.mjs`.
- The Directus moderation spike report lives at `reports/directus-moderation-spike.md`.

## Scope

- Public content model: keep Keystatic canonical for books, resources, translations, stories, singletons, and site-composition content; move operational chapters, people/stewards, guilds, projects, themes, locations, and impact source bindings to Directus/Postgres.
- Public map feed: generate current chapter pins from the approved operational content snapshot and reserve submitted user nodes for the approved private projection.
- Private data model: Postgres contracts for `map_node_submissions`, `map_node_private_contacts`, `map_node_reviews`, and `public_map_nodes`.
- Local pending UX contract: store only public-safe pending nodes in `localStorage` and render them only for the submitting visitor.
- CMS/admin decision: Directus is the authenticated operational content and moderation surface, while SQL migrations and shared projection contracts remain authoritative.

## Constraints

- `.plans/active/public-website-design-implementation/artifacts/v2/` remains the canonical product and architecture artifact surface.
- `.plans/` carries execution sequencing, readiness, handoffs, and follow-up truth.
- This repo starts with manual plan updates plus validation, not automation claiming.
- Keep `status.json` taxonomy current enough for future filtering and dependency checks.
- Emails, raw notes, IP addresses, rate-limit keys, spam metadata, and review notes must never enter Keystatic, repo-tracked JSON, public assets, or public map payloads.
- Directus may configure Data Studio metadata and low-risk flows, but Greenpill-owned SQL migrations, explicit public views, and shared public snapshot guards stay authoritative.

## Open Questions

- Which additional field-level scopes should be added once real chapter steward ownership is represented in the `content` schema?
- What exact fields should the first public add-node form collect?
- Should the first deployed intake route live under `agent.greenpill.network`, an Astro server endpoint, or a temporary backend service while the workspace app is still pending?
- What moderation SLA and steward routing should be shown in confirmation copy?
