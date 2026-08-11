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
- [ ] Publish-failure + freshness alerting: compare deployed site
      `generatedAt` against `max(updated_at)` in content schema on a sweep;
      alert operators via the existing Resend queue when drift exceeds a
      threshold or the Pages build fails.
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
      flip `MAP_NODE_MODERATION_MAGIC_LINK_ENABLED`, authorized
      real-recipient smoke.

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
- [x] Structured editors: replace raw JSON `input-code` for `links`,
      `proof_signals`, and `media` with Directus list interfaces (typed rows:
      label/url, alt/credit as first-class inputs); keep JSON storage shape
      compatible with `packages/shared` normalizers.
- [x] Conditional fields + validations with messages: `proposed_image_alt`
      required when `proposed_image` set; URL format validation on link
      fields; enforce the notes that today are advisory only.
- [x] Create the missing O2M alias fields `chapters.initiatives` and
      `guilds.projects` so stewards manage child rows from the parent record.
- [x] Label translations pass so UI names match the guide ("Chapter image",
      not "Image File"); evaluate a pt-BR/es UI pass after.
- [x] Bookmarks: fix "My draft initiatives" to include published rows or add
      "My published work"; add `$CURRENT_USER`-scoped "My chapter" preset;
      re-check publisher bookmarks.
- [x] Files: grant stewards update on own uploads (focal point, title) via
      `uploaded_by = $CURRENT_USER` filter and delete on own unattached
      uploads; decide per-chapter subfolders.
- [x] Module bar + branding: curate visible modules per role, set project
      name/logo/colors, help/report URLs.
- [ ] Dashboards: operator dashboard (pending reviews, failed alerts,
      snapshot freshness, impact sync health) and steward landing bookmark
      set; requires the phase-1 freshness metrics to exist.
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

## Exit Criteria

Hub moves to `active/` when the human picks the first implementation phase;
child Linear issues are created per actionable lane at that point
(parent-issue-only until then per the Plan Hub Linear Mirror Policy).
