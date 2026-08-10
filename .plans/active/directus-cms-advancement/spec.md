# Directus CMS Advancement - Spec

## Goal

Advance the Directus admin from "working pilot with manual glue" to a
low-friction, self-maintaining steward CMS: dynamic permissions instead of
snapshot policies, in-product feedback loops instead of Telegram/CLI glue,
form-grade editing UX, and deliberate adoption of the platform features the
pinned version already ships.

## Current State (evidence: reports/cms-review-2026-08-10.md)

- Directus 11.17.4 (docker image, `packages/admin/docker-compose.yml:3`),
  config applied imperatively via `scripts/directus-operational-content-setup.ts`,
  `scripts/directus-studio-setup.ts`, `scripts/directus-content-access.ts`.
  No Flows, no dashboards, no extensions, no translations; MCP, AI assistant,
  collaborative editing, and content versioning all off.
- 4 roles + per-(chapter|guild) scoped policies with slug literals baked into
  permission filters. `content-access -- sync` re-applies shapes; nothing
  revokes or prunes. Junction tables `content.chapter_editor_assignments` /
  `guild_editor_assignments` exist and are authoritative for the agent's map
  steward projection, but Directus access is a denormalized copy.
- Production website builds hourly from the agent's live
  `/content/public-snapshot` (verified green on 2026-08-10). The
  `repository_dispatch` receiver exists in `.github/workflows/github-pages.yml`;
  no sender exists. Build failures and snapshot staleness are silent.
- `content.chapter_update_requests` has structured proposed-change fields and
  child link/proof tables, but no apply path - publishers retype accepted
  changes by hand. The map-node analogue has a SQL apply function
  (`packages/agent/migrations/007_...sql:143-230`) proving the pattern.
- Publishing a new record 400s unless `published_at` and `reviewed_at` are
  hand-set (check constraints, no trigger).
- One unapproved chapter image or `mailto:` link fails the entire snapshot
  assertion -> agent route 500 + site build failure (all-or-nothing).
- Impact sync (`bun run impact:sync`) has no scheduler; stewards edit
  `impact_sources` blind with no result/error feedback in Directus.
- Steward-visible gaps: decided update requests disappear from their filtered
  view; media alt/credit lives in a raw JSON editor on the direct-edit path;
  chapters form is ~35 flat fields; `chapters.initiatives` / `guilds.projects`
  alias fields were never created; no file update/delete (focal-point UI
  403s); "My draft initiatives" bookmark hides published work.

## Scope

1. **Truth + prod re-sync (phase 0)**: align all remaining self-publish copy
   with the shipped `fac0a8c` model; re-apply setup + studio + sync in
   production after the 2026-08-10 image-upload shape change; add a Directus
   row to `docs/agentic-mcp-tooling-runbook.md`.
2. **Close the loop (phase 1)**: dispatch-on-publish, content-review
   notifications on the existing Resend queue, review-outcome visibility for
   stewards, publish-timestamp trigger, impact sync scheduling + steward
   feedback, per-record snapshot quarantine with operator alert, Live
   Onboarding auto-off, magic-link moderation enable/remove decision.
3. **Permissions v2 (phase 2)**: replace per-slug scoped policies with one
   static policy using `$CURRENT_USER` relational filters over the existing
   junction tables; assignment/revocation become pure data operations
   manageable in the Directus UI; retire `sync` into a verifier; decide
   multi-chapter stewardship.
4. **Data Studio UX (phase 3)**: field groups, structured list editors for
   links/proof/media, conditional fields + validation messages, missing O2M
   aliases, label translations, bookmark refresh, module/branding cleanup,
   steward + operator dashboards, scoped file update/delete.
5. **Platform decisions (phase 4)**: update-request apply path vs native
   content versioning, MCP enablement (runbook contract change), collaborative
   editing, AI assistant governance, v11 hold + Directus 12 licensing
   position, `content.people` render-or-retire.

## Constraints

- Privacy boundary is non-negotiable: projections stay in SQL +
  `@greenpill-network/shared`; Directus never becomes the public API.
- Greenpill-owned schema changes go through `packages/agent/migrations` only.
- Supply-chain rules: no new packages without explicit approval; Directus
  image stays pinned; `bunfig.toml` release-age gate preserved.
- `docs/agentic-mcp-tooling-runbook.md` currently declares "no project-scoped
  `.mcp.json`" - enabling Directus MCP is a deliberate contract change that
  must update the runbook in the same change.
- Directus 12 Core tier enforces 3 seats / 25 collections / 5 flows; the
  deployment has 27 collections and needs more seats, so v12 requires a
  license/grant decision first. Favor agent-side automation over Flows where
  equivalent so a future tier cap cannot break automation.
- Scoped create presets cannot be user-dynamic (Directus cannot evaluate
  relational filters at create validation); phase 2 must pick a mitigation
  (retained minimal per-scope create policy, agent-side check, or accept +
  publisher review).

## Decisions (Afo, 2026-08-10)

- **Update requests**: build the SQL apply function mirroring the map-node
  pattern (`007_...sql:143-230`) - publisher sets `request_status='accepted'`
  and a trigger applies proposed fields to `content.chapters` with
  optimistic-concurrency checks. Native content versioning is NOT pursued in
  this push.
- **Magic-link moderation**: enable in production following the documented
  release order (verify `/map/moderate`, migration 020, fresh 32+ byte
  secret as Fly secret, flip flag, authorized real-recipient smoke).
- **Multi-chapter stewards**: keep 1:1 (retain migration-018 unique
  constraint and current map projection). Dynamic permissions make lifting
  this later a small change.
- **MCP**: enable with a dedicated scoped machine user (minimal
  operational-content policy, `mcp_allow_deletes` off) and update
  `docs/agentic-mcp-tooling-runbook.md` in the same change.
- **AI assistant**: defer - provider keys stay unset; revisit with a
  governance note when there is a concrete use case.
- **`content.people`**: defer - keep as published-read reference data; the
  dual source of truth stays documented debt.

## Open Questions

- Steward UI languages: is a pt-BR/es translation pass worth it for the
  current steward cohort? (English label fixes are in scope now.)
- Directus 12 licensing: set a decision date for the Open Innovation Grant
  application if v12 is ever wanted.
