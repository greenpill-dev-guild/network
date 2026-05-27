# Workspace Auth Routing Decision Pack Plan

## Sequencing

- [x] Confirm the current repo baseline: `packages/workspace` is scaffold-only; website is static; agent and Directus own private runtime/admin surfaces.
- [x] Record no-code-before-decision defaults in `spec.md`.
- [ ] Produce the route matrix for public, protected, callback, admin-only, and API surfaces.
- [ ] Produce the ownership matrix for user, chapter, guild, steward, and operator-owned records.
- [ ] Compare auth/session provider options against self-hosting, local dev, deploy, recovery, and exportability criteria.
- [ ] Decide workspace API/data-flow boundary and required shared public projections.
- [ ] Define implementation acceptance gates and update lane state in `status.json`.
- [ ] Run `bun run plans:validate`.
