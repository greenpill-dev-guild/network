# Chapter Impact Data Integration Evaluation

## Acceptance Checks

- Astro content accepts optional chapter `impactSources`.
- `/impact-sources.json` includes only enabled chapters with at least one mapped public source.
- Public impact normalizers never expose private map-node fields, raw EAS feedback/media, or moderation data.
- Chapter pages show an impact section only for enabled source bindings.
- `status.json` matches the intended backlog stage and lane state.
- Validation passes with `node scripts/plan-hub.mjs validate`.

## Proof

- `node --test scripts/chapter-impact-contract.test.mjs`
- `node --test scripts/agent-contract.test.mjs`
- `node --check packages/agent/src/db.js`
- `node --check packages/agent/src/server.js`
- `node --check scripts/agent-db.migrate.mjs`
- `bun run start:agent` plus local `/health`, `/ready`, and scaffolded impact-route smoke checks
- `node scripts/plan-hub.mjs validate`
- `bun run build`
