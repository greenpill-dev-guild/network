# Handoffs - Directus CMS Advancement

## 2026-08-11 implementation handoff (Claude -> Afo)

Implementation state after the 2026-08-10/11 push: phases 0-4 shipped except
the two items marked open in `plan.todo.md` (freshness watchdog, operator
Insights dashboard). Production has migrations 023-027, the deployed agent
with content-operations sweeps, and the v2 permission model applied.

### Operator activations

1. **Done 2026-08-11 - dispatch-on-publish.** Evidence: receiver HTTP 204;
   identical-value `brasil` chapter touch produced `content_dispatch_sent`;
   repository-dispatch Pages run `31457001868` completed successfully.
2. **Done 2026-08-11 - content review notification recipients.** Evidence:
   pending and decided notification rows both reached `sent` with provider
   message IDs, then the labeled test request was deleted with HTTP 204.
3. **Delivered, awaiting human click - magic-link moderation.** Evidence:
   pending test node `9933e770-6ddb-4e58-afef-1829e47d4c86` produced sent
   notification `1d5cc049-f2ad-49c4-8c5a-18981d583aca` and two sent
   recipient-specific access-link rows. Approve or decline it from the email,
   then archive the node.
4. **Done 2026-08-11 - MCP machine token.** Evidence: active API-only user
   `mcp-agent@greenpill.network`; chapter read HTTP 200, intake read HTTP 403,
   draft create HTTP 200, machine delete HTTP 403, admin cleanup HTTP 204.
   The token stays in root `.env.local`; the endpoint is
   `https://admin.greenpill.network/mcp`, with no repo `.mcp.json`.

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
