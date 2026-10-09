# Directus CMS Advancement - Eval

## Evidence log

### 2026-10-09 PRD-809 production release and second QA pass

- **Merge and deploy.** PR #23 merged at 21:44:24 UTC (`58a3095`). The Fly.io
  GitHub app deployed the agent from that push: GitHub deployment
  `6971643450` went from in progress at 21:44:26 to success at 21:47:20, Fly
  release v71. It ran blue-green from `fly.toml`: machine `896269c6412dd8`
  started at 21:46:10 and passed `/ready`, and the old machine stopped at
  21:47:07. The new machine carries the CA file (same SHA-256 as
  `config/certificates/supabase-ca.crt`), `NODE_EXTRA_CA_CERTS`, and the
  watchdog settings, so the certificate path fix holds in Fly's own deploy.
- **No downtime.** A probe of `/ready` and `/content/public-snapshot` every
  few seconds from 21:43:09 UTC recorded 200 and 18 chapters on every probe,
  through the deploy, the migration, the Directus setup, and the smoke.
- **Migration 029.** Applied at 21:48:20 UTC through the agent machine
  (SHA-256 `48f70c43f5e8fd7b`, ledger at 30). Inside the same transaction the
  runner confirmed that all 18 chapter rows were byte-identical apart from the
  two new columns and that each of the 12 described images was backfilled
  from `media`. The newest chapter `updated_at` stayed at 19:22:49, so the
  migration triggered no site rebuild.
- **Public snapshot unchanged.** The live snapshot matched a capture taken
  before the release, record for record across all seven collections, after
  the deploy, after the migration, and after the smoke.
- **Directus.** Cache cleared, then `directus:content:setup` (114
  permissions) and `directus:studio:setup` (263 field updates). The first
  metadata run stopped on a 503 "Under pressure" after 232 updates; the setup
  client now retries that, and the second run finished. Production shows
  `image_alt` and `image_credit` as nullable fields under the chapter image
  with the alt-text condition, and the notification kinds include
  `chapter_image_withheld`.
- **Production steward smoke.** Passed at 22:05 UTC on `brasil` with
  `nigeria` as the forbidden chapter. A temporary steward attached an upload
  with alt text and credit, the public snapshot showed that image with its
  own description, and removing the upload brought the sourced image's
  description back. The chapter's image, alt text, credit, and `media` were
  the same before and after, and no temporary user, file, initiative, project,
  or request was left.
- **Publish loop.** The smoke's edits produced `content_dispatch_sent` at
  22:05:16 and Pages run `37997257839`, which succeeded at 22:08:12. The site
  built at 22:07:18 shows `brasil` with its original image, alt text, and
  credit. The watchdog logged `healthy` every minute throughout, and no
  snapshot alert was queued.


### 2026-10-09 production activation and release-order check

- **Background jobs were off.** Every agent sweep had been disabled on the
  running machine with machine-level `*_SWEEP_ENABLED=false` settings during
  that day's database move to Supabase and never re-enabled. `/ready` stayed
  green throughout. Symptoms: impact data last synced 06:58 UTC and served as
  stale, and no daily moderation digest by 18:37 UTC. Re-enabled at 19:17 UTC;
  the digest was created and sent at 19:17:26 and impact sync logged
  `checked: 4, saved: 4, failed: 0`.
- **The content-operations sweep had failed every minute since the 2026-10-05
  deploy.** The merged review-notification query selects columns that
  migration 028 adds, and 028 had not been applied. Dispatch ran before the
  failing step, so only review, decision, and quarantine emails were blocked;
  the queue was empty, so none were lost. Applied 028 at 19:18:56 UTC through
  the agent machine (ledger at 29); zero sweep failures after.
- **Watchdog on.** Token precheck from the machine: repository read 200 with
  push, Actions read 200. First check at 19:22:34 logged `healthy`.
- **Live alert proof.** Identical-value touch of the published `brasil`
  chapter at 19:22:49 → `content_dispatch_sent` at 19:23:31 → Pages run
  `37979909187` (`repository_dispatch`) succeeded, site built at 19:24:35 →
  stale alert queued and sent at 19:24:32 → recovery queued and sent at
  19:26:31. Both rows carry provider message ids. The threshold was 60 seconds
  for the proof and is now 1800000.
