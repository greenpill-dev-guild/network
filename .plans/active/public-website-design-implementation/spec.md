# Public Website Design Implementation Spec

## Goal

Build the next public Greenpill Network website experience in `packages/website` using the checked-in high-fidelity design package, existing Astro + Keystatic foundation, and package-based repo structure.

## Current State

- `packages/website` owns the static Astro public site, with Keystatic retained for editorial/site-composition content and operational content consumed from approved snapshots.
- `packages/shared` owns reusable public/private payload contracts.
- `packages/agent` owns Fly-hosted backend/service scaffolding.
- Temporary V2 docs, prompts, research, and design handoffs now live inside this hub instead of a root `docs/` folder.
- The current design package is stored in `artifacts/hifi/` and should be treated as the visual/reference artifact for this implementation phase.

## Scope

- Port the design tokens and global visual system into the website package.
- Rebuild shell primitives and public page components in idiomatic Astro.
- Reconcile high-fidelity placeholder content with real Keystatic editorial content and approved operational content snapshots.
- Implement public pages in a staged sequence: home, chapters, chapter detail, library, stories, guild, and garden/onboarding surfaces.
- Implement a focused Home map polish slice: clearer global map graphic, distinct chapter/steward/member node treatments, mycelial theme connections, and a responsive add-node flow.
- Add controlled Live Onboarding Mode for workshops and demos so admin-enabled submissions can appear publicly in near real time.
- Add email magic-link ownership for submitted map nodes so users can request edits without wallet auth or workspace login.
- Keep visual acceptance proof tied to the high-fidelity artifacts at desktop, tablet, and mobile widths.
- Track modern CSS/Web UI follow-ups inside this hub rather than creating a competing plan source.

## Constraints

- `.plans/` carries planning, research, handoffs, readiness, and evolving implementation context.
- Runtime contracts that code depends on belong under `packages/`, not planning docs.
- This repo starts with manual plan updates plus validation, not automation claiming.
- Keep `status.json` taxonomy current enough for future filtering and dependency checks.
- Preserve public/private boundaries: no private node-intake fields, review notes, pending submissions, raw upstream feedback, or database credentials in the public website.
- Route guardrail: Garden owns public onboarding; do not restore the retired onboarding route. Do not add a root guild directory. Keep guild pages limited to the Dev Guild and Writers Guild detail surfaces for now. Do not add project index or project detail routes; project records may remain internal source data for guild/library references only.
- Operational pages and generated public JSON routes must read from the approved operational content snapshot, not directly from Directus or private database credentials.
- Default node intake remains moderated review. Live Onboarding Mode is manual-off and admin-controlled through Directus/admin data access, not URL flags, query parameters, or public browser state.
- Public map payloads may expose safe `intakeMode: "moderated" | "live"` metadata, but must not expose pending submissions or any public payload key containing `review`.
- Live-mode map-state responses must avoid stale public caches so newly approved workshop nodes can appear quickly; moderated mode may keep lightweight normal caching.
- Map node identity must remain understandable without color alone through legend copy and distinct visual treatments for members, chapters, and stewards. Mycelial/theme edges should declutter on mobile and in dense regions.
- Submitted-node updates must use email magic links only in v1. No wallet association, local browser secret, or public ownership claim flow is in scope.
- Owner edits must become pending update requests. The currently approved node remains public until steward/admin approval, and Live Onboarding Mode must not bypass this update review.
- Magic-link and update-request contracts must not expose owner email, token state, pending revisions, review notes, IP/user-agent, or any public key containing `review`.
- New public map-node submissions must include a valid email so submitted nodes have an owner email for future updates.
- Existing seed/import rows without private contact email are not backfilled in this wave.
- New edit-token/update-request schema must use the next available migration number after the current highest repo migration and avoid collisions with operational content migrations.
- Owner self-service edits may propose public profile, location, theme, and note fields. Node role/type changes are steward/admin-only unless the review workflow explicitly allows the change.
- Pending update requests must not allow stale approvals to overwrite newer public node state; use a one-pending-request-per-node rule or optimistic locking/version checks.
- Expired edit tokens and private request metadata must have a retention/cleanup policy.
- Edit-link requests must preserve account/node privacy through identical neutral responses for matching, non-matching, missing-node, and ownerless cases.
- Edit-link requests must have a 15-minute cooldown by node id, normalized email, and request IP/rate-limit key.
- Edit-link routes need coarse abuse protection beyond per-node cooldowns, such as per-IP and per-email daily buckets, to reduce broad email-trigger abuse.
- Missing email provider configuration, provider failures, and send errors must not change the neutral public edit-link response or reveal operational state.
- Magic-link session validation must not consume the token; the token is consumed only after a pending update request is created successfully.
- Raw magic-link tokens must never be logged or persisted; only hashes may be stored. The public edit page must clear the token from the visible URL before analytics, outbound links, or external navigation can run.
- Directus/admin access must keep token rows, owner emails, IP/user-agent, and raw request metadata restricted to trusted/admin roles. Standard stewards should only see review-safe update request fields needed to approve or reject edits.
- Directus/admin review should provide current-vs-proposed comparisons, explicit approve/reject transitions, reviewer metadata, and private notes.
- Modern CSS/Web UI follow-ups must preserve the existing `DESIGN.md` standard: token-only styling, container-query-first layout, dynamic viewport units, reduced-motion behavior, and multi-width browser proof.
- Preference-mode follow-ups must explicitly cover `color-scheme`, `prefers-contrast`, `forced-colors`, focus visibility, touch targets, and large-text behavior on map, shell, card, chip, and form-control surfaces.
- Chromium-first features such as text-scale meta, CSS scroll spy, scroll-state queries, and `closedby="any"` must remain progressive until fallback behavior is proven.
- Research-only APIs such as overscroll gestures, HTML-in-Canvas, CSS `@function`, CSS `if()`, shape APIs, and `fit-text` must not become production dependencies in this hub.

