# Directus CMS Advancement - Plan

## Sequencing

Phases are ordered by risk-reduction per unit effort. Phase 0 is
correction/re-sync work; each later phase is independently shippable.
Full evidence for every item: `reports/cms-review-2026-08-10.md`.

### Phase 0 - Truth and production re-sync

- [x] Fix stale docs contradicting the direct-edit model
      (`packages/admin/README.md` update-request paragraphs,
      `STEWARD_GUIDE.md` "cannot publish" line) - done 2026-08-10 alongside
      this hub.
- [x] Fix `.plans` CLI references (`plan-hub.mjs` -> `bun run plans:*`) -
      done 2026-08-10.
- [x] Align remaining self-publish copy with shipped behavior: role
      description (`directus-operational-content-setup.ts:1119`),
      `publication_status` field note (`directus-studio-setup.ts:280`),
      dead `editorStatuses` const (`directus-operational-content-setup.ts:1065`).
- [x] Production re-apply after the 2026-08-10 image-upload shape change:
      `directus:content:setup` -> `directus:studio:setup` ->
      `directus:content-access -- sync` -> `directus:steward:smoke`
      against production env (operator-run; needs prod admin credentials).
- [x] Add a Directus/admin row to `docs/agentic-mcp-tooling-runbook.md`
      (primary use, do-not-use, proof surface = steward smoke + content-access
      tests) so admin changes have a declared proof lane.
- [x] Rename `content:snapshot` or its description so nobody reads it as
      "pull latest from the database" (it reads seed files), and add a
      `content:snapshot:from-agent` path that regenerates the committed
      fallback JSON from the live agent snapshot to retire the 82-day-stale
      committed fallback.

### Phase 1 - Close the loop (latency, notifications, fragility)

- [x] Dispatch-on-publish: agent-side watcher (durable queue like
      `map_node_moderation_notifications`) observes operational-content
      changes and sends `repository_dispatch` `operational-content-updated`
      to `greenpill-dev-guild/network`; PAT stays in agent Fly secrets.
      Directus Flow variant explicitly declined to avoid future flow caps and
      keep secrets off the CMS.
- [x] Publish-failure + freshness alerting (merged 2026-10-05, live in
      production since 2026-10-09 with a stale-alert and recovery proof; see
      `eval.md`):
  - [x] Add a public-safe, static website build-metadata artifact containing
        the operational snapshot `generatedAt`; the agent must poll the
        deployed artifact rather than its live snapshot endpoint.
  - [x] Persist the latest content watermark, deployed build timestamp,
        GitHub Pages workflow conclusion, check time, and alert state so
        stale/failing/recovered transitions are durable and deduplicated.
  - [x] Compare the deployed timestamp with `max(updated_at)` across the
        operational-content tables on the existing content-operations sweep;
        make the URL and stale threshold explicit agent env settings.
  - [x] Query the `github-pages.yml` workflow result and route stale/build
        failure alerts through the existing durable Resend queue, including a
        recovery notification. The production fine-grained token must include
        Actions read in addition to Contents read/write before activation.
  - [x] Recover a hung deploy without an operator. A watcher workflow started
        by every Pages run cancels a run that holds the `pages` concurrency
        group for more than 30 minutes and makes sure a run follows it. It
        needs no agent setting and takes effect once it is on `main`. The
        2026-10-06 hang froze the site for 88 hours before anyone saw it.
- [x] Content-review notifications: `pending_review` update requests and
      initiative submissions alert publishers; accept/decline alerts the
      submitting steward. Reuse the durable notification queue + templates.
- [x] Review-outcome visibility: widen scoped steward read filter on
      `chapter_update_requests` to include `accepted`/`declined` (read-only),
      then run `content-access -- sync`; stewards must see reviewer notes.
- [x] Migration: trigger to default `published_at`/`reviewed_at` (and
      `reviewed_by`) when `publication_status` transitions to `published`,
      so publishes stop failing the check constraint with a bare 400.
