# Content Private Node Scaffold Plan

## Sequencing

- [x] Confirm the relevant repo baseline and current docs
- [x] Expand Keystatic/Astro public content contracts for themes, reusable people/stewards, richer books, and related-content slugs
- [x] Generate `/locations.json` from chapter content and remove the duplicate hand-maintained public JSON source
- [x] Add private Postgres node-intake schema and approved-only public projection contract
- [x] Add public-safe local pending-node contract for optimistic map rendering
- [x] Add privacy tests for public projections and local pending-node storage
- [x] Document CMS/admin options and keep Directus as the first candidate to evaluate
- [x] Refine scope and defaults in `spec.md`
- [x] Update `status.json` as decisions or readiness change
- [x] Capture the handoff or follow-up note in `handoffs/README.md`
- [x] Run `node scripts/plan-hub.mjs validate`

## Remaining Follow-Up

- [ ] Add first real `people` content entries when stewards are confirmed
- [ ] Add first real `stories` content entries or decide whether empty story routes should stay in the current build
- [ ] Run a hands-on Directus spike against the Postgres schema
- [ ] Compare Directus against Payload, NocoDB, Baserow, and Strapi using the criteria in `.plans/active/content-private-node-scaffold/artifacts/private-node-intake.md`
- [x] Choose `agent.greenpill.network` as the first deployed home for `POST /map-nodes` and `GET /map-nodes/public`
- [x] Provision the Fly agent app and Managed Postgres cluster after org/app/plan approval
- [x] Apply the production agent DB schema for private map-node intake and chapter impact cache tables
- [ ] Implement the add-node form and dispatch `greenpill:pending-map-node` after public-safe local storage
- [ ] Add browser/UI proof for local pending-node rendering once the form exists
