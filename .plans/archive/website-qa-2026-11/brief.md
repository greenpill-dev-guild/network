# Website QA Pass, November 2026

## Intent

Afo's 2026-11-06 review of greenpill.network found broken interactions, copy that may not be true, decisions from the July 16 call that never shipped, and visual drift. This hub turns that review, the open July decisions, the 2026-09-24 audit queue, and the open Linear issues in "Greenpill Network Website Polish & Steward Onboarding" (P-PRD-19) into focused Claude Code sessions. Each session owns one surface and a fixed set of files, so sessions can run in parallel without editing the same code.

## Outcome

- Every factual claim on the pages these sessions touch traces to a public source checked during the work, or it is removed. No invented events, partners, numbers, people or attributions.
- The broken interactions work: Subscribe, the Telegram invite, external links, book translations and store links, and current podcast episodes.
- Map nodes sit where their people are, and bad coordinates can no longer be saved.
- The July decisions for the Dev Guild and Writers Guild pages, the home page and the Library are applied.
- One background, one card treatment, the current logo and brand marks, and no em dashes in copy.

## Out of scope

- PRD-621 (manual map connections), PRD-1119 (CMS dashboard) and PRD-1120 (CMS localization) stay in Backlog.
- The new `/guilds` page and the Library redesign variants from the July wireframe prompts, unless Afo adds them.
- The Directus admin findings in Section 3 of the September audit.

## Read first

- `reports/2026-11-06-qa-findings.md`: each review note, the evidence, and the owning session.
- `spec.md`: ground rules every session follows, ownership of content, and the open decisions.
- `plan.todo.md`: the session roster, file ownership, ports, batches and merge order.
- `docs/design/claude-design-wireframe-prompts.md`: the July 16 decisions (appendix).
- `.plans/audits/2026-09-24-ui-ux-audit-pass-2.md`: the September audit (Sections 1, 5 and 6).
- `docs/design/map-polish-audit.md`: the HomeMap audit behind PRD-739.
- `packages/website/DESIGN.md` and `packages/website/CLAUDE.md`: the UI standard.
