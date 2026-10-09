# @greenpill-network/agent

Scaffold package for the future `agent.greenpill.network` service.

This package starts with agent route contracts, a runnable Hono server, and a Postgres readiness boundary. Cache workers, auth/session endpoints, steward admin integration, and later interactive agent workflows should land here as implementation continues.

Current responsibilities:

- use `hono` as the HTTP framework for deterministic agent routes
- run locally with `bun run dev:agent` from the repo root
- expose `/health` for process health and `/ready` for database readiness
- define public route constants for chapter impact, map-node intake, map state, and operational content snapshots
- depend on `@greenpill-network/shared` for privacy and payload contracts
- depend on `postgres` for Fly Managed Postgres/local Postgres connectivity
- keep agent code under `packages/*` instead of embedding service logic in the root Astro app
- leave room for future nondeterministic or interactive workflows without changing the public-site boundary

Current dependencies:

- `hono`: HTTP app/router runtime
- `@hono/node-server`: local and Fly HTTP server adapter
- `postgres`: Postgres client for readiness checks and migrations
- `@greenpill-network/shared`: shared payload normalization and privacy contracts

## Local Runtime

From the repo root:

```sh
cp .env.example .env.local
bun run db:local:up
bun run db:migrate
bun run dev:agent
```

The local agent defaults to `http://127.0.0.1:3303` when using `.env.example`.

Useful checks:

```sh
curl http://127.0.0.1:3303/health
curl http://127.0.0.1:3303/ready
curl http://127.0.0.1:3303/impact/chapters/nigeria
curl http://127.0.0.1:3303/content/public-snapshot
```

`/content/public-snapshot` reads only published operational content from the
Greenpill-owned `content` schema and applies the shared public-content privacy
guard before returning data. `/impact/chapters/:slug`, `POST /map-nodes`,
`GET /map-nodes/public`, and `POST /newsletter/subscribe` preserve the same
public/private boundary for impact, map-node data, and Garden newsletter signup.

`POST /newsletter/subscribe` accepts a public email signup from `/garden` and
creates a global Resend Contact with optional newsletter segment/topic metadata.
Configure `RESEND_API_KEY` on the agent service and optionally set
`RESEND_NEWSLETTER_SEGMENT_ID` or `RESEND_NEWSLETTER_TOPIC_ID`; never expose
those values to the static website.

`POST /webhooks/resend` receives Resend email delivery and inbound metadata at
`https://agent.greenpill.network/webhooks/resend`. Set `RESEND_WEBHOOK_SECRET`
from the Resend webhook details page before enabling the production endpoint, and
set `RESEND_WEBHOOK_RECIPIENT_HASH_SECRET` so stored recipient hashes are keyed.
The route verifies Svix signatures and stores only operational metadata, never
message bodies, raw recipient addresses, or free-form provider diagnostics.

## Website Publish Health

The content-operations sweep can watch whether published content reaches the
deployed website. It compares the deployed static build with the latest
operational-content update and the latest completed GitHub Pages workflow, and
raises two alerts, each followed by one recovery:

- Stale: content changed after the deployed snapshot was generated, and the
  newest change has waited longer than the threshold. The alert holds until the
  deployed snapshot is newer than the content, so a further edit does not read
  as a recovery.
- Pages delivery failed: the latest completed Pages run did not succeed. A
  cancelled run counts. When a deploy hangs, every later run is cancelled by the
  next one queued behind it, and that is the only trace the workflow API leaves.
  A queued run that a newer one replaces while a third is still running also
  reads as cancelled, so a burst of triggers can cause a brief alert and
  recovery.

It is off unless all of these agent settings are supplied explicitly:

- `CONTENT_PUBLISH_HEALTH_ENABLED=true`
- `CONTENT_PUBLISH_HEALTH_METADATA_URL=https://greenpill.network/build-metadata.json`
- `CONTENT_PUBLISH_HEALTH_STALE_THRESHOLD_MS=<positive milliseconds>`

Set the threshold above the normal publish delay. A change can take about 20
minutes to show in the deployed metadata: up to 5 minutes of dispatch
coalescing, about 3 minutes to build and deploy, and up to 10 minutes of GitHub
Pages caching. `1800000` (30 minutes) is a reasonable floor.

The check reuses `CONTENT_DISPATCH_GITHUB_REPO` and
`CONTENT_DISPATCH_GITHUB_TOKEN`, and defaults the workflow filename to
`github-pages.yml` and production branch to `main` unless
`CONTENT_PUBLISH_HEALTH_WORKFLOW` or `CONTENT_PUBLISH_HEALTH_BRANCH` is set. The
token must have Actions read in addition to the Contents access used for
dispatch. Alerts and recoveries use `CONTENT_REVIEW_RECIPIENTS` and the existing
durable Resend queue.

If the check itself cannot run, it logs `content_publish_health_check_failed`
with a `reason` code, leaves `content.publish_health.checked_at` unchanged, and
sends no alert.

Apply migration `028_content_publish_health.sql` before enabling this sweep.
Enabling it, changing the production token, deploying the agent, and proving a
live alert are separate operator actions, not part of the implementation PR.

### Hung Deploy Recovery

An alert does not unblock a hung deploy.
`.github/workflows/pages-deploy-recovery.yml` does. Every Pages run starts a
watcher that cancels a run once it has held the pipeline for more than 30
minutes, then lets the queued run through or starts a fresh one. It runs in
GitHub Actions with its own short-lived token, so it needs no agent setting or
secret and works whether or not the sweep above is enabled.

With both in place, a hang can still raise a Pages delivery failed alert when
the hung run is cancelled, followed by its recovery once the next run deploys.
The watcher itself fails only when it cannot bring the pipeline back to idle,
and that needs a person. The rules, and the reasoning behind the 30 minutes,
are in `scripts/pages-deploy-recovery.ts`.
