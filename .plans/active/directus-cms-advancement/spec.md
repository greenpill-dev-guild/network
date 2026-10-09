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
   Onboarding auto-off, magic-link moderation delivery + human release-order
   proof, and a durable deployed-snapshot freshness/Pages-failure watchdog.
3. **Permissions v2 (phase 2)**: replace per-slug scoped policies with one
   static policy using `$CURRENT_USER` relational filters over the existing
   junction tables; assignment/revocation become pure data operations
   manageable in the Directus UI; retire `sync` into a verifier; decide
   multi-chapter stewardship.
4. **Data Studio UX (phase 3)**: field groups, structured list editors for
   links/proof, first-class direct chapter image alt/credit columns with a
   backward-compatible public projection, conditional fields + validation
   messages, missing O2M aliases, English + pt-BR/es label metadata, bookmark
   refresh, module/branding cleanup, steward landing bookmarks + operator
   Insights dashboard, and scoped file update/delete.
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

## Chapter image rules (PRD-809, decided during implementation 2026-10-09)

PRD-809 left one decision open: what happens to a chapter while its uploaded
image is not approved. These rules were chosen during implementation to match
decisions already on record, and are Afo's to overrule:

- **An uploaded chapter image needs no separate media review.** The steward or
  publisher who attaches it publishes it. This follows the 2026-07-31 decision
  that assigned stewards edit their own live records without approval, and it
  is what already happens for every chapter that has a steward: all twelve
  carry an approved media review, so their uploads go live today. The review
  gate keeps its original job, which is clearing images that research or
  enrichment sourced on a chapter's behalf.
- **An image that is not cleared is withheld; the chapter stays published.**
  A withheld image never removes a chapter from the site. The operator gets
  one `chapter_image_withheld` alert, separate from the `record_quarantined`
  alert that means a record was dropped.
- **Alt text and credit are columns and describe the image the chapter shows
  now**, so the form shows what the public page shows. `media` keeps the
  sourced image's description, also while an upload hides it. A different
  upload empties text that did not arrive with it; removing the upload brings
  the sourced image's description back; an accepted update request with an
  image makes that the chapter's one image and replaces an upload. The full
  table is in `packages/admin/README.md`.
- **Alt text is asked for, not enforced.** Data Studio requires it while an
  upload is attached. The API does not, and an uploaded image without alt text
  is still published with the page's generic description. Withholding such an
  image was rejected: a steward who swaps a photo would see the photo vanish
  from the site with no message addressed to them.
- **Swapping an upload empties an unchanged credit too.** Data Studio only
  sends changed fields, so the database cannot tell a kept credit from a stale
  one. A missing credit is visible and easy to fix; a wrong one credits the
  previous photographer for a new picture.

The alternative, holding steward uploads for publisher approval, would need a
publisher image queue and notifications, and would reverse the direct-edit
model for one field. To switch, change the upload branch of
`resolvePublicChapterImage` in `packages/shared/src/public-content.ts`.

## Platform health implementation contract (PRD-808, 2026-08-11)

Merged on 2026-10-05 and live in production since 2026-10-09: migration 028
applied, the check enabled with a 30 minute threshold, and a stale alert and
recovery proven end to end. The dispatch token in production is still the
GitHub CLI token set on 2026-08-11. Its `repo` scope covers Actions read, so
the check works, but a repository-scoped fine-grained token remains the
better replacement.

- **Freshness source**: publish a public-safe static build-metadata artifact
  from the website build. The agent must compare that deployed artifact with
  the database content watermark; the live agent snapshot `generatedAt` is
  request-time metadata and cannot prove deployed-site freshness.
- **Watchdog state**: persist content watermark, deployed build timestamp,
  Pages workflow conclusion, check time, active alert, and recovery state.
  Route state transitions through the existing durable Resend queue and
  deduplicate repeated sweeps.
- **Stale rule**: the site is stale when content changed after the deployed
  snapshot was generated and the newest change has waited past the threshold.
  The alert holds until the deployed snapshot is newer than the content.
- **GitHub permission**: production activation requires a fine-grained token
  with Actions read as well as Contents read/write.
- **Image metadata**: add Greenpill-owned chapter alt/credit columns, backfill
  from `media` JSON, retain a compatibility fallback, and converge direct
  edits with the accepted update-request apply path.
- **Dashboard dependency**: the operator dashboard's freshness panels
  (PRD-1119) consume PRD-808's persisted health state, so the platform
  contract lands first.

## Open Questions

- Which exact Directus locale keys are active for the production pt-BR and
  Spanish users? Confirm them before writing field/group translation metadata.
- Directus 12 licensing: set a decision date for the Open Innovation Grant
  application if v12 is ever wanted.
