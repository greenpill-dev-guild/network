# Codex operator task: activate the remaining CMS loop pieces

You are working in `/Users/afo/Code/greenpill/network` (repo `greenpill-dev-guild/network`, branch `main`). Read `AGENTS.md` first and honor its safety rules.

## Context

The Directus CMS advancement (`.plans/active/directus-cms-advancement`) shipped on 2026-08-11: migrations 023-027 are applied in production, the Fly agent `network-agent` is deployed with content-operations sweeps (dispatch-on-publish, review-notification delivery, quarantine alerts, scheduled impact sync), permissions v2 is live, and magic-link moderation is enabled. Four operator activations remain. Everything below uses tooling that is already authenticated on this machine: `flyctl` (`fly auth whoami` should show contact@afolabi.info), `gh`, and the production Directus admin token in root `.env.local` (`DIRECTUS_ADMIN_TOKEN` + `DIRECTUS_URL`; load env only via `bun --env-file-if-exists=.env.local ...` — never cat or grep `.env*`, never print secret values, never commit env files).

Reference material: `.plans/active/directus-cms-advancement/handoffs/README.md` (operator handoff), `packages/agent/src/content-operations.ts` (dispatch + notification code and env names), `packages/admin/README.md` (moderation release order).

## Task 1 - Activate dispatch-on-publish

1. Preferred token: a fine-grained GitHub PAT scoped to `greenpill-dev-guild/network` with Contents read/write. If a pre-made PAT is available in the environment, use it. Otherwise use the authenticated CLI's token (`gh auth token`) as a pragmatic stand-in and note the tradeoff in your report (broader scope, rotates with gh re-auth; recommend replacing with a fine-grained PAT later).
2. Before setting anything, prove the token can dispatch: `gh api repos/greenpill-dev-guild/network/dispatches -f event_type=operational-content-updated` (expect HTTP 204; this immediately triggers one Pages build - that is harmless and useful as a receiver check).
3. Set it without echoing the value: `fly secrets set -a network-agent CONTENT_DISPATCH_GITHUB_TOKEN="$(gh auth token)"` (or the PAT). This restarts the agent machine; wait for `https://agent.greenpill.network/ready` to return 200.
4. End-to-end proof: make one harmless content edit in production Directus via API (PATCH a published chapter's `summary` to its **current identical value** - the touch trigger bumps `updated_at`, which changes the watermark without changing content). The agent sweep runs every 60s with a 5-minute coalescing window and baselines on boot, so: edit AFTER the restart, wait up to ~3 minutes, then confirm BOTH: `fly logs -a network-agent --no-tail | grep content_dispatch_sent` shows a dispatch, and `gh run list --workflow=github-pages.yml --limit 3` shows a run with event `repository_dispatch`.

## Task 2 - Content review notification recipients

1. Set `fly secrets set -a network-agent CONTENT_REVIEW_RECIPIENTS="afo@wefa.world"` (comma-separated list; start with Afo's address unless the environment provides a different moderator list - it can be extended any time). Wait for `/ready` again.
2. Live-fire exactly one labeled test: as admin, create a `content.chapter_update_requests` row against any published chapter with title `[TEST] notification pipeline check`, `request_status: 'pending_review'`. Within ~2 minutes the queue row in `content.review_notifications` (query it via the Directus API) should reach `status='sent'` with a `provider_message_id`. Then PATCH the request to `declined` with reviewer note `[TEST] cleanup` - the decided-notification path will email the request creator (the admin account; skipped statuses are fine if the admin user has no readable active email). Finally DELETE the test request (cascade cleans queue rows).
3. If rows land in `skipped` with `no_review_recipients_configured`, the secret did not take - re-check before proceeding.

## Task 3 - Magic-link moderation: prove delivery, hand off the click

The flag and secret are already live. Your job is to prove link generation + delivery, not to click:

1. Inspect `scripts/map-node-moderation.integration.ts` and the public submission flow in `packages/agent/src/map-nodes.ts` (location confirmation is required). Drive one clearly-labeled test submission through the real public flow against production (`https://agent.greenpill.network`): display name `[TEST] magic link check`, a real-ish location, no private data beyond a throwaway note.
2. Verify via the Directus admin API that the submission created a row in `intake.map_node_moderation_notifications` that reaches `sent`, and per-recipient rows in `intake.map_node_moderation_access_links` with `delivery_status='sent'`.
3. Do NOT approve the test node yourself through Directus unless the human click test already happened; leave it `pending` and end your report with: "Human step: open the moderation email and approve/decline the `[TEST] magic link check` node via the link to complete the release-order check; afterwards archive the node." If the access-link rows fail to send, diagnose (Resend config, secret length) and report.

## Task 4 - Mint the MCP machine token

1. Via the Directus admin API, find the role `Greenpill Content Agent` and create (if absent) a machine user on it: email `mcp-agent@greenpill.network`, status `active`, no app access needed, and a fresh 64-hex static `token` you generate (`openssl rand -hex 32`). Never print the token; write it into root `.env.local` as `DIRECTUS_CONTENT_AGENT_TOKEN=<value>` (append; do not disturb existing lines; the file is gitignored).
2. Verify the scope with that token against `https://admin.greenpill.network`: `GET /items/chapters?limit=1` succeeds; `GET /items/map_node_submissions?limit=1` is denied; `POST /items/chapter_update_requests` with a `[TEST]` draft succeeds and `DELETE` of it is denied (agents cannot delete) - clean the draft up as admin. The native MCP endpoint is served by Directus at `/mcp` with that token; note it in the report but do not add any `.mcp.json` to the repo (see `docs/agentic-mcp-tooling-runbook.md`).

## Close-out

- Update `.plans/active/directus-cms-advancement/handoffs/README.md`: mark tasks 1/2/4 done with one-line evidence each, task 3 as "delivered, awaiting human click", and append a history entry to the hub's `status.json` (`actor: "codex", lane: "platform", status: "completed"`, note summarizing activations). Run `bun run plans:validate`.
- Commit only the `.plans` changes to `main` with a `plans:` message and push. Do not commit or print any secret. Call out in your final summary that Fly secrets were changed on `network-agent`.
- If Linear access is available, add a comment to PRD-807 and PRD-808 summarizing the activations; otherwise skip.
- Report: what was set (names only, never values), every verification result with the exact evidence line, the one remaining human step, and any rollback commands used or needed (`fly secrets unset -a network-agent <NAME>`).

Constraints: production system - no schema changes, no deploys, no website changes, no dependency installs. If any verification fails twice, stop that task, leave state safe, and report rather than improvising.
