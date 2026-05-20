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

## Codex Production Directus/RBAC - 2026-05-20

Applied and verified the live production Directus content/admin path on Fly.

Proven:

- `network-admin` has production schemas `audit`, `content`, `impact`, `intake`, `public`, and `workspace`.
- `audit.agent_schema_migrations` records migrations `001` through `007`, including the operational content schema, public projection hardening, safe JSON boolean handling, and map-node edit-token/update-request tables.
- `DB_SEARCH_PATH` is restored to `array:public,content,intake,impact,workspace,audit`.
- `PUBLIC_URL` is `https://admin.greenpill.network`.
- Directus reset/invite email uses the bare sender address `no-reply@mail.greenpill.network`; display-name sender syntax failed SMTP validation.
- `bun run directus:content:setup` completed against production Directus and configured 46 permissions.
- Production roles/policies exist for Steward Editor, Steward Moderator, Trusted Publisher, and Operator.
- Operator policy has admin access and TFA enforcement.
- Steward Moderator can only see review-safe update-request fields and does not have private-contact or edit-token read permissions.
- Trusted Publisher can read private contacts, edit tokens, and trusted update-request metadata.
- The temporary setup token for `afo@greenpill.builders` was cleared after RBAC setup.
- `afo@greenpill.builders` is the active Directus administrator account.
- `https://admin.greenpill.network/server/health` returns OK.
- `https://agent.greenpill.network/ready` returns OK with database connectivity.

Remaining:

- Invite steward users in Directus and assign the narrowest role that fits each person.
- Run a production non-admin RBAC smoke test once at least one non-admin account exists.
- Decide whether to run `bun run content:migrate` for the production operational content seed. Do not run it if Directus-owned content already exists unless intentional missing-row recovery is needed.
- Keep public intake and public reads on `agent.greenpill.network`; do not expose Directus generated APIs as public submission or snapshot APIs.
