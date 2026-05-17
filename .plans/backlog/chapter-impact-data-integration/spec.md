# Chapter Impact Data Integration Spec

## Goal

Create the public-safe contracts and follow-up queue for chapter-page impact feeds backed by KarmaGAP and Green Goods data.

## Current State

- `chapters` content now supports optional `impactSources`.
- Keystatic exposes public impact source fields for chapter editors.
- `/impact-sources.json` publishes enabled source bindings for the agent/cache service.
- `packages/shared/src/chapter-impact.js` defines public payload normalization and privacy checks.
- `packages/agent/src/app.js` defines the Hono app scaffold, while `packages/agent/src/impact.js` reserves the agent route contract and public payload guard.
- The chapter-page impact UI is scaffold-gated until the agent endpoint exists.
- `docs/v2/impact-data-integration.md` documents the server cache and agent route contract.
- The chapter detail page contains the impact UI scaffold, but it stays hidden until the shared UI flag is enabled after the agent is live.

## Scope

- Public source bindings: Green Goods garden address/chain and optional KarmaGAP project/community identifiers.
- Server cache contract: read `/impact-sources.json`, fetch KarmaGAP and Green Goods, normalize to Fly Managed Postgres-backed public snapshots.
- Chapter page UI: show summary counts and public proof links, with empty and unavailable states.
- Validation: schema/build proof, normalizer tests, agent privacy tests, and UI follow-up proof once the agent exists.

## Constraints

- `docs/v2/` remains the canonical product and architecture document surface.
- `.plans/` carries execution sequencing, readiness, handoffs, and follow-up truth.
- This repo starts with manual plan updates plus validation, not automation claiming.
- Keep `status.json` taxonomy current enough for future filtering and dependency checks.
- Stories remain curated editorial content and are not populated from impact feeds.
- Emails, private notes, private map-node fields, raw EAS work feedback, raw media arrays, and moderation metadata must never appear in public impact payloads.
- Current Green Goods gardens may not have `gapProjectUID` populated, so v1 relies on curated Keystatic mappings.
- This repo does not yet contain the deployed Fly agent service; agent/cache work remains a contract until that service exists.
- Shared contracts live in `packages/shared` so future `packages/website`, `packages/workspace`, and `packages/agent` code can consume the same payload and privacy rules.

## Open Questions

- Which KarmaGAP project/community IDs should be mapped for each chapter?
- What cache refresh cadence should the Fly agent service use after live traffic and Karma rate limits are known?
- Should impact proof links later include Hypercert and GreenWill records, or should those remain a separate proof layer?
