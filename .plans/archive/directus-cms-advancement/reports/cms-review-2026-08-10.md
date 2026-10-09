# Greenpill Directus CMS Review - 2026-08-10

Full-system review of the Directus admin surface, steward experience, and
operational-content pipeline, feeding the `directus-cms-advancement` hub.

**Method**: repo-wide read of `packages/admin`, `scripts/directus-*.ts`,
`scripts/operational-content.ts`, `packages/agent` migrations + routes,
`packages/shared` contracts, website consumption, workflows, `.plans`, and
docs; hands-on inspection of a freshly bootstrapped local stack (Directus
11.17.4 admin API: settings, roles, policies, permissions, presets, flows,
collections, field metadata); `bun run directus:steward-smoke` pass;
GitHub Actions run history for the Pages workflow; Directus release/licensing
research. Production Directus was intentionally not accessed.

---

## 1. What is working well

- **Architecture separation holds**: static site + agent API + private
  Directus, privacy projections centralized in `packages/shared` and SQL
  views. No route-local privacy filters found.
- **The pipeline is more automated than team lore says**: production builds
  fetch the agent's live snapshot (`.github/workflows/github-pages.yml:63`)
  on an hourly cron that is green (verified 15/15 recent runs succeed,
  2026-08-10). A steward edit reaches the site in <= ~1-2.5h with zero human
  action. The stale committed snapshot JSON (last refresh 2026-05-20) is only
  the local-dev/fallback source.
- **Privacy engineering is thorough**: role-tiered field access for intake
  (moderators never see `raw_note`/contacts; publishers do), PII isolated in
  `map_node_private_contacts`, public image visibility keyed to a published
  chapter referencing the file (`published_chapter_image` alias mechanism),
  asset URLs projected without uploader identity.
- **The steward smoke test is real**: temp steward, scoped edit, initiative +
  update request creation, image upload -> public asset chain, agent snapshot
  projection - all pass locally end-to-end.
- **Recent momentum is in the right direction**: direct live-row editing
  (`fac0a8c`), setup resilient to a pending migration (`87ead42`), moderation
  magic links built (`15107c1`), image uploads (`3a2858f`).

## 2. Issue register

Severity: **P0** = actively wrong/blocking or silently dangerous; **P1** =
real friction or fragility; **P2** = polish/debt. Phase = fix location in
`plan.todo.md`.

### A. Trust and consistency (steward-visible contradictions)

| ID | Sev | Issue | Evidence | Phase |
|----|-----|-------|----------|-------|
| A1 | P0 | Publish-authority copy contradicts shipped behavior: scoped stewards CAN self-publish (`EDITOR_STATUSES` includes `published`, deliberate per `fac0a8c`), but role description ("without publish access", setup `:1119`), field note (studio `:280`), STEWARD_GUIDE:21, and READMEs said they cannot. Guide contradicted itself (:16 vs :21). | `scripts/directus-content-access.ts:32-36` | 0 (docs fixed 2026-08-10; script copy remains) |
| A2 | P1 | Decided update requests vanish from steward view: scoped read filter is `request_status _in [draft,pending_review,needs_changes]`, so `accepted`/`declined` (and `reviewer_notes`) are never visible to the person who asked. | `scripts/directus-content-access.ts:38` | 1 |
| A3 | P2 | "My draft initiatives" bookmark hides published initiatives; "My" implies user-scoping that is actually policy-side. | studio-setup presets | 3 |
| A4 | P2 | Guide says "Chapter image"; UI renders auto-humanized "Image File" (zero translations configured). | STEWARD_GUIDE.md:82 | 3 |
| A5 | P2 | `packages/admin/README.md` still instructed update-requests-instead-of-direct-edits, inverted from `fac0a8c`. | README.md:210-216 | 0 (fixed 2026-08-10) |

### B. Workflow dead-ends (biggest steward pain)

| ID | Sev | Issue | Evidence | Phase |
|----|-----|-------|----------|-------|
| B1 | P0 | `chapter_update_requests` has no terminus: no trigger/script/route applies an accepted request to `content.chapters`. Publishers retype by hand. All structured proposed-* fields + child link/proof tables are write-only data. The map-node analogue has a complete SQL apply function to mirror. | migrations `015`/`016`; pattern at `007_...sql:143-230` | 4 |
| B2 | P0 | No notification for content review: `pending_review` fires nothing; process is "message the Telegram steward chat". Map moderation has a durable Resend queue; content review has zero. | STEWARD_GUIDE.md:163-166 | 1 |
| B3 | P1 | Publishing a NEW record 400s unless `published_at` AND `reviewed_at` are hand-set (check constraints `*_published_requires_review`; no trigger sets them; Directus shows a bare 400). | `004_...sql:104-106` | 1 |
| B4 | P1 | Assignment UI is a trap: Trusted Publisher can create `chapter_editor_assignments` rows in Directus, but a junction row grants nothing - access exists only when the CLI (`content-access -- assign`, TSV-driven) also builds the scoped policy. Silent, no error. | `scripts/directus-content-access.ts:864-926` | 2 |
| B5 | P1 | No steward file update/delete: `directus_files` is read+create only, so the focal-point picker 403s (it PATCHes), and a bad upload cannot be renamed/removed. All stewards see all chapters' uploads incl. `uploaded_by` (flat folder). | setup `:713-816` | 3 |
| B6 | P1 | Direct-edit path has worse media UX than the review path: alt/credit require editing the `media` raw-JSON blob, while update requests have first-class `proposed_image_alt`/`credit` fields. | studio-setup `:364`, guide `:87` | 3 |
| B7 | P2 | Stewards cannot delete anything (mistyped initiative is permanent; slug immutable by design); no guardrail copy explains this. | `SCOPED_EDITOR_IMMUTABLE_UPDATE_FIELDS` | 3 |
| B8 | P2 | Stewards have no write access to their own `people` profile; `content.people` is fully plumbed (table, view, snapshot key, 21 records) and rendered nowhere - chapter pages use the `chapters.stewards` JSON blob instead. Dead dual source of truth. | `004:46`, `chapters/[slug].astro:36-60` | 4 |
| B9 | P2 | Missing O2M aliases `chapters.initiatives` and `guilds.projects` (relations exist; alias fields never created) - stewards cannot see/manage a chapter's initiatives from the chapter record. | setup `:1611-1618` vs `:1595` | 3 |

