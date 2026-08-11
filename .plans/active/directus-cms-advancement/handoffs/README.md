# Handoffs - Directus CMS Advancement

## 2026-08-11 implementation handoff (Claude -> Afo)

Implementation state after the 2026-08-10/11 push: the main production slice
shipped, but the platform and UI lanes remain active for the freshness
watchdog, operator Insights dashboard, direct-edit chapter image metadata, and
pt-BR/es label metadata. Production has migrations 023-027, the deployed agent
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

### Remaining implementation sequence (tracked in plan.todo.md)

1. PRD-808: static deployed build metadata, durable publish-health state,
   GitHub Pages failure detection, and deduplicated Resend alerts/recoveries.
   Activation requires Actions read on the fine-grained GitHub token.
2. PRD-809: first-class direct chapter alt/credit columns with backfill and
   projection compatibility, followed by the operator Insights dashboard and
   confirmed pt-BR/es Data Studio locale metadata.
3. Human QA: decide the delivered `[TEST] magic link check` node from the
   email and archive it, then complete the second QA pass.

Deferred strategy items remain unchanged: `content.people` dual-source
decision and the Directus 12 licensing/Open Innovation Grant decision date.
