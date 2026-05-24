# Modern Web UI Follow-Up

Date: 2026-05-24

Source audit: `/Users/afo/Documents/Codex/2026-05-23/i-m-watching-this-great-video/modern-css-web-ui-audit.md`

## Summary

The active `public-website-design-implementation` hub remains the correct owner for Greenpill Network's modern CSS/Web UI follow-up. The website already has the strongest written CSS contract among the audited repos: token-only styling, container queries, dynamic viewport units, touch target rules, reduced-motion handling, and UI verification.

This report does not create a competing plan hub and does not authorize runtime changes ahead of the current P0 public map/design work.

## Production Posture

Already aligned with the Web UI audit:

- `packages/website/src/styles/gp-tokens.css` owns cascade layers, tokens, fluid type, reduced motion, and base behavior.
- `packages/website/DESIGN.md` and `packages/website/CLAUDE.md` define token-only CSS, container-query use, 44px targets, dynamic viewport units, and visual proof expectations.
- `GpLayout.astro` gives page content a query-container root.
- `bun run ui:verify` provides multi-width UI proof for the public site.

## Follow-Up Candidates

Progressive candidates:

- Add `<meta name="text-scale" content="scale">` only after auditing root font-size assumptions and proving large text at 375, 1024, and 1440 widths.
- Add Astro MPA View Transitions via `@view-transition { navigation: auto; }` only as progressive enhancement with reduced-motion fallback.
- Use CSS scroll spy for long story, library, garden, or chapter pages with in-page navigation.
- Use scroll-state queries for sticky header reveal/hide behavior only if it reduces noise without hiding orientation.
- Add `closedby="any"` to simple dialogs such as HomeMap add-node only with existing escape/click fallback behavior preserved.
- Review `packages/website/src/scripts/parallax.ts` against the current `GpLayout.astro` CSS-only background approach and remove or realign stale JS only through a future implementation lane.

Research-only candidates:

- overscroll gestures, HTML-in-Canvas, CSS `@function`, CSS `if()`, broad style-query architecture, `corner-shape`, `shape()`, `border-shape`, and `fit-text`.

## Guardrails

- Do not reintroduce fake map density, fake counts, or decorative-only network complexity.
- Do not use modern CSS primitives to bypass the existing `DESIGN.md` standard.
- Do not make Chromium-first features required for core content access.
- Keep browser proof multi-width and reduced-motion aware.
