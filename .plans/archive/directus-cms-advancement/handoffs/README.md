# Handoffs - Directus CMS Advancement

## Current state (2026-10-09)

This hub is complete and archived. Everything from the 2026-08-11 push is
live. The PRD-808 publish health watchdog has been on in production since
2026-10-09: migration 028 is applied, the check runs every minute with a 30
minute stale threshold, and a live stale alert and recovery were proven.
PRD-809 (chapter image alt text and credit) was released the same day: agent
release v71, migration 029, the Data Studio fields, and a passing production
steward smoke. Evidence for all of it is in `eval.md`.

### Operator notes

- **A plain deploy keeps the database certificate.** Production connects to
  Supabase with `sslmode=verify-full`. The CA certificate
  (`config/certificates/supabase-ca.crt`), `NODE_EXTRA_CA_CERTS`, and the
  watchdog settings are in both `fly.toml` files. Before 2026-10-09 they
  existed only on the running machines, and a deploy at 19:46 UTC dropped
  them: the agent lost its database connection for five minutes. A setting
  made with `fly machine update` lasts only until the next deploy, so put
  durable settings in `fly.toml`.
- **A merge to `main` is a production deploy of the agent.** The Fly.io GitHub
  app deploys `network-agent` on every push, with no workflow file. The agent
  deploys blue-green (`[deploy]` in `packages/agent/fly.toml`), so a build or
  config that fails `/ready` never replaces the running machine.
- **Run the documented deploy commands from the repo root.** flyctl reads a
  `[[files]]` `local_path` from the directory the deploy runs in, not from
  the `fly.toml` directory as the Fly docs say. A path that does not resolve
  fails the deploy before any machine changes.
- **Take a fresh private database backup.** Migrations 028 and 029 changed the
  schema after the last recovery archive, and Supabase Free has no automatic
  backups.
- **Rolling back migration 029.** `handoffs/rollback-029.sql` restores the
  view, function, and constraints production had before it, and drops the two
  columns. It was built from production's own definitions when 029 was
  applied, and the same procedure was rehearsed on a scratch database, which
  ended identical to its starting point. Unregister the two Directus fields
  first. The file stops being valid once a later migration changes the same
  objects.
- **Directus sheds load during long setup runs.** `directus:studio:setup`
  took nine minutes against production, and its first attempt stopped on a
  503 "Under pressure". The setup client now sends such a request again.
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

### Follow-ups outside this hub

Nothing in this hub remains open. These are separate:

- The operator Insights dashboard (PRD-1119) and the pt-BR/es Data Studio
  labels (PRD-1120) moved out on 2026-10-04 and wait until stewards publish
  through the CMS.
- Noted on 2026-10-09 and not yet in Linear:
  - Uploaded chapter images are served from the admin VM, which stops when
    idle. The first visitor and social-card scrapers can hit a cold start.
  - A record that is quarantined, fixed, and quarantined again does not alert
    a second time. The same holds for a withheld chapter image.
  - "Alt text required with a proposed image" on update requests uses the
    pattern that blocked nothing on chapters while the column held `''`. It
    was not re-tested on the request form.

### How the PRD-809 release went (for the next one)

Deploy the agent first, then apply the migration: the previous agent would
have copied the two new view keys to the top level of every public chapter.
Merging to `main` is that deploy. After the migration, clear the Directus
cache, then run `directus:content:setup` and `directus:studio:setup`, then
the production steward smoke.

Deferred strategy items remain unchanged: `content.people` dual-source
decision and the Directus 12 licensing/Open Innovation Grant decision date.
