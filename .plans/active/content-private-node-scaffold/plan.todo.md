# Content Private Node Scaffold Plan

## Sequencing

- [x] Confirm the relevant repo baseline and current docs
- [x] Expand Keystatic/Astro public content contracts for themes, reusable people/stewards, richer books, and related-content slugs
- [x] Generate `/locations.json` from chapter content and remove the duplicate hand-maintained public JSON source
- [x] Add private Postgres node-intake schema and approved-only public projection contract
- [x] Add public-safe local pending-node contract for optimistic map rendering
- [x] Add privacy tests for public projections and local pending-node storage
- [x] Document CMS/admin options and keep Directus as the first candidate to evaluate
- [x] Wire `POST /map-nodes` and `GET /map-nodes/public` to private intake/public projection repositories
- [x] Produce the Directus moderation spike report without adding an app dependency
- [x] Refine scope and defaults in `spec.md`
- [x] Update `status.json` as decisions or readiness change
- [x] Capture the handoff or follow-up note in `handoffs/README.md`
- [x] Run `node scripts/plan-hub.mjs validate`
- [x] Apply production Directus content/schema migrations `003` through `007`
- [x] Apply production Directus operational RBAC with `bun run directus:content:setup`
- [x] Record production Directus/RBAC verification in the handoff notes

## Remaining Follow-Up

- [ ] Add first real `people` content entries when stewards are confirmed
- [ ] Add first real `stories` content entries or decide whether empty story routes should stay in the current build
- [x] Run a hands-on Directus container/cloud pilot against the Postgres schema
- [x] Choose Directus as the authenticated operational content and moderation surface unless it fails a concrete operational requirement
- [x] Choose `agent.greenpill.network` as the first deployed home for `POST /map-nodes` and `GET /map-nodes/public`
- [x] Provision the Fly agent app and Managed Postgres cluster after org/app/plan approval
- [x] Apply the production agent DB schema for private map-node intake and chapter impact cache tables
- [ ] Invite steward users in Directus and assign the narrowest role that fits each person: Steward Editor, Steward Moderator, Trusted Publisher, or Operator
- [ ] Run a production non-admin RBAC smoke test after at least one non-admin user exists: editor cannot publish, moderator cannot read private contacts/edit tokens, trusted publisher can read trusted fields
- [ ] Decide whether to run the production operational content seed with `bun run content:migrate`; do not run it if Directus-owned content already exists unless the missing-row recovery path is intentional
- [ ] Implement the add-node form and dispatch `greenpill:pending-map-node` after public-safe local storage
- [ ] Add browser/UI proof for local pending-node rendering once the form exists
