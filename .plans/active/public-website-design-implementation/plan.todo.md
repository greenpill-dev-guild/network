# Public Website Design Implementation Plan

## Sequencing

- [x] Confirm the relevant repo baseline and package structure
- [x] Fold short-lived V2 docs, research, prompts, and design artifacts into this active hub
- [x] Refine scope and defaults in `spec.md`
- [x] Update `status.json` for the design implementation hub
- [x] Capture the handoff in `handoffs/README.md`
- [x] Run the data-first foundation wave before token/component/page implementation
- [x] Complete the Schema Delta Pass for the public Keystatic/Astro content model in `996ce51`
- [x] Document local-only Keystatic access control and public/private content boundaries
- [x] Audit `artifacts/hifi/CLAUDE_CODE_HANDOFF.md` for stale repo paths before using it as an implementation prompt
- [x] Port `artifacts/hifi/hifi/gp-tokens.css` into `packages/website`
- [x] Build a temporary token/component review surface for visual QA
- [x] Implement the public shell and reusable primitives
- [x] Complete Step 3.5 content grounding and seed pass before Home implementation
- [x] Implement the named Home map polish pass without homepage member-tier or polling behavior
- [x] Implement the Live Onboarding Mode platform/API pass for submitted map-node intake
- [x] Implement the Email Magic Link Node Updates platform/API foundation for self-service submitted-node edits
- [x] Convert shared, agent, and repo contract/runtime scripts to TypeScript with a root typecheck path
- [x] Implement the Email Magic Link Node Updates `/map/edit` route with token URL cleanup, public-field editing, pending update-request submission, and route/browser contract checks
- [x] Implement selected-node "Update this node" entry points, the neutral edit-link request form, and mobile visual QA
- [x] Implement the home page against the high-fidelity reference
- [x] Implement chapter, library, story, guild, and garden surfaces in focused passes
- [x] Run visual checks at desktop, tablet, and mobile breakpoints for each implemented surface
- [x] Run `bun scripts/plan-hub.ts validate`

## P0 Public Map Recovery

- [x] Save the recovery audit/report in this hub and mark prior map-complete claims superseded for the map slice.
- [x] Record the unified Home map recovery amendment in this existing hub instead of creating a competing map plan.
- [x] Correct the shared public map contract so opt-in/allowlisted stewards can appear as public steward nodes.
- [x] Remove anonymous generated density nodes entirely; public map state is chapters plus approved real member/steward submissions only.
- [x] Extend the steward allowlist from email-to-role to email-to-chapter mapping so trusted steward submissions receive a public-safe `chapterSlug` without exposing email.
- [x] Keep `bioregion` as an optional public field for future approved values; no polygon lookup is claimed until a redistributable dataset is checked in.
- [x] Update Home map rendering so chapter, steward, and member nodes use HiFi token colors, count-free identity legend, public-safe details, and connected-node highlighting without fake participation cues.
- [x] Change add-node theme selection from exactly four to one to four themes.
- [x] Add browser proof for the Home add-node flow against mocked agent responses: moderated pending, live approved member, allowlisted steward, selected details, and private-field DOM/storage guards.
- [ ] Add HiFi comparison proof at 375, 1024, and 1440 for chapter/member/steward node treatments, real mycelial edges, selected-node details, filter legibility, and mobile readability.
- [ ] Add a live-mode operator preflight/runbook covering `/map/state.intakeMode`, live refresh, allowlisted steward behavior, disable-live path, and post-session review.
- [ ] Complete Steward Sync Week 1: Directus/admin onboarding, role assignment, chapter content update workflow, and public map profile opt-ins.
- [ ] Complete Steward Sync Week 2: steward self-add rehearsal with allowlisted emails in controlled live mode.
- [ ] Prepare June 10 live member self-add session; this is map participation, not a public-note feature.
- [ ] After separate explicit approval only, reuse/rename the reverted Linear project and issues under `Network Presence`.

