# Chapter Impact Data Integration Spec

## Goal

Create the public-safe contracts and follow-up queue for chapter-page impact feeds backed by KarmaGAP and Green Goods data.

## Current State

- `chapters` content now supports optional `impactSources`.
- Keystatic exposes public impact source fields for chapter editors.
- `/impact-sources.json` publishes enabled source bindings for the agent/cache service.
- `packages/shared/src/chapter-impact.js` defines public payload normalization and privacy checks.
- `packages/agent/src/app.js` now serves `GET /impact/chapters/:slug` from cached normalized payloads in `impact.chapter_impact_snapshots`.
- `packages/agent/src/green-goods-impact.js` implements the Green Goods-first sync adapter and leaves Karma unfetched until curated identifiers exist.
- The chapter-page impact UI remains scaffold-gated until the public agent cache has live data and browser proof.
- `.plans/active/chapter-impact-data-integration/artifacts/impact-data-integration.md` documents the server cache and agent route contract.
- The chapter detail page contains the impact UI scaffold, but it stays hidden until the shared UI flag is enabled after the agent is live.

## Scope

- Public source bindings: Green Goods garden address/chain and optional KarmaGAP project/community identifiers.
- Server cache contract: read `/impact-sources.json`, fetch Green Goods first, leave Karma v2 behind curated project/community identifiers, and normalize to Fly Managed Postgres-backed public snapshots.
- Chapter page UI: show summary counts and public proof links, with empty and unavailable states.
- Validation: schema/build proof, normalizer tests, agent privacy tests, and UI follow-up proof once the agent exists.

## Constraints

- `.plans/active/public-website-design-implementation/artifacts/v2/` remains the canonical product and architecture artifact surface.
- `.plans/` carries execution sequencing, readiness, handoffs, and follow-up truth.
- This repo starts with manual plan updates plus validation, not automation claiming.
- Keep `status.json` taxonomy current enough for future filtering and dependency checks.
- Stories remain curated editorial content and are not populated from impact feeds.
- Emails, private notes, private map-node fields, raw EAS work feedback, raw media arrays, and moderation metadata must never appear in public impact payloads.
- Current Green Goods gardens may not have `gapProjectUID` populated, so v1 relies on curated Keystatic mappings.
- The repo contains the Fly agent package and local sync script; a Fly schedule/runner for `bun run impact:sync` remains an operational follow-up.
- Shared contracts live in `packages/shared` so future `packages/website`, `packages/workspace`, and `packages/agent` code can consume the same payload and privacy rules.

## Open Questions

- Which KarmaGAP project/community IDs should be mapped for each chapter?
- What cache refresh cadence should the Fly agent service use after live traffic and Karma rate limits are known?
- Should impact proof links later include Hypercert and GreenWill records, or should those remain a separate proof layer?