### C. The staleness machine (permissions/drift by design)

| ID | Sev | Issue | Evidence | Phase |
|----|-----|-------|----------|-------|
| C1 | P0 | Scoped access = one policy per (kind, slug) with slug literals frozen into every permission filter. Every shape change strands existing stewards until `content-access -- sync` is hand-run. Documented incident: "10 of 11 chapter policies were still on the pre-2026-06-15 5-permission shape". Junction tables + O2M relation already exist, and an unused `currentUserEditorAssignmentFilter` helper shows the dynamic design was started: `$CURRENT_USER` relational filters can eliminate the class. | `directus-content-access.ts:535-539,623-838`; setup `:255-259` (dead) | 2 |
| C2 | P0 | No revocation path: nothing ever deletes a policy or `/access` row; deleting an assignment junction row leaves the steward's edit rights intact indefinitely. | grep: no `DELETE /policies` anywhere | 2 |
| C3 | P1 | `sync` silently downgrades roles: only `Greenpill Operator` is protected; a Trusted Publisher holding a chapter assignment gets PATCHed down to Steward Editor. | `directus-content-access.ts:467-481` | 2 |
| C4 | P1 | Scoped policies are never pruned: `upsertPermission` creates/patches only; removed permissions linger on every provisioned policy forever. | `:567-601` | 2 |
| C5 | P1 | Unknown production state after `3a2858f` (+226 lines of permission shape for image uploads on 2026-08-10): if `content:setup` + `studio:setup` + `sync` were not re-run in prod after deploy, live stewards lack the image permissions the guide now documents. Needs operator verification. | commit `3a2858f`; last verified prod state = 64 permissions on 2026-07-31 (`87ead42`) | 0 |
| C6 | P2 | Chapter slug rename silently breaks every scoped filter, preset, preview URL, and the agent's steward map join; nothing detects it. | filters `{"slug":{"_eq":"<literal>"}}` | 2 (dynamic filters remove most of the blast radius) |
| C7 | P2 | Setup-order fragility: `studio:setup` hard-throws on a pending migration (unlike `content:setup` since `87ead42`); m2o fields silently degrade to text inputs if relations are missing. | studio-setup `:631`, `:810-823` | 1-2 (make both tolerant + verifiable) |

### D. Pipeline fragility (site-level)

| ID | Sev | Issue | Evidence | Phase |
|----|-----|-------|----------|-------|
| D1 | P0 | All-or-nothing snapshot asserts: ONE chapter with unapproved media (`media.reviewStatus !== 'approved'`) or ONE `mailto:` link fails the entire snapshot -> agent route 500s AND site build fails. Steward image uploads just shipped, raising the odds of exactly this. | `packages/shared/src/public-content.ts:394-403,375-377` | 1 |
| D2 | P1 | No dispatch-on-publish: the `repository_dispatch` receiver exists (`operational-content-updated`) with the exact `gh api` call in a comment; nothing sends it. Publish latency is the cron interval (observed 1-2.5h). | `github-pages.yml:19-22` | 1 |
| D3 | P1 | Silence on failure/staleness: no alert when the hourly build fails (e.g. agent asleep at the cron tick), no freshness watchdog, no signal a steward can check for "is my edit live". | `github-pages.yml:54-55`; `fly.toml:23` | 1 |
| D4 | P1 | `content:snapshot` never reads the database - it regenerates from seed files; the committed fallback JSON is 82 days stale and feeds every local dev session. Command name + README wording actively mislead. `content:migrate` is insert-only (`on conflict do nothing`) and cannot repair. | `scripts/operational-content.ts:15,43-53` | 0 |
| D5 | P1 | Impact loop is open: no scheduler runs `impact:sync` (6h `stale_after` is a label; stale payloads serve forever); stewards edit `impact_sources` blind - snapshots/errors are not visible in Directus; KarmaGAP fetch is a stub; EAS counts hardcoded 0. | `green-goods-impact.ts:161-173`; `server.ts:132` | 1 |
| D6 | P1 | Agent depends on its own built site: `/map/state` fetches `locations.json`, impact sync fetches `impact-sources.json` from greenpill.network. Chapter pins/bindings are build-frozen; on 404/staleness they silently degrade. | `map-state.ts:17,105-115`; `green-goods-impact.ts:31` | 1 (alert) / 4 (consider direct DB reads) |
| D7 | P1 | Live Onboarding Mode has no auto-off: forgotten toggle = every public submission auto-approves indefinitely. | `003:9`; admin README | 1 |
| D8 | P2 | Magic-link moderation is ~600 lines of built, tested, DISABLED code (`MAP_NODE_MODERATION_MAGIC_LINK_ENABLED='false'`). Ship it or delete it. | `packages/agent/fly.toml:18` | 1 (decision) |
| D9 | P2 | Migration hygiene: duplicate `018_*` prefixes; conditional FK skips (`012`,`022`) mean prod/local can differ structurally with no record; `agent-public-content-seed.ts` has no package script. | migrations dir | 1 |