## Foundation Pass Notes

- `packages/website/src/styles/gp-tokens.css` is a close port of the HiFi token file. The adapters are `.gp-topo::before` pointing to `/images/hifi/topo-bg.png`, because Astro serves copied public assets from `packages/website/public`, plus normalized zero letter-spacing and fixed breakpoint type sizing so the implementation foundation stays responsive without viewport-scaled typography.
- Temporary review surface: `/design-system`, rendered with `GpLayout`, `SiteHeader`, `SiteFooter`, and token-backed Astro primitives. The route is marked `noindex` and is not linked from existing production pages.
- Public shell and reusable primitives now live under `packages/website/src/components/shell/` and `packages/website/src/components/ui/`.
- `GpLayout` preserves the existing stylized public-site background by default with `/images/greenpill-bg.png`; the HiFi topographic texture remains a separate `gp-topo` section utility.
- Review findings addressed: the public shell includes Garden because a minimal `/garden` route now exists, link-like primitives render non-clickable markup when no URL is supplied, and `GpLayout` includes a skip-to-content target.
- Exact-width visual QA was captured at 1440, 1024, and 375. All three widths reported no horizontal overflow; the mobile header switches to the menu shell.
- Visual gaps to hand to Claude before Home implementation: confirm the final header logo treatment, decide whether to copy or optimize the large HiFi `pill-3d.png`/Garden imagery for page builds, and replace the minimal Garden route with the full HiFi Garden surface in its focused pass.
- Deferred foundation review findings: the minimal `/garden` route currently has CTA links to `/garden#assessment` and `/garden#steward-call` before those target sections exist, and the temporary `/design-system` surface still includes a nested card sample plus review-only placeholder copy. These are acceptable for now because Garden and the review surface both have explicit later cleanup paths.

## Step 3.5 Content Grounding Notes

- Source inventory report: `reports/content-seed-inventory.md`.
- Keystatic now has source-backed seed content for the Home, Chapters index, Library, Stories index, Garden, chapter, guild, project, resource, story, people, theme, and core book surfaces.
- Runtime seed fixture: `packages/agent/fixtures/public-content-seed.json`.
- Optional idempotent seed script: `bun --env-file-if-exists=.env.local scripts/agent-public-content-seed.ts`.
- The runtime seed targets Postgres from `DIRECT_DATABASE_URL` or `DATABASE_URL`; it is local-only when `.env.local` points at local Postgres and production only when an operator deliberately supplies production credentials.
- Public singleton and active chapter story refs are intentionally empty while seeded stories remain `draft`; `bun run test:content` enforces that public refs target generated chapters and published stories.
- Launch review remains required for California, Cape Town, Kenya event details, Cote d'Ivoire target language, Brasil meeting-hour claims, Uncommons funding claims, public people roster/cadence, and any precise podcast episode count rendered as a live metric.

## Home Map Polish Pass

- Steward-sync feedback is now an explicit implementation slice for the Home map: the world graphic needs to read clearly beneath the route lines, chapter nodes should be dark/anchored green with a ring, steward nodes should be warm gold, and theme colors should explain relationships without overriding node identity.
- The homepage map treats theme connections as mycelial relationship lines generated from shared themes between real approved member/steward submissions, plus trusted steward-to-chapter edges when a steward email maps to a chapter. Theme colors drive edges and chips; chapter, steward, and member identities remain visible, but homepage proof stats are limited to chapter count and podcast count.
- The homepage must not surface steward count, member count, continent count, member-tier copy, self-node walkthroughs, or `/map/state` polling as proof/stat behavior.
- Home map polish should retain non-color identity cues, accessible focus behavior, an accessible legend, public-safe selected-node details, and mobile/dense-region behavior that reduces mycelial edge noise.

## Public Route Guardrails

