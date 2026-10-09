# Directus CMS Advancement

- **Stage**: `backlog`
- **Created**: 2026-08-10

## Why This Exists

Directus works as the steward editing surface, but the 2026-08-10 CMS review
(`reports/cms-review-2026-08-10.md`) found three compounding problems:

1. **Steward experience friction**: contradictory publish copy, review
   requests that vanish from steward view once decided, raw-JSON editing for
   links/media, a 35-field flat chapter form, manual Telegram pings for
   review, and no in-product signal for "when does my edit reach the site".
2. **Operational drift by design**: per-slug scoped policies are snapshots
   that go stale on every shape change (real incident: 10 of 11 chapter
   policies stale), assignment/revocation only works through hand-run CLI +
   TSV files, and nothing revokes access when an assignment row is deleted.
3. **Unused platform leverage**: the pinned Directus 11.17.4 already ships
   the native MCP server, AI assistant, collaborative editing, content
   versioning, Flows, dashboards, and translations - all currently disabled
   or unconfigured. Meanwhile Directus 12 changes licensing (MSCL, enforced
   seat/collection caps), which makes "just upgrade" the wrong move and makes
   deliberate v11 optimization the right one.

## Desired Outcome

- A steward can log in, understand exactly what they can edit, edit it with
  form-grade UX (groups, labeled fields, structured link/media editors,
  validation messages), see the review outcome of anything they submitted,
  and know when their change is live - without Telegram pings or operator
  hand-holding.
- Assignment and revocation are data operations (junction rows) that take
  effect immediately, with no snapshot policies to re-sync and no CLI in the
  critical path.
- A publish reaches greenpill.network in minutes (dispatch-on-publish) with
  failure alerting, instead of a silent hourly cron.
- Directus platform features (MCP, versioning, Flows/automation decisions,
  dashboards) are deliberately adopted or deliberately declined, with the
  licensing position documented.

## Non-Goals

- Replacing Directus or moving the public website off the static
  snapshot-consuming architecture.
- Making Directus a public API or weakening the privacy boundary
  (`packages/shared` contracts stay authoritative).
- Upgrading to Directus 12 before the licensing position (Open Innovation
  Grant vs Core caps: 3 seats / 25 collections / 5 flows - we have 27
  collections and more seats) is resolved.
- Keystatic changes; editorial/site-composition content stays as is.