### E. Unused Directus platform leverage (pinned 11.17.4 already ships all of this)

Applied-state inspection of the bootstrapped local instance (mirrors what the
setup scripts produce):

| Feature | State today | Opportunity |
|---------|-------------|-------------|
| Native MCP server (since 11.13) | `mcp_enabled: false` | Permission-scoped agentic content ops; fits the repo's agent-first direction. Runbook currently says "no project-scoped `.mcp.json`" - enabling is a deliberate contract change. Phase 4 |
| Collaborative editing (11.15) | `collaborative_editing_enabled: false` (websockets already on) | Two stewards/publisher co-editing during syncs; presence indicators. Phase 4 |
| Content versioning + global draft versions (11.16) | `versioning=false` on every collection | Candidate replacement for the bespoke `chapter_update_requests` system: native drafts + role-gated promote. Phase 4 decision |
| AI assistant (11.14) | All provider keys null | Alt-text/summary drafting; needs governance first. Phase 4 |
| Flows | 0 configured | Deliberately keep automation agent-side (secrets, durability, future v12 flow caps) - documented decision, not an accident. Phase 1 |
| Dashboards/Insights | 0 | Operator dashboard: pending reviews, failed alerts, freshness, impact health. Phase 3 |
| Translations | 0 rows | Field labels that match the guide; later pt-BR/es UI. Phase 3 |
| Field groups/conditions/validations | none anywhere; chapters = 38 flat fields, `media`/`links` raw JSON editors | Grouped forms, structured list editors, enforced conditional requirements. Phase 3 |
| Module bar / branding / landing | defaults; project named "Directus" (local) | Role-curated modules, Greenpill branding, help URLs. Phase 3 |
| 13 technical collections | no metadata (visible raw to admins; `map_node_intake_settings` singleton unlabeled) | Hide/label; singleton gets a proper toggle UI. Phase 3 |

### F. Version and licensing strategy

- Pinned: `directus/directus:11.17.4`. Current upstream: **12.2.0** (July 2026).
- **Directus 12 changes the deal**: MSCL license with ACTIVE enforcement.
  Free self-hosted Core tier caps at **3 user seats / 25 collections /
  5 flows**. This deployment has **27 non-system collections** and needs more
  than 3 seats -> upgrading without a license/grant would break the CMS.
  30-day grace period on upgrade, then enforcement.
- Open Innovation Grant offers free commercial use for orgs with <$5M annual
  revenue and <50 employees - Greenpill likely qualifies, but it is an
  application + key, not a default.
- 12.2 also rebuilt the WYSIWYG on Tiptap (stored HTML normalizes on first
  edit) - a content-migration consideration.
- **Recommendation**: hold on latest 11.17.x patches and exploit the v11
  features above (they are the actual UX levers); treat v12 as a separate
  licensing decision with a date, not a routine upgrade. Prefer agent-side
  automation over Flows so a future tier cap cannot strand automation.

## 3. Production verification checklist (operator-run; not verifiable from the repo)

1. `bun run directus:content:setup` + `bun run directus:studio:setup` against
   prod after `3a2858f`, then `bun run directus:content-access -- sync`, then
   `bun run directus:steward:smoke` (C5).
2. Confirm prod `directus_settings`: `mcp_enabled`, `collaborative_editing_enabled`
   both false (expected), project branding state.
3. Confirm no manually-created Flows/dashboards exist in prod that the repo
   does not know about.
4. Spot-check one steward account: policy count, image upload, update-request
   visibility.

## 4. Corrections to prior working assumptions

- "Directus edits need a snapshot refresh + push to main; Pages deploy has no
  schedule" - **outdated**. Since `f53624c` production builds fetch the live
  agent snapshot, and the workflow has had an hourly cron + dispatch receiver.
  The remaining truth: local dev + fallback JSON are 82 days stale (D4), and
  the loop lacks a publish trigger (D2) and failure signal (D3).
- "Stale scoped policies" lore is confirmed and current (C1-C5), fixed
  structurally only by the phase-2 dynamic-filter model.