## Public Map Recovery Decisions

- The public map recovery is P0 and the current map should be treated as not production-ready until the recovery evaluation passes.
- The existing `public-website-design-implementation` hub is the single plan source for this work. Do not create a parallel Home map or steward-map plan.
- Public map state includes only real chapter anchors, approved submitted member nodes, and approved submitted steward nodes. Generated anonymous density nodes are removed and must not be counted or implied in public UI.
- Everyone uses the same add-node flow: private owner email, display name, placed coordinates, one to four themes, and optional public note.
- Stewards are public map nodes when their private owner email is allowlisted. Public steward payloads may include only public-safe profile identity: id, type `steward`, name, public location fields, coordinates, themes, optional trusted `chapterSlug`, optional `bioregion`, and optional public profile URL/reference.
- The steward allowlist is email-to-chapter mapping: the email determines `role: steward` and, when configured, the trusted `chapterSlug`. Public payloads never expose the email.
- Users place their submitted node anywhere on the map. Placement is not snapped to a chapter location.
- Public node details may show `bioregion` only when an approved value exists. Until a checked-in, license-approved polygon dataset exists, public output keeps the placed coordinates and leaves bioregion blank rather than implying real matching.
- Controlled live sessions auto-approve valid submissions in real time. Allowlisted steward emails force the public node type to `steward`; non-allowlisted valid submissions publish as `member`.
- Live mode affects new submissions only. Owner edit requests remain pending until steward/admin review.
- Relationship edges are limited to real public nodes: trusted steward-to-chapter edges, plus member/steward-to-member/steward edges when nodes share at least one theme. Shared non-pending bioregion can strengthen or annotate the relationship. There is no steward-steward special case beyond shared theme and shared bioregion rules.
- Visible edges must be capped per node so the map remains legible on mobile and in dense regions.
- The add-node theme picker is up to four themes. One theme is enough to continue; more than four is blocked.
- The June 10 activity is a live member self-add / map participation session, not a public-note feature. Existing `publicNote` storage should be treated in UI copy as a short public profile/intro field until a separate note feature is explicitly scoped.
- Linear cleanup/tracking is not part of repo implementation. Reusing/renaming the reverted Linear project and issues requires a separate explicit approval.

## Open Questions

- Which parts of the high-fidelity package should be adapted to preserve useful live-site texture, imagery, or logo treatments?
- Should stories and people remain empty until real content exists, or should the first design pass seed real entries?
- Which visual acceptance workflow should become the default: screenshots only, browser automation, or a side-by-side review checklist?
