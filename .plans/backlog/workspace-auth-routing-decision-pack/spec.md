# Workspace Auth Routing Decision Pack Spec

## Goal

Create the implementation-ready decision pack for `app.greenpill.network` before any authenticated workspace code is written.

## Current State

- `packages/workspace` is a boundary scaffold only.
- The public Astro website remains static and consumes public snapshots or approved public agent routes.
- The Hono agent owns private runtime concerns and public-safe API routes.
- Directus owns operational admin editing and moderation, but Greenpill-owned schema remains in SQL migrations.

## Decision Areas

| Area | Required Decision Before Code |
|---|---|
| Route model | List public, authenticated, admin-only, and callback routes for `app.greenpill.network`; identify any routes that must remain on `agent.greenpill.network` or Directus. |
| Ownership model | Define user-owned, chapter-owned, guild-owned, steward-moderated, and operator-only record classes. |
| Auth/session provider | Pick the provider only after comparing self-hosting fit, token/session model, local dev ergonomics, Fly/Vercel compatibility, account recovery, and exportability. |
| API boundary | Decide whether workspace calls the agent API, a new workspace backend, or both; public browser bundles must never receive database credentials or Directus admin tokens. |
| Private data classes | Classify emails, raw notes, IP/user-agent metadata, pending intake, steward review notes, hidden admin actions, and auth/session identifiers as private by default. |
| Public projections | Define which workspace-derived data can become public and require shared projection contracts before publication. |
| Validation gates | Define the contract tests, privacy tests, browser proof, and migration checks required before implementation closeout. |

## Defaults Until Reviewed

- No workspace runtime code, auth middleware, package dependency, or database migration should be added.
- No auth provider is selected by implication.
- Existing Directus and agent boundaries stay authoritative.
- Shared public projection contracts remain dependency-free unless a future supply-chain-approved plan chooses otherwise.

## Constraints

- `.plans/` carries planning, research, execution sequencing, readiness, handoffs, and follow-up truth.
- Runtime contracts and executable artifacts live under `packages/`.
- This repo starts with manual plan updates plus validation, not automation claiming.
- Keep `status.json` taxonomy current enough for future filtering and dependency checks.

## Open Questions

- Which auth/session provider best fits Greenpill's self-hosting and contributor-access goals?
- Which workspace capabilities must launch first: member profile, steward review, owner updates, chapter/guild collaboration, or impact review?
- Whether workspace deploy target should be Vercel, Fly, or another runtime once auth and data-flow decisions are made.
