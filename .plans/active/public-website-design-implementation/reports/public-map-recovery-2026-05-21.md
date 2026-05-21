# Public Map Recovery - 2026-05-21

## Status

The public map is not production-ready. Prior green checks and plan entries overstated readiness because they validated source presence, non-interactive rendering, and contract fragments rather than the actual HiFi map behavior and live add-node session.

This report supersedes any local claim that the Home map, live add-node flow, or map visual QA is complete.

## What Shipped

- The homepage contains a single `HomeMap.astro` surface with chapter anchors rendered at build time and progressive enhancement from `/map/state`.
- The agent has a private map-node intake path with moderated mode by default and admin-controlled live mode.
- Live mode currently auto-approves valid submissions and writes a private `system:live-onboarding` review row.
- The existing steward email allowlist path forces allowlisted submissions to role/type `steward`; non-allowlisted steward/organizer/coordinator claims are normalized to `member`.
- Public projections already guard against private email, raw notes, pending submissions, review notes, edit-token data, IP/user-agent data, rate-limit data, and moderation metadata.

## Divergence From HiFi

- The checked-in HiFi map is a chapter/steward/member mycelial network, not a chapter-only map with later member dots.
- The shipped public map state filtered steward nodes out, which made steward-member and steward-steward threads impossible in the browser.
- The shipped Home map only injected dynamic member nodes, so even a public-safe steward payload would not render as a steward.
- The add-node flow enforced exactly four themes, while the HiFi interaction is up to four.
- The visual acceptance loop did not prove a dense graph, steward nodes, live growth, or the full add-node dialog path at mobile and desktop sizes.

## Data/API Mismatch

- Public map state must include chapters, opt-in public stewards, approved members, anonymous generated density nodes, and theme-colored edges.
- Steward public fields are limited to public-safe profile identity: `id`, `type: "steward"`, `name`, public location fields, `lat`, `long`, `themes`, optional `chapterSlug`, and optional public profile URL/reference.
- Anonymous density nodes are visual/network scaffolding only. They must not use fake names, fake biographies, fake profile URLs, private identity hints, or any data that implies a real person.
- Real submitted members and stewards should replace or augment anonymous density over time.

## Validation Gaps

- Source-string tests allowed implementation drift from the HiFi reference.
- The UI verifier did not open the add-node dialog, select themes, place a node, submit, verify live refresh, or compare screenshots to the HiFi reference.
- Existing tests asserted steward exclusion, which contradicted the desired map behavior.
- Acceptance must prove chapter/steward/member treatments, anonymous density, mycelial edges, live refresh, and privacy guards together.

## Production Readiness Gaps

- `MAP-REVIEW.md` found production in live onboarding mode during review. That mode is useful for sessions but must be treated as an operator-controlled state with a preflight and disable path.
- The runbook needs to verify `/map/state.intakeMode`, seeded graph rendering, live submission refresh, steward allowlist behavior, and the post-session moderation/review path before any call.
- Production Directus still needs real steward user onboarding and a non-admin RBAC smoke test before relying on steward review workflows.

## Steward Sync And June 10 Path

- Week 1 Steward Sync: onboard stewards to Directus/admin, confirm role assignment, rehearse chapter content updates, and collect public map profile opt-ins.
- Week 2 Steward Sync: rehearse steward self-add with allowlisted emails in controlled live mode and verify that allowlisted emails render as public steward nodes.
- June 10 session: run a controlled live member self-add / map participation activity. Valid live submissions appear in real time; allowlisted emails publish as stewards; non-allowlisted valid submissions publish as members. This is not a public note feature.

## Linear Inventory And Recommendation

Read-only Linear inventory found:

- `Network Presence` exists as the intended parent initiative for public website/docs/communication work.
- `Network Website` exists as a completed/trashed project and should not be reused as the active map project.
- Premature reverted artifacts exist: `Reverted - Greenpill Network Steward Map Onboarding`, duplicate reverted steward participation initiatives, and canceled issues `PRD-523` through `PRD-528` plus `PRD-530`.

Recommended later Linear mutation, only after explicit approval:

- Reuse and rename the reverted map project as `Public Map Recovery - June 10 Live Session`.
- Attach it to `Network Presence`.
- Reuse the canceled issues for the recovery tasks instead of creating a parallel issue set.
- Clean up duplicate reverted initiatives by archiving or marking them unused during the approved Linear pass.

No Linear or production changes were made while saving this recovery plan.
