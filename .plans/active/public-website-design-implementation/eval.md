# Public Website Design Implementation Evaluation

## Acceptance Checks

- The root `docs/` folder is removed, with temporary planning material folded into `.plans`.
- The high-fidelity design package is tracked under this hub, not as a loose untracked root folder.
- Public website implementation work references this hub for design/research context.
- Runtime SQL and package contracts live under `packages/`.
- `status.json` matches the intended stage and lane state.
- The map-state public contract includes only safe `intakeMode` metadata and approved nodes; no pending submissions or review/private fields leak.
- `POST /map-nodes` keeps submissions pending by default and auto-approves only when the admin-owned intake settings singleton has Live Onboarding Mode enabled.
- Live auto-approval writes a private audit/review row marked `system:live-onboarding`.
- The website map consumes `/map/state`, falls back to `/locations.json`, uses distinct member/chapter/steward node colors, renders theme-colored mycelial connections, and polls about every two seconds only while live mode is active and the map is visible.
- Live-mode map-state responses avoid stale public caching; moderated mode keeps acceptable lightweight caching.
- The map includes non-color identity cues, an accessible legend, and edge-density behavior that keeps mycelial lines legible on mobile and dense regions.
- The add-node flow renders clear moderated/live copy, local pending self-nodes, success/error states, and mobile-friendly controls without overflow.
- Email magic-link node updates are email-only, use hashed one-use tokens, expire after 30 minutes, and never expose owner email or token state in public responses.
- The edit-token/update-request migration uses the next available migration number after the current highest migration and does not collide with operational content migrations.
- New public `POST /map-nodes` submissions require email.
- Owner self-service edits cannot silently change node role/type; role/type changes are steward/admin-only or explicitly captured in the review workflow.
- Pending update requests cannot overwrite newer approved node state through stale approvals.
- Edit-link requests return the same generic public response for matching, non-matching, missing-node, ownerless, and cooldown-limited cases.
- Edit-link requests enforce a 15-minute cooldown by node id, normalized email, and request IP/rate-limit key.
- Edit-link requests include coarse per-IP and per-email abuse limits beyond the per-node cooldown.
- Missing email configuration, provider failures, and send errors keep the neutral public edit-link response and are logged only through private/operator-safe paths.
- Magic-link validation does not consume the token; token consumption happens only after successful pending update-request creation.
- Raw magic-link tokens are never stored or logged; only hashes are persisted, and `/map/edit` clears the token from the visible URL before analytics, outbound links, or external navigation can run.
- Expired tokens and private request metadata have an explicit retention/cleanup path.
- Owner update submissions create pending revisions and do not alter `/map/state` until a steward/admin approves the update request.
- Live Onboarding Mode does not auto-approve owner update requests.
- Directus/admin permissions expose review-safe update request fields to standard stewards while keeping token rows, owner emails, IP/user-agent, and raw request metadata restricted to trusted/admin roles.
- Directus/admin review exposes current-vs-proposed comparisons, approve/reject transitions, reviewer metadata, and private notes.
- Validation passes with `bun scripts/plan-hub.ts validate`.

## Proof

- `bun scripts/plan-hub.ts validate`
- `bun run test:map-nodes`
- `bun run test:agent`
- `bun run build:website`
- Migration ordering check against `packages/agent/migrations`.
- Contract tests for required email on new public map-node submissions.
- Contract tests for role/type edit boundary, one-pending-update or optimistic-lock behavior, retention cleanup, and broad edit-link rate limits.
- Contract tests for identical edit-link public responses across matching, non-matching, missing-node, ownerless, and cooldown-limited cases.
- Contract tests for missing email configuration and send failure paths preserving the neutral public edit-link response.
- Contract tests for valid, invalid, expired, and consumed magic-link tokens, including no consumption during session validation.
- Contract tests for pending update requests, token consumption after successful update-request creation, approved update application, and public map-state privacy guards.
- Logging/privacy checks for no raw token persistence, no raw token logging, and Directus/admin permission boundaries around token, owner email, IP/user-agent, and raw request metadata.
- Header/cache checks for live-mode map-state freshness and moderated-mode acceptable caching.
- Website checks for selected-node update request, `/map/edit?token=...`, token removal from visible URL before analytics/outbound navigation, success/error states, and mobile overflow.
- Targeted stale-path scan for the former root V2 and research locations across README, root config, package scripts, and `.plans`.
- Visual checks at 1440, 1024, and 375 for map legibility, non-color node cues, accessible legend, edge-density behavior, connection clarity, live-mode copy, and mobile add-node flow.
