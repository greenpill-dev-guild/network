# Content Private Node Scaffold Spec

## Goal

Create a contracts-first foundation for richer public content and private user-submitted map/member nodes, while preserving the public/private boundary that keeps emails and moderation data out of the static site.

## Current State

- The public website is a static Astro site with file-backed Keystatic content.
- Public collections now include richer book fields, themes, reusable public people/stewards, and theme/steward references across chapters, guilds, projects, and stories.
- `/locations.json` is generated from `packages/website/src/content/chapters/*` through `packages/website/src/pages/locations.json.ts`.
- Private node intake is documented in `.plans/active/content-private-node-scaffold/artifacts/private-node-intake.md`.
- The Postgres table/view contract is documented in `packages/agent/migrations/001_private_map_node_schema.sql`.
- Privacy contract tests live in `scripts/map-node-contract.test.mjs`.

## Scope

- Public content model: keep Keystatic canonical for books, translations, chapters, guilds, projects, stories, themes, and public people/stewards.
- Public map feed: generate current chapter pins from chapter content and reserve submitted user nodes for the approved private projection.
- Private data model: Postgres contracts for `map_node_submissions`, `map_node_private_contacts`, `map_node_reviews`, and `public_map_nodes`.
- Local pending UX contract: store only public-safe pending nodes in `localStorage` and render them only for the submitting visitor.
- CMS/admin decision: compare Directus, Payload, NocoDB, Baserow, and Strapi before implementation.

## Constraints

- `.plans/active/public-website-design-implementation/artifacts/v2/` remains the canonical product and architecture artifact surface.
- `.plans/` carries execution sequencing, readiness, handoffs, and follow-up truth.
- This repo starts with manual plan updates plus validation, not automation claiming.
- Keep `status.json` taxonomy current enough for future filtering and dependency checks.
- Emails, raw notes, IP addresses, rate-limit keys, spam metadata, and review notes must never enter Keystatic, repo-tracked JSON, public assets, or public map payloads.
- Directus is the first CMS/admin candidate to evaluate, but the schema must remain CMS-agnostic.

## Open Questions

- Which private admin layer should the team choose after a hands-on comparison?
- What exact fields should the first public add-node form collect?
- Should the first deployed intake route live under `agent.greenpill.network`, an Astro server endpoint, or a temporary backend service while the workspace app is still pending?
- What moderation SLA and steward routing should be shown in confirmation copy?