- **A deploy took the agent's database connection down for five minutes.** At
  19:46:17 UTC a deploy from `main` replaced the machine config, which
  dropped the Supabase CA file and `NODE_EXTRA_CA_CERTS` that existed only on
  the machine. `/ready` returned 503 until the settings were restored at
  19:51:32. Commit `feecca1` moved the certificate and the watchdog settings
  into `fly.toml`.
- **Release-order check closed.** The `[TEST] magic link check` node had been
  declined through a moderation link on 2026-08-11 04:33:44 UTC (review row
  actor `moderation-link:...`). Archived on 2026-10-09 19:27 UTC; it does not
  appear in `/map/state`.

### 2026-10-09 PRD-809 implementation and independent review

- **Rules.** Decided in `spec.md`; the write-by-write table is in
  `packages/admin/README.md`.
- **Independent review before merge.** It found no blocker and five defects in
  follow-on flows. All were fixed while migration 029 had only ever run
  locally: an accepted image lost its description after an upload was added
  and removed; "alt text required" blocked nothing, because the empty value
  was stored as `''` and Directus only treats `null` as missing; a sourced
  image changed outside an update request kept the old description; an
  accepted credit equal to the stored one was erased; and a withheld-image
  alert used up the chapter's one quarantine alert.
- **Database proof.** `bun run test:chapter-images:db` builds a scratch
  database, applies migrations 001 to 028, seeds rows shaped like production,
  applies 029, and asserts that the backfill changes nothing but the two new
  columns (`updated_at` included), that a replay is a no-op, and each write in
  the README table. Five deliberately broken variants of the migration each
  fail it.
- **Data Studio, in Brave on the local stack.** An upload without alt text
  cannot be saved (`Image alt text: Value can't be null`). With alt text it
  saves and the public snapshot shows the upload with its own description.
  Swapping the picture without editing the text empties both fields, and the
  form then refuses every save until alt text is entered. Emptying the credit
  saves as `NULL`.
- **Smokes.** Local `directus:steward:smoke` and
  `directus:map-moderation:smoke` pass. Interrupting the steward smoke while
  its test image is attached restores the chapter's file, alt text, credit and
  `media`, removes the temporary user and file, and exits 130.

### 2026-10-04 PRD-808 review pass

- Review found that the stale rule compared the newest content change with the
  time of the last build. A fresh edit made hours after a build alerted at
  once, and an edit made minutes after a build never alerted however long it
  waited. The rule now alerts when content changed after the deployed snapshot
  and the newest change has waited past the threshold, and it holds until the
  site catches up.
- A cancelled Pages run still counts as a failed delivery, now on purpose and
  under test. It is the only trace a hung deploy leaves: on 2026-09-30 one
  deploy job hung and every scheduled run after it was cancelled for four days.
- The two publish-health requests have a 15 second timeout, and a failed check
  logs a reason code.
- The four `directus-studio-setup.ts` type errors are fixed with annotations
  only, so the full root typecheck passes.
- Fresh proof: `typecheck`, `plans:validate`, `test:agent` (84 tests),
  `test:content` (23), `test:plans` (7) and `build` (47 pages) pass. The new
  stale tests fail against the original rule.
- Still not done: production migration 028, the Fly deploy, the token scope,
  enabling the check, and a live alert.

### 2026-08-11 PRD-808 publish-health draft

- Added a static `/build-metadata.json` website artifact with only build time
  and the public operational snapshot `generatedAt`; a 47-page Astro build
  emitted the expected JSON with no Directus or intake payloads.
- Added migration 028 with singleton content watermark/deployed build/Pages
  workflow/check/active-alert/recovery state and deduplicated publish-health
  events on the existing durable review-notification queue.
- Added the opt-in content-operations check for the deployed artifact and latest
  completed `github-pages.yml` run. URL and stale threshold are explicit agent
  settings; production activation still requires Actions read on the existing
  fine-grained token.
- Fresh focused proof: package compilation passed; agent suites passed 82 tests;
  content suite passed 23 tests; healthy, stale, build-failed, repeated, and
  recovered transitions plus public safety and Resend delivery are covered.
- No production migration, Fly deploy, secret/token change, or live alert test
  was performed. The full root typecheck remains blocked by four unchanged
  PRD-809 `directus-studio-setup.ts` errors already present on `main`.

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
  `/content/public-snapshot` or fails the site build. Since PRD-809 the
  chapter stays published with the image withheld, and an operator alert
  exists.
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
