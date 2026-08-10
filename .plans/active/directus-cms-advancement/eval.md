# Directus CMS Advancement - Eval

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
- Chapters form renders grouped sections; links/proof/media edited through
  list interfaces; produced JSON still passes
  `bun run test:content` and `bun run test:agent` contracts.
- `proposed_image_alt` is enforced when an image is proposed.
- Stewards can fix focal point/title on their own uploads; cannot touch other
  stewards' files (smoke-asserted).
- Field labels match STEWARD_GUIDE wording.

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