- Garden is the public onboarding surface. Do not restore the retired standalone onboarding route or the former join route.
- There is no root guild directory route. Link directly to the Dev Guild and Writers Guild detail pages where guild pathways are needed.
- There is no public project route family. Keep project records as internal operational/content references for guild pages and library links only.
- Green Goods should remain a Dev Guild proof/reference point and Library link, not an internal project page.

## Live Onboarding Mode Pass

- Live Onboarding Mode is an admin-controlled intake setting for workshops and demos. Default remains moderated. When live mode is on, new submitted member nodes are approved immediately, audited privately as `system:live-onboarding`, and included in the public map state refresh for all viewers.
- Live Onboarding Mode settings live in `packages/agent/migrations/003_map_node_intake_settings.sql` so existing databases that already recorded the baseline migration still receive the settings table.
- The public interactive map surface consumes `/map/state`, falls back to `/locations.json`, and polls about every two seconds only while live mode is active and that interactive map is visible. This is not homepage `/map/state` polling.
- Live-mode map-state responses must avoid stale public caches so polling can show newly approved nodes quickly. Moderated mode can keep lightweight normal caching.
- The add-node flow must stay mobile-polished: large touch targets, city/place text fallback, clear mode copy, local pending self-node behavior in moderated mode, live success/error states, and no mobile overflow.

## Email Magic Link Node Updates Pass

- 2026-05-19 TypeScript foundation result: `packages/shared` and `packages/agent` now compile from TypeScript sources, their public package exports resolve through generated `dist` declarations and JavaScript, and repo runtime/contract scripts moved to Bun TypeScript entrypoints. The root `typecheck` path builds the package graph with `tsc -b`.
- 2026-05-19 Codex platform/API foundation result: new public map-node submissions now require a valid owner email, the API exposes neutral edit-link, edit-session, and update-request routes, and migration `007_map_node_edit_tokens_update_requests.sql` adds hashed one-use edit tokens plus pending update requests. This pass intentionally did not implement the public `/map/edit` page, selected-node "Update this node" UI, token URL cleanup in the browser, or mobile visual QA; those remain the website UX follow-up above.
- 2026-05-20 review result: the public `/map/edit` route now exists with token cleanup before page initialization, editable public fields, pending update-request submission, route tests, and an optional browser smoke command that skips cleanly when no Chrome binary is present. Remaining website work is the selected-node "Update this node" entry point, neutral edit-link request UI, and mobile visual QA.
- V1 submitted-node ownership is email-only. Do not add wallet ownership, workspace auth, or local browser-secret authorization in this pass.
- Make email required for new public map-node submissions. Treat `intake.map_node_private_contacts.email` as the private owner email for submitted map nodes going forward.
- Existing seed/import rows without private contact email are not backfilled in this pass. Stewards/admins handle any owner-email correction in Directus/admin.
- Add replay-safe migration coverage for hashed one-use edit tokens and pending update requests using the next available migration number after the current highest repo migration. Do not reuse or collide with operational content migrations already in flight:
  - `intake.map_node_edit_tokens` records every edit-link request, normalized email, requested node id, matched submission id when present, hashed token only for matches, 30-minute expiry, consumed timestamp, and request metadata.
  - `intake.map_node_update_requests` records proposed revisions for `display_name`, `place_name`, `city`, `region`, `country`, `latitude`, `longitude`, `themes`, and `public_note`; default status is `pending`; private reviewer metadata and notes live on this table. Role/type changes are rejected by the owner API in this foundation pass and remain steward/admin-only.
  - Approval trigger: when an update request becomes `approved`, copy proposed public fields onto the original `intake.map_node_submissions` row and update `updated_at`.
