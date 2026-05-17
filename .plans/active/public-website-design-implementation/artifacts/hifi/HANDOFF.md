# Greenpill Network — Developer Handoff

This package contains nine high-fidelity, static HTML mockups of the Greenpill Network site, plus the design-system source they were built against. All Tweaks-panel machinery has been baked out — what's here is the final intended state.

---

## What to look at first

| File | What it is |
|---|---|
| **`Components (Hi-Fi).html`** | The design system in one page — type scale, color tokens, button states, card surfaces, every reusable block. Start here. |
| **`Home (Hi-Fi).html`** | Landing page with the mycelial chapter map and bento sections. |
| **`Chapters (Hi-Fi).html`** | Chapter directory (typographic hero, flat directory, no map). |
| **`Chapter (Hi-Fi).html`** | Individual chapter page (Nigeria). |
| **`Library (Hi-Fi).html`** | Resource library with editorial hero. |
| **`Stories (Hi-Fi).html`** | Stories feed with side-by-side featured treatment. |
| **`Story (Hi-Fi).html`** | Single-story article view. |
| **`Guild (Hi-Fi).html`** | Guild page (Dev Guild, mandate + diagram hero). |
| **`Garden (Hi-Fi).html`** | The Garden — onboarding/contributor ramp with coordination-globe hero. |

The `archive/tweakable/` folder preserves the parametric/Tweak-driven versions of every page if you ever need to A/B alternatives again. **Do not ship from `archive/`** — those files still load the Tweaks runtime.

---

## The token system — single source of truth

**`hifi/gp-tokens.css`** is the canonical design-token file. Every color, type size, radius, shadow, and spacing value referenced anywhere in the project is a CSS custom property declared here. Re-implement in your stack of choice as a theme file / Tailwind config / Vanilla Extract tokens / etc.

### Token groups

```
Colors        --gp-green-{100..950}   forest greens (canvas, surfaces)
              --gp-lime-{100..700}    chartreuse (primary accent)
              --gp-gold-{200..600}    steward gold (display headlines)
              --gp-off-white          body text
              --gp-success/warning/info/error

Roles         --gp-bg, --gp-fg, --gp-fg-muted, --gp-fg-dim
              --gp-surface, --gp-card, --gp-card-elev
              --gp-border, --gp-border-soft
              --gp-primary, --gp-primary-hover, --gp-primary-fg
              --gp-secondary, --gp-ring

Type families --gp-font-display    Spectral (serif headlines)
              --gp-font-body       Manrope (UI + body)
              --gp-font-mono       JetBrains Mono (overlines, meta)

Type scale    --gp-display-size, --gp-h1..h3-size + matching -lh, -ls
              --gp-title-lg/md, --gp-body-lg/md/sm, --gp-label-md/sm
              --gp-overline, --gp-caption

Spacing       --gp-space-{xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl}    8px base
Radii         --gp-radius-{sm, md, lg, xl, pill}
Shadows       --gp-shadow-{card, card-lg, pill, deep, focus}
Layout        --gp-container-{md, lg, xl, 2xl}
```

### Display font

The display face is **Spectral** (Google Fonts), loaded via the `@import` at the top of `gp-tokens.css`. It was picked from a 7-font bake-off; the alternates are still in `archive/tweakable/hifi/gp-shell.jsx` in the `GP_FONTS` object if you ever want to revisit.

---

## File structure

```
.
├── HANDOFF.md                ← this file
├── *(Hi-Fi).html             ← 9 page mockups, baked
├── hifi/
│   ├── gp-tokens.css         ← design tokens (THE source of truth)
│   ├── gp-shell.jsx          ← shared header, footer, type atoms, buttons, etc.
│   ├── *-page.jsx            ← per-page composition
│   ├── *-sections.jsx        ← page-specific section components
│   ├── *-bits.jsx            ← page-specific atoms
│   ├── *-data.jsx            ← placeholder content
│   ├── home-map.jsx          ← mycelial map (canvas + nodes)
│   ├── map-canvas.jsx        ← shared map primitives
│   └── assets/               ← topo backgrounds, wordmarks, etc.
├── archive/
│   └── tweakable/            ← original Tweak-driven versions (reference only)
└── (lo-fi files — Wireframes.html, wf-*.jsx — pre-design exploration, can ignore)
```

---

## Architectural conventions used in the mockups

- **Everything is JSX-in-browser via Babel** — this is a prototype rig, NOT how to ship. Treat the `.jsx` files as component specifications, not as source to copy line-for-line into your build. Port them to your real React/Vue/Svelte/whatever setup.
- **Two view modes** — every page supports a `?raw` URL flag. Without it, the page is wrapped in a "gallery shell" that locks the design at a fixed 1440 / 1024 / 375 width and scales-to-fit (great for design review). With `?raw`, the gallery is stripped and the page renders edge-to-edge at the real viewport width with a live viewport detector wired in — that's the production-shaped view you should be implementing against.
- **Every page is a thin top-level `<App>` that branches on `?raw`.** In gallery mode it renders a `<*Frame>` wrapping a `<*Page>`. In raw mode it renders the `<*Page>` directly with `bp` driven by `useGpAutoBp()`. The frame is dev chrome — strip it for production. The page itself is the implementation reference.
- **Pages use CSS container queries** (`container-type: inline-size` on the page root) — this is intentional and modern. Targets evergreen browsers.
- **The Components page is the visual contract.** If you implement a button or card differently than what's shown there, the rest of the site will break visually.

---

## Things the mockups don't cover

- **Routing & data fetching** — all content is hard-coded in `*-data.jsx`. Replace with real CMS / API integration.
- **Auth / member states** — the mockups assume a public, logged-out reader. Member-only states (gated guild content, steward dashboards, contributor profiles) are not designed here.
- **Forms** — newsletter signup, "submit a story", chapter applications are visual-only. No real backend wiring.
- **Animations beyond CSS transitions** — the mycelial map has a simple JS pulse animation; everything else is CSS hover/transition.
- **Accessibility audit** — semantic HTML is used and focus rings are styled, but a full a11y pass (screen reader, keyboard nav, color contrast on every state) hasn't been done.

---

## Quick start for implementation

1. Open `Components (Hi-Fi).html` in a browser. Read the type scale, button states, card patterns.
2. **Append `?raw` to any page URL** (e.g. `Components (Hi-Fi).html?raw`) to see it at full viewport with live responsiveness — no gallery shell, no scaling frame. Resize the browser to see the page reflow through desktop / tablet / mobile breakpoints. **This is what production looks like.** The plain URL gives you a fixed-width gallery preview useful for design review.
3. Copy `hifi/gp-tokens.css` into your project as the foundation theme.
4. Pick one page (Home is a good first target) and rebuild it in your stack, treating the mockup HTML/JSX as the spec.
5. Reference the `gp-*` CSS custom properties anywhere you'd otherwise hardcode a color or spacing value.

Questions or design clarifications — ping the design owner.
