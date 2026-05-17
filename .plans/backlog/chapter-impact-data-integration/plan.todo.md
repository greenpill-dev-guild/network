# Chapter Impact Data Integration Plan

## Sequencing

- [x] Confirm the relevant repo baseline and current docs
- [x] Add chapter `impactSources` schema and Keystatic fields
- [x] Seed first public Green Goods garden mappings for matched chapters
- [x] Generate `/impact-sources.json` from enabled chapter bindings
- [x] Add public chapter-impact payload contracts and privacy tests
- [x] Add the chapter-page impact section with empty and unavailable states
- [x] Gate the chapter-page impact UI until the agent cache endpoint exists
- [x] Move reusable impact and map-node contracts into `packages/shared`
- [x] Add Hono-backed `packages/agent` and `packages/workspace` scaffolds for the package-based future structure
- [x] Add local runnable agent server with `/health` and `/ready`
- [x] Add local/Fly Postgres migration baseline for `chapter_impact_snapshots`
- [x] Add Fly agent Dockerfile and `packages/agent/fly.toml`
- [x] Harden privacy checks for snake_case upstream fields
- [x] Use distinct Green Goods role addresses for public member counts when arrays are available
- [x] Document the KarmaGAP/Green Goods server-cache contract in `docs/v2`
- [x] Refine scope and defaults in `spec.md`
- [x] Update `status.json` as decisions or readiness change
- [x] Capture the handoff or follow-up note in `handoffs/README.md`
- [x] Run `node --test scripts/chapter-impact-contract.test.mjs`
- [x] Run `node --test scripts/agent-contract.test.mjs`
- [x] Run `node scripts/plan-hub.mjs validate`
- [x] Run `bun run build`

## Remaining Follow-Up

- [ ] Curate KarmaGAP project/community identifiers for mapped chapters
- [ ] Provision the Fly agent app and Managed Postgres cluster after org/app/plan approval
- [ ] Implement the Fly agent cache job against `chapter_impact_snapshots`
- [ ] Wire `GET /impact/chapters/:slug` to cached normalized payloads
- [ ] Add browser proof for loaded, empty, stale, and unavailable chapter impact states once the agent exists
- [ ] Decide whether Hypercert and GreenWill evidence should be added to v2 payloads
