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

## Constraints

- `.plans/` carries planning, research, handoffs, readiness, and evolving implementation context.
- Runtime contracts that code depends on belong under `packages/`, not planning docs.
- This repo starts with manual plan updates plus validation, not automation claiming.
- Keep `status.json` taxonomy current enough for future filtering and dependency checks.
- Preserve public/private boundaries: no private node-intake fields, review notes, pending submissions, raw upstream feedback, or database credentials in the public website.
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

## Open Questions

- Which parts of the high-fidelity package should be adapted to preserve useful live-site texture, imagery, or logo treatments?
- Should stories and people remain empty until real content exists, or should the first design pass seed real entries?
- Which visual acceptance workflow should become the default: screenshots only, browser automation, or a side-by-side review checklist?
