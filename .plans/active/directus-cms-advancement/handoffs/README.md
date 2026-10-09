# Handoffs - Directus CMS Advancement

## Current state (2026-10-09)

Everything from the 2026-08-11 push is live, and so is the PRD-808 publish
health watchdog: migration 028 is applied, the check runs every minute with a
30 minute stale threshold, and a live stale alert and recovery were proven on
2026-10-09 (evidence in `eval.md`). PRD-809 (chapter image alt text and
credit) is implemented; its production release is tracked in `plan.todo.md`.

### Operator notes

- **A plain deploy keeps the database certificate.** Production connects to
  Supabase with `sslmode=verify-full`. The CA certificate
  (`config/certificates/supabase-ca.crt`), `NODE_EXTRA_CA_CERTS`, and the
  watchdog settings are in both `fly.toml` files. Before 2026-10-09 they
  existed only on the running machines, and a deploy at 19:46 UTC dropped
  them: the agent lost its database connection for five minutes. A setting
  made with `fly machine update` lasts only until the next deploy, so put
  durable settings in `fly.toml`.
- **Run the documented deploy commands from the repo root.** flyctl reads a
  `[[files]]` `local_path` from the directory the deploy runs in, not from
  the `fly.toml` directory as the Fly docs say. A path that does not resolve
  fails the deploy before any machine changes.
- **Take a fresh private database backup.** Migrations 028 and 029 changed the
  schema after the last recovery archive, and Supabase Free has no automatic
  backups.
- **Replace the dispatch token.** Production still uses the GitHub CLI token
  set on 2026-08-11. It works for dispatch and for the watchdog's Actions
  read, but it has account-wide `repo` scope and rotates when the CLI
  re-authenticates. A fine-grained token on this repository needs Contents
  read/write and Actions read.
- **`/ready` does not cover background jobs.** It checks request-path database
  access only. To confirm the sweeps run, check that
  `/impact/chapters/<slug>` reports `cache.status: "fresh"`, that today's
  `daily_digest` row exists after 16:03 UTC while a submission is pending,
  and that `fly machine status <id> -a network-agent --display-config` shows
  no `*_SWEEP_ENABLED=false`. `fly config show` does not list machine-level
  settings.
- **One alert per record, per kind.** `record_quarantined` (a record dropped
  from the site) and `chapter_image_withheld` (a chapter published without
  its image) each keep one row per record. A record that is fixed and later
  breaks the same way again does not alert twice.

### Operator activations

1. **Done 2026-08-11 - dispatch-on-publish.** Evidence: receiver HTTP 204;
   identical-value `brasil` chapter touch produced `content_dispatch_sent`;
   repository-dispatch Pages run `31457001868` completed successfully.
2. **Done 2026-08-11 - content review notification recipients.** Evidence:
   pending and decided notification rows both reached `sent` with provider
   message IDs, then the labeled test request was deleted with HTTP 204.
3. **Done - magic-link moderation.** Test node
   `9933e770-6ddb-4e58-afef-1829e47d4c86` produced sent notification
   `1d5cc049-f2ad-49c4-8c5a-18981d583aca` and two sent recipient-specific
   access-link rows on 2026-08-11. It was declined through one of those links
   at 04:33 UTC the same day and archived on 2026-10-09.
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

### Remaining work (tracked in plan.todo.md)

1. PRD-809 production release: apply migration 029, deploy the agent, re-run
   `directus:content:setup` and `directus:studio:setup`, then run the
   production steward smoke.
2. Second QA pass, which closes with that release.

The operator Insights dashboard (PRD-1119) and the pt-BR/es Data Studio labels
(PRD-1120) moved out of this hub on 2026-10-04 and wait until stewards publish
through the CMS.

Deferred strategy items remain unchanged: `content.people` dual-source
decision and the Directus 12 licensing/Open Innovation Grant decision date.
