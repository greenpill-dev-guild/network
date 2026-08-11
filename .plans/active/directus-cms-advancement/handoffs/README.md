# Handoffs - Directus CMS Advancement

## 2026-08-11 implementation handoff (Claude -> Afo)

Implementation state after the 2026-08-10/11 push: phases 0-4 shipped except
the two items marked open in `plan.todo.md` (freshness watchdog, operator
Insights dashboard). Production has migrations 023-027, the deployed agent
with content-operations sweeps, and the v2 permission model applied.

### Operator actions that need you (secrets/approvals I cannot mint)

1. **Dispatch-on-publish activation** - create a fine-grained GitHub PAT
   (repo `greenpill-dev-guild/network`, permission: Contents read/write is
   sufficient for `repository_dispatch`), then:

   ```sh
   fly secrets set -a network-agent CONTENT_DISPATCH_GITHUB_TOKEN="<pat>"
   ```

   `CONTENT_DISPATCH_ENABLED='true'` and the repo name already sit in
   `packages/agent/fly.toml`. Until the secret exists the watcher stays
   silently disabled and the hourly cron remains the publish path.
2. **Content review notification recipients** (publisher alert emails +
   quarantine alerts):

   ```sh
   fly secrets set -a network-agent CONTENT_REVIEW_RECIPIENTS="ops@example.org,other@example.org"
   ```

   Without it, pending/quarantine notifications mark themselves `skipped`
   (visible in the `review_notifications` collection); decided-request
   emails to stewards work regardless.
3. **Magic-link moderation real-recipient check** - the flag is ON with a
   fresh 32-byte secret; the next real map submission emails per-recipient
   links. Confirm one approve/decline round-trip with a real moderator, per
   the release order in `packages/admin/README.md`.
4. **MCP token minting** - `mcp_enabled` is on with deletes off, and the
   API-only `Greenpill Content Agent` role exists. To connect a client,
   create a user on that role in the Directus UI, mint a static token, and
   configure the MCP client locally (no `.mcp.json` in the repo - see
   `docs/agentic-mcp-tooling-runbook.md`).

### Permissions v2 decisions of record

- Create-preset mitigation: fully dynamic create validations
  (`chapter_slug`/`guild_slug` `_in $CURRENT_USER.<assignments>.<slug>`),
  proven by the local + prod steward smokes. No per-scope create-pack
  policies were needed.
- Cross-chapter child attach inserts but is pinned to the parent's chapter by
  the migration-027 trigger, landing outside the steward's scope (unreadable,
  uneditable). Asserted in the smoke.
- `content-access -- cleanup-legacy` removes the retired per-slug policies
  once the prod smoke passes.

### Remaining open items (tracked in plan.todo.md)

- Freshness watchdog (site `generatedAt` vs `max(updated_at)` + build-failure
  alerting).
- Operator Insights dashboard (pending reviews, failed alerts, impact health).
- Follow-up debt noted in the review report: first-class alt/credit columns
  for direct chapter edits (today: `media` JSON keys `imageAlt`/`imageCredit`;
  the update-request path has first-class fields), pt-BR/es label pass,
  `content.people` dual-source decision (deferred), Directus 12 licensing
  decision date (Open Innovation Grant).
