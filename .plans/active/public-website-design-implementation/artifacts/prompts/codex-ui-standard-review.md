# Codex Review — Greenpill website UI-standard migration

## Context
A modern CSS standard + verification system was implemented for `packages/website` (the public Astro site) and committed directly to `main` (this repo commits to `main`; multiple agents work concurrently). The work was integrated **on top of** other agents' in-flight changes and must not have regressed them. Relevant commits (newest first): `eae9d75` harden ui-verify · `1709b28` root CLAUDE.md · `f8ade7f` HomeMap a11y · `0dcb8ba` finish migration + exception rule · `00a4656` ui primitives · `5776fea` shared-file fixes + axe-core · `dc8ba99` clean pages · `0fa2856` digest + skill · `59328b9` foundation + harness.

## Read first (the standard)
- `packages/website/DESIGN.md` — design contract + the "Modern CSS Standard" section (and its sanctioned non-`@container` exceptions).
- `packages/website/CLAUDE.md` — load-bearing rule digest.
- `packages/website/src/styles/gp-tokens.css` — tokens, `clamp()` type, gp-prefixed cascade layers.

## What changed
- `gp-tokens.css`: display/headline sizes → `clamp()` fluid type (removed the `@media` step-downs); `@layer gp-reset, gp-tokens, gp-base, gp-components, gp-utilities`.
- `GpLayout.astro`: `container-type: inline-size` on `#main-content`.
- Viewport `@media` → `@container` in pages (`chapters/index`, `garden/index`, `library/index`, `guilds/[slug]`, `stories/index`, `chapters/[slug]`) and primitives (`Button`, `Container`, `LinkRow`, `CtaStrip`, `SectionHeader`, `Breadcrumb`). Touch-target sizing (`Chip`, `RailArrows`) → `@media (pointer: coarse)`. Viewport `@media` kept **only** on the sticky site header/footer (documented chrome exception).
- `Text.astro`: caption → `--gp-fg-muted` (contrast); removed a redundant `@media` type override.
- `Meta.astro`: split `·`-separated items into discrete nowrap segments (fixes a mobile overflow).
- `stories/[slug].astro`: `<main>` landmark, `dvh`, `@container`, `overflow-wrap`.
- `HomeMap.astro`: map svg `role="img"` → `role="group"` (nested-interactive a11y).
- NEW `scripts/ui-verify.ts` (4-channel verification harness) and `.claude/skills/greenpill-ui` (workflow skill).

## Review for (regression-focused) — report file:line for each finding
1. **Container-query correctness.** Every `@media`→`@container` conversion needs a query-container ancestor. Confirm none render outside `#main-content` (besides the documented header/footer) where `@container` would silently never match. Check primitives' real render contexts.
2. **`clamp()` values** — do the `clamp(min, calc(intercept + vw), max)` expressions interpolate correctly between intended mobile/desktop sizes? Any that overflow a narrow container?
3. **Cascade-layer precedence.** Layered tokens/base are now lower-precedence than unlayered component styles. Any component that unintentionally relied on base-layer precedence (subtle visual shift)?
4. **`Meta.astro` split** — does splitting on `·` ever wrongly split content or break `accentIndex` across all `<Meta>` usages?
5. **HomeMap `role="group"`** — interactive nodes correctly exposed, label retained, no new a11y issue?
6. **Tailwind deferral** — confirm removal was correctly deferred (preflight-reset risk); flag anything already depending on Tailwind utilities/preflight.
7. **No regression to other agents' work** — these commits integrated concurrent work in `stories/[slug]`, `index`, `package.json`, `Breadcrumb`, root `CLAUDE.md`, and `chapters/[slug]` (chapter "Initiatives" feature). Confirm none of their functionality was reverted/broken.
8. **The harness** (`scripts/ui-verify.ts`) — is the logic sound? Any false negatives that would let real issues pass? (A navigation-race false-positive was just fixed in `eae9d75`.)

## How to verify
`bun run build:website && bun run ui:verify` — renders every route at 375/1024/1440 and runs the four channels (needs a Chrome/Chromium; it auto-discovers the Playwright cache). Expect **0 HARD**. Screenshots + `report.json` land in `packages/website/.ui-verify/`. For a single route: `bun scripts/ui-verify.ts /chapters`.