- [x] Impact loop: schedule `impact:sync` as an agent in-process sweep (same
      pattern as moderation delivery), surface
      `impact.chapter_impact_snapshots` read-only in Directus (status,
      synced_at, last_error) so stewards see binding results/errors.
- [x] Defuse all-or-nothing snapshot asserts: per-record quarantine (drop the
      offending record from the projection, keep the rest) + operator alert;
      privacy violations still fail closed per record. Covers unapproved
      media and `mailto:` link cases.
- [x] Live Onboarding auto-off: add expiry timestamp to
      `intake.map_node_intake_settings`; agent enforces and logs.
- [x] Update-request apply path (DECIDED 2026-08-10): SQL apply function +
      trigger on `request_status -> accepted`, mirroring
      `apply_approved_map_node_update_request` (`007_...sql:143-230`) incl.
      optimistic-concurrency staleness check; publishers stop retyping.
- [x] Enable magic-link moderation in prod (DECIDED 2026-08-10): follow the
      documented release order - verify `/map/moderate` live, migration 020
      applied, fresh 32+ byte `MAP_NODE_MODERATION_LINK_SECRET` Fly secret,
      flip `MAP_NODE_MODERATION_MAGIC_LINK_ENABLED`, and prove generation +
      delivery with an authorized real-recipient smoke.
- [x] Complete the human release-order check: the `[TEST] magic link check`
      node was declined through a moderation link on 2026-08-11 04:33 UTC
      (review row actor `moderation-link:...`); verified and archived on
      2026-10-09.

### Phase 2 - Permissions v2 (kill the staleness class)

- [x] Replace per-slug scoped policies with one static `Greenpill Assigned
    Editor` policy using dynamic relational filters over the existing
      junction tables, e.g. chapters update:
      `{"editor_assignments":{"directus_user_id":{"_eq":"$CURRENT_USER"}}}`,
      initiatives via `{"chapter":{"editor_assignments":{...}}}` traversal.
      The dead `currentUserEditorAssignmentFilter` helper
      (`directus-operational-content-setup.ts:255-259`) is the starting point.
- [x] Pick the create-preset mitigation (presets cannot be user-dynamic):
      retained minimal per-scope create policy, agent-side validation, or
      accept-and-review. Document the choice in the handoff.
- [x] Make assignment UI-manageable: unhide
      `chapter_editor_assignments`/`guild_editor_assignments` for Trusted
      Publisher with proper interfaces; creating/deleting a junction row must
      grant/revoke immediately with no CLI step.
- [x] Revocation + cleanup: migrate existing stewards to the dynamic policy,
      delete legacy per-slug policies and orphaned `/access` rows, protect
      publisher/moderator roles from the sync downgrade bug.
- [x] Repoint `directus:content-access` to a verifier (`verify` mode asserts
      effective access matches junction rows; `sync` becomes a no-op alias).
- [x] Multi-chapter stewards DECIDED 2026-08-10: keep 1:1 (retain
      migration-018 constraint and current map projection); dynamic filters
      make lifting it later a small change.
- [x] Extend `directus:steward:smoke` to cover: revocation taking effect,
      cross-chapter denial, publisher role preserved after re-assignment.

### Phase 3 - Data Studio steward UX

- [x] Chapters/guilds form structure: field groups (Identity / Story / Links
      & Media / Impact / SEO / Workflow), workflow fields grouped last,
      `slug` visually separated with its warning note.
- [x] Structured editors for `links` and `proof_signals`: replace raw JSON
      `input-code` with typed Directus O2M rows while keeping the public shape
      compatible with `packages/shared` normalizers. Direct chapter `media`
      remains JSON and is tracked separately below.
- [x] Add first-class direct chapter image alt/credit fields: migrate and
      backfill from the existing `media.imageAlt`/`media.imageCredit` keys,
      retain a safe compatibility fallback, update the public projection and
      accepted update-request apply path, and expose the fields in Data Studio.
