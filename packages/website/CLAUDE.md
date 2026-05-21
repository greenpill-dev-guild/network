# CLAUDE.md — packages/website

Guidance for UI/front-end work in the Greenpill public website. This file
auto-loads when you edit anything under `packages/website/`. The full contract
is `packages/website/DESIGN.md`; this is the load-bearing digest.

## Before you touch any UI

1. Open `DESIGN.md`, including the **Modern CSS Standard** and the page you're changing in the **per-page reflow matrix**. State the desktop/tablet/mobile behaviour you must hit before writing CSS.
2. Read `src/styles/gp-tokens.css` (the `--gp-*` token values).
3. Inspect the relevant `src/components/ui/*` primitives before writing raw markup.
4. Use the **`greenpill-ui` skill**, or at minimum run the verification loop below before declaring done.

The live site is 100% on the `--gp-*` token system + `src/components/ui` primitives. **Match it. Do not improvise a new aesthetic, and do not use the generic `frontend-design` plugin here** — this package has its own standard.

## The load-bearing rules

1. **Reuse primitives first.** Compose `src/components/ui/*` (Button, Card, Chip, StatusChip, Container, Text, Overline, ArrowLink, Avatar, AvatarStack, EmailInput, RailArrows, SectionHeader, Meta, ImagePlaceholder, LinkRow, CtaStrip) + `shell/` + `page-sections/` before writing raw markup. Never re-implement a button/card/chip/input.
2. **Tokens only.** Every color/size/space is a `var(--gp-*)` token (or an `rgba()`/`color-mix()` of one). Never hardcode hex. Exception: data-viz colors (e.g. `HomeMap` theme hues) are data, not chrome.
3. **Three fonts, fixed roles.** `var(--gp-font-display)` (Spectral) for display+headlines only; `var(--gp-font-body)` (Manrope) for all UI/body; `var(--gp-font-mono)` (JetBrains Mono) for overlines/technical metadata only. Never a literal font-family.
4. **One lime accent per screen.** `--gp-primary` (lime) = the single primary action. Headlines are `--gp-secondary` (gold); body is `--gp-fg` (off-white). Gold is never interactive.
5. **No grey, no pure white/black.** Warmest neutral is `--gp-off-white` (#FAF7EE); darkest is `--gp-green-950`. Step the green scale (`--gp-bg → --gp-surface → --gp-card → --gp-card-elev`) for hierarchy before reaching for shadow. Only chromatic colors: forest green, lime, gold, terracotta `--gp-error`.
6. **Contrast is real.** Small/dim text must hit WCAG 4.5:1 — `--gp-fg-dim` fails on elevated cards; prefer `--gp-fg-muted` for small metadata. axe checks this (channel 3).
7. **Pill + radius scale.** Buttons/chips/inputs/avatars are `--gp-radius-pill`; other radii match `--gp-radius-{sm,md,lg,xl}`. Never mix sharp 4px corners with the pill language.
8. **Fluid type.** Display/headline sizes are `clamp()` tokens — never hardcode font-size or add viewport `@media` for type. Body/label/overline are fixed.
9. **Responsive = container queries.** Everything inside `#main-content` (the page-level container in `GpLayout`) reflows via `@container`, not viewport `@media` — page sections, primitives, and in-content components like `Breadcrumb`. A component that must reflow on its own width sets `container-type` on its root.
10. **Sanctioned non-`@container` cases (don't "fix" these to `@container`):** the global type scale uses fluid `clamp()`; touch-target sizing uses `@media (pointer: coarse)` (device-driven, not width); and the top-level full-viewport chrome — the sticky **site header + footer** — uses viewport `@media` (they always span the viewport, and forcing `container-type` onto a sticky element is wrong).
11. **Mobile is equal.** Every layout is correct at 375 / 1024 / 1440. Implement the reflow-matrix row for the page. THIS is the most-violated rule — verify it (below), don't eyeball it.
12. **44×44px minimum touch targets** for standalone interactive controls at mobile (chips bump from 30→44; buttons already 48). Inline text links and SVG map pins are exempt.
13. **No-wrap rules (silent mobile breakers).** Inline CTAs (text + arrow): `white-space:nowrap` on the whole link. Chips: `nowrap` on the body. Overlines/bylines: each `·`-separated segment is its own `nowrap` span (the row wraps as a unit — see `Meta.astro`). Breadcrumbs collapse middle crumbs to `…`.
14. **Mobile heights use `dvh`/`svh`/`lvh`**, never `vh`, so content isn't cut off behind mobile browser chrome.
15. **8px spacing** via `--gp-space-*`; `xs` (4px) only for micro-adjustments, never section spacing.
16. **Focus + motion are global — never override.** `:focus-visible` lime ring and reduced-motion are wired in `gp-tokens.css`. No transform-on-press, no scroll/entrance animations on static content; only the map node pulse loops.
17. **Logical properties** (`margin-inline`, `inset-inline`, `text-align:start`) over physical left/right — the site ships translated content.
18. **Agent-legible / accessible markup.** Semantic `<button>`/`<a>` (never div+onclick); `<label for>` on every input; `cursor:pointer` on actionables; one `<main>` landmark per page; stable layout (no load-time shift). Agents and screen readers read the accessibility tree.

## Verification is mandatory

After any UI change, run the source guardrail first. Before declaring rendered UI done, run the browser proof and inspect the screenshots:

```
bun run ui:check
bun run ui:verify /your-route
# or run a dev server + set UI_VERIFY_ORIGIN for ui:verify
```

`ui:check` is static/source-only and catches CSS standard drift without building or opening a browser. `ui:verify` renders at 375/1024/1440 and runs four channels — layout (overflow / wrapped pills / 44px targets), accessibility tree, axe-core, and CLS + semantic lint — writing screenshots + `report.json` to `.ui-verify/`. **Read the 375px PNG first.** Fix every HARD violation. Never declare UI work done on code review alone — responsiveness and a11y bugs are invisible in source.

## House component pattern

New components are `.astro` with a scoped `<style>` block, `gp-`-prefixed classes, and `var(--gp-*)` values only. Template off `src/components/ui/Button.astro`, `Card.astro`, `Chip.astro`. Pages wrap content in `Container.astro` inside `GpLayout.astro` (which sets `body.gp-root` and the container context).

## Legacy — do not use or copy

Tailwind is being retired from this package (its utilities are unused; `@apply` = 0). Do not add Tailwind utility classes or `@apply`. The dead `global.css` and old root components (Hero/Nav/Footer/etc.) have been removed — don't reintroduce their `--green`/`font-volkhov` patterns.

## Canonical references

web.dev [Learn CSS](https://web.dev/learn/css) · [Learn Accessibility](https://web.dev/learn/accessibility) · [Responsive design](https://web.dev/articles/responsive-web-design-basics) · [Building agent-friendly UX](https://web.dev/articles/ai-agent-site-ux) · Chrome [CSS & UI](https://developer.chrome.com/docs/css-ui).
