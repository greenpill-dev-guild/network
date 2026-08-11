# Directus CMS Advancement - Eval

## Evidence log

### 2026-08-11 implementation pass

- Local stack (fresh bootstrap): migrations 023-027 applied; dynamic-policy
  setup + studio groups/settings applied cleanly; extended
  `directus:steward:smoke` PASSED - junction-row-only grant, dynamic create
  validations, image chain, cross-chapter denials, stray-child containment
  (migration-027 trigger + scope invisibility), and immediate revocation on
  assignment-row delete.
- Migration behaviors verified against local Directus: accept->apply copied
  proposed summary/links/media alt onto the chapter with `reviewed_at`
  stamped; notification queue enqueued `update_request_pending` +
  `update_request_decided`; child slug fill; publish defaults
  (`published_at`, `reviewed_at`, `reviewed_by='system:auto-publish'`).
- Test suites green: content-access (10), studio-setup, steward-smoke,
  users, sync-prep (25 total), `test:agent` 64, `test:content` 21,
  `test:map-nodes` 42/43 (1 pre-existing HomeMap picker source failure,
  spawned as its own task).
- Production: migrations 023-027 applied via the network-admin machine
  (28 tracked); agent deployed with content-operations + impact sweeps
  (`impact_sync_sweep_completed { checked: 4, saved: 4, failed: 0 }` - first
  scheduled impact sync ever); magic-link moderation enabled with a fresh
  staged secret; `/ready` and `/content/public-snapshot` healthy post-deploy.
- Prod resync (pre-v2 shape) completed earlier the same day: 17/17
  assignments `role ok, policy ok`.

## Acceptance Checks

### Phase 0
- No repo doc claims stewards cannot publish their own scoped rows; role
  description, field notes, guide, and READMEs all describe the direct-edit
  model consistently.
- Production `directus:steward:smoke` passes after re-apply, including the
  chapter image upload chain added 2026-08-10.
- `docs/agentic-mcp-tooling-runbook.md` contains a Directus/admin row with a
  named proof surface.

### Phase 1
- A steward edit to a published chapter is visible on greenpill.network in
  under 10 minutes without any human action (dispatch observed in the Pages
  workflow run list with event `repository_dispatch`).
- A static deployed build-metadata artifact exposes only the public snapshot
  timestamp needed for freshness proof; it contains no private Directus or
  intake data.
- A stale deployed timestamp and a failed `github-pages.yml` run each create
  one durable operator alert; repeated unhealthy sweeps do not duplicate it,
  and recovery creates one recovery notification and clears active state.
- Moving an update request to `pending_review` produces a publisher email;
  accept/decline produces a steward email; both visible in the notification
  queue with delivery status.
- A steward can open an `accepted` or `declined` request and read
  `reviewer_notes` (verified in steward smoke).
- Creating and publishing a new chapter in Directus succeeds without
  hand-setting timestamps.
- `impact.chapter_impact_snapshots` refreshes on schedule; a steward can see
  sync status + last error for their chapter's bindings in Directus.
- A chapter with an unapproved image no longer 500s
  `/content/public-snapshot` or fails the site build; the record is
  quarantined and an operator alert exists.
- The delivered `[TEST] magic link check` email is used by a human to approve
  or decline the node, the outcome is verified, and the test node is archived.

### Phase 2
- Creating a `chapter_editor_assignments` row in the Directus UI grants
  editing within one request cycle; deleting it revokes access (proved in
  extended steward smoke).
- Zero per-slug `Greenpill Chapter Editor: *` / `Guild Editor: *` policies
  remain; `directus:content-access verify` reports effective access ==
  junction rows.
- Changing the permission shape in code + re-running setup updates every
  steward at once (no per-user sync step).

### Phase 3
- Chapters form renders grouped sections; links/proof use structured O2M
  editors, while direct chapter image alt/credit use first-class fields.
- Existing `media.imageAlt`/`media.imageCredit` values survive migration and
  the public projection remains backward compatible; direct edits and
  accepted update requests produce the same authoritative metadata.
- `proposed_image_alt` is enforced when an image is proposed.
- Stewards can fix focal point/title on their own uploads; cannot touch other
  stewards' files (smoke-asserted).
- Field labels match STEWARD_GUIDE wording and resolve for the confirmed
  English, pt-BR, and Spanish Directus locale keys.
- Re-running studio setup updates one named operator Insights dashboard and
  its panels without duplicates. Panels show pending reviews, failed alerts,
  deployed snapshot freshness, and impact-sync health without private intake
  payloads or hidden technical fields.

### Phase 4
- Either: accepted update requests apply to the live chapter row without
  retyping (SQL function tested), or: content versioning pilot documented
  with draft-promote flow and the request-table retirement plan.
- MCP: a scoped machine-user token can list/edit exactly the operational
  collections its policy allows and nothing else; runbook updated in the
  same change.
- Licensing position documented in this hub with a decision date.

## Proof

- `bun run plans:validate`
- `bun run directus:steward:smoke` (local + production variants) - extended
  to cover revocation, review-outcome visibility, image chain, file
  update/delete scoping.
- `bun run test:agent`, `bun run test:content`, `bun run test:map-nodes`
  after any shared-contract or projection change.
- `gh run list -R greenpill-dev-guild/network --workflow=github-pages.yml`
  showing `repository_dispatch` events for phase 1.
- Screenshots of grouped chapter form + structured link editor at
  375/1024/1440 for the Studio UX lane (steward-facing admin UI is exempt
  from the public-site token system but should still be legible and
  keyboard-navigable).
- Review report stays the evidence baseline:
  `reports/cms-review-2026-08-10.md`.