- Owner-editable fields should cover public profile, location, theme, and note fields. Node role/type changes are steward/admin-only unless explicitly approved through the Directus review workflow.
- Prevent stale approvals from overwriting newer node state: either allow only one pending update request per node or add optimistic locking/version checks to update requests and approval triggers.
- Expired magic-link tokens and raw request metadata need a documented retention/cleanup path so private request data is not kept indefinitely.
- Exact public agent routes for this pass:
  - `POST /map-nodes/:id/edit-link` with `{ "email": "person@example.org" }`.
  - For syntactically valid requests, edit-link responses are always `202 { "ok": true, "message": "If this email can update the node, we will send an edit link." }`, whether the node/email match or not.
  - Enforce a 15-minute cooldown by requested node id, normalized email, and request IP/rate-limit key without changing the neutral public response.
  - Add coarse abuse protection beyond the per-node cooldown, such as per-IP and per-email daily buckets, so one requester cannot trigger broad edit-link email attempts across many nodes.
  - `POST /map-nodes/edit-session` with `{ "token": "..." }`; valid response is `200 { "node": { editable public fields only } }`; invalid, expired, or consumed tokens fail with the same generic invalid-link error.
  - Edit-session validation must not consume the token.
  - `POST /map-nodes/:id/update-requests` with `{ "token": "...", editable public fields... }`; valid response is `201 { "updateRequest": { "id": "...", "status": "pending" } }`.
  - Consume the token only after the pending update request is created successfully in the same transaction.
- Owner edits create pending revisions. The current approved public node stays live until a steward approves the update request in Directus/admin.
- Live Onboarding Mode affects new submissions only. It must not auto-approve owner update requests.
- Send email magic links from the agent with the Resend HTTP API via `fetch`; add `RESEND_API_KEY`, `MAP_NODE_EMAIL_FROM`, and `MAP_NODE_EDIT_BASE_URL` env documentation. Do not add a mail package for this pass.
- Missing Resend configuration, provider errors, and send failures must keep the same neutral public `202` edit-link response and be logged privately for operators.
- Raw magic-link tokens must never be logged or persisted. Store token hashes only, and make `/map/edit` remove the token from the visible URL before analytics, external navigation, or outbound links can run.
- Directus/admin permissions should split review work from trusted metadata access: standard stewards can see review-safe update request fields and approve/reject requests, while token rows, owner emails, IP/user-agent, and raw request metadata remain trusted/admin only.
- Directus/admin review should show a current-vs-proposed public field comparison, explicit approve/reject transitions, reviewer metadata, and private notes so stewards can review without reading raw private request metadata.
- Website surface:
  - Update the add-node form so email is required and explain that it is used privately for future edits.
  - Show "Update this node" for approved submitted nodes.
  - The edit-link request form uses neutral success copy regardless of match status.
  - Add `/map/edit?token=...`, validate through the agent, remove the token from the visible URL after validation, render editable public fields, and submit pending revisions with success/error states.
- Public website, map-state, and route payloads must never expose owner email, token state, pending revision data, review notes, IP/user-agent, or public keys containing `review`.

## Cleanup Follow-Up

