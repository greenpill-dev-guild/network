# Public Website Design Implementation Handoffs

This hub owns the active public website design implementation context.

Start here:

- `artifacts/hifi/HANDOFF.md`
- `artifacts/hifi/CLAUDE_CODE_HANDOFF.md`
- `artifacts/hifi/DESIGN.md`
- `artifacts/v2/`
- `research/`

Important caveat: the high-fidelity handoff was written before the repo cleanup. Audit it for stale root `src/`, `docs/`, and generic API references before using it as an implementation prompt.

Implementation should happen in `packages/website` and shared public/private contracts should stay in `packages/shared`.

Map polish handoff:

- The chapter/steward/member map is the feature piece of the Home surface. Keep the world graphic legible beneath network lines, using distinct map-pixel/continent treatment instead of all-white dots.
- Node identity colors are fixed for this slice: members light green, chapters dark green with an anchored ring, and stewards warm gold. Theme colors should drive relationship lines and chips.
- Live Onboarding Mode is controlled only through Directus/admin access to the intake settings singleton. It is meant for workshops and demos, defaults off, and should be manually turned off after a session.
- Public code can read `intakeMode`, approved nodes, edges, and themes from `/map/state`; it must not rely on public review flags or pending/private payloads.
- Live-mode map-state must avoid stale public caches so workshop submissions appear quickly. Moderated mode can keep lightweight normal caching.
- Add non-color map identity cues and density controls: an accessible legend, chapter ring, steward accent/shape, member fill, and mobile/dense-region mycelial edge decluttering.

Email magic-link node updates handoff:

- Use email magic links as the only v1 self-service ownership mechanism for submitted map nodes. Do not add wallet ownership, local browser-secret authorization, or a public claim flow in this pass.
- New public map-node submissions require email. `intake.map_node_private_contacts.email` is the private owner email for submitted nodes going forward.
- Existing seed/import rows without private contact email are not backfilled in this pass.
- Use the next available migration number after the current highest repo migration, and do not collide with operational content migrations.
- Owner self-service edits cover public profile, location, theme, and note fields. Node role/type changes are steward/admin-only unless the review workflow explicitly captures and approves that change.
- Prevent stale approvals from overwriting newer node state with either one pending update request per node or optimistic locking/version checks.
- Edit-link requests must always use neutral copy and identical public responses for matching, non-matching, missing-node, ownerless, and cooldown-limited cases.
- Edit-link requests must enforce a 15-minute cooldown by node id, normalized email, and request IP/rate-limit key.
- Add broader per-IP and per-email abuse limits so one requester cannot spray edit-link emails across many nodes.
- Missing email provider config, provider errors, and send failures must keep the same neutral public response and only surface through private/operator logs.
- Session validation does not consume a magic-link token; creating a pending update request consumes it after the request is successfully written.
- Never log or persist raw magic-link tokens; store hashes only. The `/map/edit` page must clear the token from the visible URL before analytics, outbound links, or external navigation can run.
- Add a retention/cleanup path for expired tokens and private request metadata.
- User edits become pending update requests. Keep the current public node visible until steward/admin approval; Live Onboarding Mode does not auto-approve edits.
- Public website and map-state payloads must never expose owner emails, token hashes, pending revisions, review notes, IP/user-agent, or public keys containing `review`.
- Directus/admin permissions should keep standard stewards on review-safe update request fields only. Token rows, owner emails, IP/user-agent, and raw request metadata are trusted/admin only.
- Directus/admin review should show current-vs-proposed public fields, explicit approve/reject transitions, reviewer metadata, and private notes.
