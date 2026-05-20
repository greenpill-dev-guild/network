---
name: greenpill-ui
description: >-
  Build or modify UI in the Greenpill Network website (packages/website) —
  .astro components, pages, layouts, styles, responsive/mobile layout, design-system
  work, or fixing visual/accessibility bugs. Enforces the --gp-* token system and the
  packages/website/DESIGN.md standard (clamp fluid type, container queries, logical
  properties, dvh units, agent-legible a11y), reuses existing components/ui primitives,
  and runs the 375/1024/1440 four-channel visual+a11y verification loop. Use this
  INSTEAD of the generic frontend-design plugin in this repo — do not improvise an
  aesthetic; adhere to the existing house system.
---

# greenpill-ui

You are doing UI work in `packages/website`. There is already a strong, opinionated
design system. Your job is **adherence, not invention**. Follow this loop; do not skip
the verification step.

The contract is `packages/website/DESIGN.md`; the rule digest is
`packages/website/CLAUDE.md`; token values are `packages/website/src/styles/gp-tokens.css`.

## Workflow (blocking — work the steps in order)

**1. Orient.**
- Read `src/styles/gp-tokens.css` for the `--gp-*` token values.
- Open `DESIGN.md`, read the **Modern CSS Standard** section and the **per-page reflow
  matrix** row for the page you're touching. State, in one line, the desktop / tablet /
  mobile reflow you must hit before writing any CSS.

**2. Reuse before building.**
- Inventory `src/components/ui/`, `src/components/shell/`, `src/components/page-sections/`.
  Browse the rendered gallery at `/design-system` to see the vocabulary.
- Compose existing primitives. Only write a new component if nothing fits; if you do,
  follow the house pattern (scoped `<style>`, `gp-`-prefixed classes, `var(--gp-*)` only —
  template off `Button.astro` / `Card.astro` / `Chip.astro`).

**3. Implement to the standard** (the 18 rules in `packages/website/CLAUDE.md`). Apply as
you write, not after: tokens-only colors, the three-font split, one lime accent, `clamp()`
type, `@container` reflow (and a `container-type` ancestor — remember header/footer sit
*outside* `#main-content`), `dvh` heights, logical properties, the no-wrap rules, 44px
mobile targets, semantic `<button>`/`<a>` + `<label for>` + one `<main>`.

**4. Verify (mandatory — the step that catches what code review can't).**
```
bun run build:website
bun scripts/ui-verify.ts <route> [<route> …]   # or `bun run ui:verify <route>` if registered
```
(For a fast inner loop, run `bun run dev:website` and `UI_VERIFY_ORIGIN=http://localhost:4321 bun scripts/ui-verify.ts <route>`.)
It renders at 375/1024/1440 and runs four channels: layout (overflow / wrapped pills / 44px
targets), accessibility tree, axe-core, CLS + semantic lint → screenshots + `report.json`
in `packages/website/.ui-verify/`. **Read the report, then the 375px PNG first**, then 1024
and 1440.

**5. Fix loop.** Resolve every HARD violation (PAGE_OVERFLOW, OVERFLOW_ELEMENT,
TOUCH_TARGET, WRAP, axe serious/critical, missing landmark). Re-run until HARD = 0. Triage
WARN — fix unless it's a known data-viz exception.

**6. Self-check the do/don'ts.** Walk DESIGN.md's "Do's and Don'ts": one primary action,
three-font split intact, no grey / pure-white / pure-black, focus ring untouched, pill
radii, motion rules.

**7. Report** what changed, the routes you verified, and the HARD/WARN counts.

## Why this loop exists

Past UI work shipped non-responsive, non-mobile, off-standard output *despite* the design
system existing — because the rules weren't loaded at the right moment, the output was never
rendered and inspected at 375px, and nothing failed on a violation. Steps 1, 3 and 6 bind
every change to the standard; step 4 makes responsiveness and accessibility bugs visible and
blocking. Following it would have prevented those failures.

## Concurrency

This repo has multiple agents working at once. Before editing a file, check `git status`;
do not modify files with other agents' uncommitted changes. Commit only your own files
(explicit paths, never `git add -A`).