- [ ] Archive this hub when the design implementation ships or is superseded.
- [ ] Do not recreate root `docs/` unless a future plan defines durable operator/user docs with ownership.
- [x] During the focused Garden pass, add or retarget the `/garden#assessment` and `/garden#steward-call` CTA destinations. (2026-05-20: added two anchored target panels — `#assessment` → "Map your next contribution" routing to chapters, `#steward-call` → "Talk to a real person" routing to the public chat — using the public-safe `assessmentPreview`/`stewardCallPreview` kicker+title with `scroll-margin` for the sticky header. Home's garden-ramp CTAs share these anchors and now resolve too.)
- [ ] Before archiving or publishing the temporary review surface as durable documentation, remove the nested card sample and review-only placeholder copy from `/design-system`.

## Deferred UI-Standard Follow-Ups (post-revamp; do not rush — regression risk)

The modern-CSS-standard initiative is otherwise complete and on `main`: the `DESIGN.md` standard + `packages/website/CLAUDE.md` digest, the `greenpill-ui` skill, the `scripts/ui-verify.ts` 4-channel harness (`bun run ui:verify`), `clamp()` fluid type, the container-query migration of every in-`#main-content` surface (`@media (pointer: coarse)` for touch, viewport `@media` kept only for the sticky header/footer chrome), and the homepage/story accessibility + mobile-overflow fixes. The full 41-route verify is **0 HARD**. These two were deferred because each carries a regression risk the automated harness cannot fully catch:

- [ ] **Phase 5 — Remove Tailwind.** `@astrojs/tailwind` is unused (0 utilities, 0 `@apply`) but its integration auto-injects a preflight reset. Removing it blindly gives nav `<ul>`/`<ol>` (header, footer, breadcrumb) their default margins/indent and visibly shifts chrome. **Prerequisite:** add an explicit element reset (lists, headings, fieldset, figure) to the `gp-base` layer in `gp-tokens.css` to replace preflight, then remove `tailwind()` from `packages/website/astro.config.mjs`, delete `tailwind.config.js`, and drop `@astrojs/tailwind` + `tailwindcss` (+ `postcss`/`autoprefixer` if unused) from `packages/website/package.json`. Verify with `bun run ui:verify` **and** a visual pass at 375/1024/1440. Touches the shared `package.json`/lockfile.
- [ ] **Phase 6 — Author-time stylelint guard.** Add `stylelint` + `stylelint-config-standard` + `postcss-html` (dev deps; shared `package.json`) with a house config: token-only colors, `var(--gp-font-*)` fonts, no pure white/black, no stray viewport `@media` (allowlist the documented chrome + type-scale exceptions), logical properties. Wire `bun run ui:check` scoped to changed files; keep advisory (no hook by default — use the `update-config` skill to opt into one later).

## Modern Web UI Follow-Ups (progressive; keep behind current P0 map/design work)

- [ ] Start from `reports/modern-web-ui-follow-up-2026-05-24.md`.
- [ ] Audit root font-size and large-text behavior before adding `<meta name="text-scale" content="scale">`.
- [ ] Audit `color-scheme`, `prefers-contrast`, and `forced-colors` behavior for the site shell, map controls/dialog, chips, cards, focus rings, and form controls before relying on translucent or color-only states.
- [ ] Evaluate Astro MPA View Transitions with `@view-transition { navigation: auto; }` as progressive enhancement only, with reduced-motion fallback.
- [ ] Run isolated Chrome DevTools MCP proof for `/` after the Astro MPA View Transition opt-in: route URL, viewport, screenshot or DOM/accessibility snapshot, console/page errors, useful network notes, `/llms.txt`, reduced-motion behavior, and `list_webmcp_tools`.
- [ ] Normalize the public-site CWV evidence contract before any RUM work: record LCP, INP, CLS, route label, `navigationType`, reduced-motion state, and whether the navigation used the MPA View Transition path. Future SPA/workspace soft-navigation fields stay plan-only until that surface exists.
- [ ] Identify long story, library, garden, or chapter surfaces where CSS scroll spy can improve section orientation.
- [ ] Evaluate scroll-state header behavior only if it reduces visual noise without hiding navigation context.
- [ ] Add `closedby="any"` to simple dialogs only when existing escape/click fallback behavior and focus behavior remain proven.
- [ ] Review `packages/website/src/scripts/parallax.ts` against the current CSS-only `GpLayout.astro` background approach; remove or realign it only in a future implementation lane with browser proof.
- [ ] Keep runtime WebMCP frozen. Any public map/list/search candidate needs an approval spec with candidate visible tools, forbidden tools, confirmation rules, privacy boundary, schema tests, wrong-tool/wrong-argument evals, and proof commands before implementation.
- [ ] Keep overscroll gestures, HTML-in-Canvas, CSS `@function`, CSS `if()`, shape APIs, and `fit-text` out of production scope.
