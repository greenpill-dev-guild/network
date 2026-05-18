# Handoffs

## Codex State Agent - 2026-05-16

Implemented the contracts-first scaffold for public content and private node intake.

Changed surfaces:

- `packages/website/src/content/config.ts`
- `packages/website/keystatic.config.ts`
- `packages/website/src/pages/locations.json.ts`
- `packages/website/src/scripts/map.ts`
- `packages/shared/src/map-nodes.js`
- `packages/agent/src/app.js`
- `packages/agent/src/db.js`
- `packages/agent/src/server.js`
- `.plans/active/content-private-node-scaffold/artifacts/private-node-intake.md`
- `packages/agent/migrations/001_private_map_node_schema.sql`
- `packages/agent/fly.toml`
- `scripts/agent-db.migrate.mjs`
- `scripts/map-node-contract.test.mjs`

Proof:

- `bun run test:map-nodes`
- `node --test scripts/agent-contract.test.mjs`
- `node --check scripts/agent-db.migrate.mjs`
- `bun run plans:validate`
- `bun run build`

Residual risk:

- The private CMS/admin layer is not chosen or deployed.
- `POST /map-nodes` and `GET /map-nodes/public` are still scaffolded `501` contracts under the agent app.
- `network-agent` is deployed on Fly with Managed Postgres attached, and the production agent schema has been applied.
- Docker Desktop is available locally through `/usr/local/bin/docker`; shells that miss `/usr/local/bin` may not find `docker` without an absolute path or PATH update.
- Add-node UI is not implemented yet, so local optimistic rendering is helper-level proof only.
- Empty `people` and `stories` collections produce build warnings until real content exists.

Use this file as the default handoff surface until the hub needs lane-specific handoff notes.

Capture:

- what was decided or proven
- what remains
- what the next person should read first