- [x] Conditional fields + validations with messages: `proposed_image_alt`
      required when `proposed_image` set; URL format validation on link
      fields; enforce the notes that today are advisory only.
- [x] Create the missing O2M alias fields `chapters.initiatives` and
      `guilds.projects` so stewards manage child rows from the parent record.
- [x] English label pass so UI names match the guide ("Chapter image", not
      "Image File").
- [ ] Moved out of this hub on 2026-10-04 (PRD-1120), to pick up once stewards
      publish through the CMS: add pt-BR and Spanish Data Studio field/group
      label metadata after confirming the exact Directus locale keys used by
      production users.
- [x] Bookmarks: fix "My draft initiatives" to include published rows or add
      "My published work"; add `$CURRENT_USER`-scoped "My chapter" preset;
      re-check publisher bookmarks.
- [x] Files: grant stewards update on own uploads (focal point, title) via
      `uploaded_by = $CURRENT_USER` filter and delete on own unattached
      uploads; decide per-chapter subfolders.
- [x] Module bar + branding: curate visible modules per role, set project
      name/logo/colors, help/report URLs.
- [ ] Moved out of this hub on 2026-10-04 (PRD-1119), to pick up once stewards
      publish through the CMS: idempotently create/update an operator Insights
      dashboard and panels for pending reviews, failed alerts, deployed snapshot
      freshness, and impact sync health; add the steward landing bookmark set.
      The freshness panels depend on the phase-1 persisted health metrics.
- [x] Studio metadata for the raw intake collections operators do see
      (`map_node_intake_settings` singleton esp.), and hide remaining
      technical collections from the admin sidebar.

### Phase 4 - Platform adoption and strategy

- [x] Enable the native MCP server (DECIDED 2026-08-10): dedicated machine
      user + minimal operational-content policy, `mcp_enabled` on,
      `mcp_allow_deletes` off, document in the runbook (explicit contract
      change from "no project-scoped `.mcp.json`"); never expose private
      intake through MCP beyond existing role permissions.
- [x] Enable collaborative editing (websockets already on) and verify with
      two concurrent editors.
- [x] AI assistant DECIDED 2026-08-10: deferred - provider keys stay unset;
      revisit with a governance note on first concrete use case.
- [x] `content.people` DECIDED 2026-08-10: deferred - stays published-read
      reference data; dual source of truth remains documented debt in the
      review report.
- [x] Version + licensing position: hold on latest 11.17.x patches; document
      Directus 12 MSCL caps (3 seats / 25 collections / 5 flows) as blocking;
      set a decision date for the Open Innovation Grant (<$5M revenue, <50
      employees) if v12 is wanted; note the 12.2 Tiptap WYSIWYG HTML
      normalization risk for any future migration.
- [x] Run `bun run plans:validate`

## Remaining implementation sequence

1. **Platform health contract (PRD-808).** Done. Migration 028 is applied in
   production and the watchdog is on with a 30 minute threshold. The agent
   settings live in `packages/agent/fly.toml`.
2. **Steward image fields (PRD-809).** Done. Released to production on
   2026-10-09: agent release v71, migration 029, the Data Studio fields, and
   a passing production steward smoke. The operator dashboard and the
   pt-BR/es labels wait in PRD-1119 and PRD-1120 until stewards are
   publishing through the CMS.
3. **Release-order QA.** Done. The magic-link check is closed, and the second
   QA pass completed with the PRD-809 production release.

Implementation validation gate: `bun run typecheck`, `bun run test:agent`,
`bun run test:content`, the affected Directus setup/steward smoke tests,
`bun run build`, and `bun run plans:validate`. Production migrations, setup
re-apply, Fly deploys, or secret changes require a separately authorized
release step with live evidence.

## Exit Criteria

Hub moves to completed only when all remaining checkboxes are implemented or
explicitly deferred with rationale, the human magic-link decision is verified
and archived, `qa_pass_2` is completed, and the child Linear issues mirror the
validated `.plans` state.
