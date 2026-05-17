---
version: alpha
name: Greenpill Network
description: >
  Regenerative-finance community design system. Forest-green canvas, lime
  primary, gold display headlines, off-white body. Serif + sans + mono trio.
  Sourced from hifi/gp-tokens.css.

colors:
  # Greens — the canvas
  green-950: "#0A2D21"
  green-900: "#0F3D2E"
  green-800: "#143F30"
  green-700: "#1A4D3A"
  green-600: "#235C46"
  green-500: "#2A6B52"
  green-400: "#3F8A6C"
  green-300: "#5BA889"
  green-200: "#8DC9AE"
  green-100: "#C8E6D6"

  # Lime — the accent (interaction)
  lime-700: "#7FA61F"
  lime-600: "#9BC326"
  lime-500: "#B8E835"
  lime-400: "#C4F02C"
  lime-300: "#D4F564"
  lime-200: "#E5FA9A"
  lime-100: "#F2FCCC"

  # Gold — display headlines (steward)
  gold-600: "#D4B97A"
  gold-500: "#F0DCA0"
  gold-400: "#F5D896"
  gold-300: "#FAE8C2"
  gold-200: "#FCF1D8"

  # Off-whites — body
  off-white: "#FAF7EE"
  off-white-muted: "#E8E2D4"
  off-white-dim: "#B8B0A0"

  # Semantic roles (duplicated as literals; see Colors prose for mapping)
  primary: "#B8E835"
  primary-hover: "#C4F02C"
  primary-active: "#9BC326"
  primary-fg: "#0F3D2E"
  secondary: "#F0DCA0"
  tertiary: "#3F8A6C"
  neutral: "#FAF7EE"

  bg: "#0F3D2E"
  surface: "#143F30"
  card: "#1A4D3A"
  card-elev: "#235C46"
  border: "#2A6B52"

  fg: "#FAF7EE"
  fg-muted: "#E8E2D4"
  fg-dim: "#B8B0A0"

  success: "#B8E835"
  warning: "#F0DCA0"
  info: "#5BA889"
  error: "#E07856"

typography:
  headline-display:
    fontFamily: Spectral
    fontSize: 72px
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Spectral
    fontSize: 56px
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Spectral
    fontSize: 40px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Spectral
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.005em

  title-lg:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.005em
  title-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35

  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0.005em

  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.02em

  overline:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.16em
  caption:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4

rounded:
  sm: 6px
  md: 12px
  lg: 20px
  xl: 32px
  full: 9999px

spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
  5xl: 128px
  container-md: 768px
  container-lg: 1024px
  container-xl: 1280px
  container-2xl: 1440px

components:
  # ── Buttons ──────────────────────────────────────────────────
  button-primary:
    backgroundColor: "{colors.lime-500}"
    textColor: "{colors.green-900}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 14px 24px
    height: 48px
  button-primary-hover:
    backgroundColor: "{colors.lime-400}"
  button-primary-active:
    backgroundColor: "{colors.lime-600}"

  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.off-white}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 14px 24px
    height: 48px
    borderColor: "{colors.border}"
  button-ghost-hover:
    backgroundColor: "{colors.green-800}"
    textColor: "{colors.lime-400}"

  # ── Inputs ───────────────────────────────────────────────────
  input-pill:
    backgroundColor: "{colors.green-900}"
    textColor: "{colors.off-white}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: 0 18px
    height: 48px
    borderColor: "{colors.border}"
  input-pill-focus:
    borderColor: "{colors.primary}"

  # ── Chips ────────────────────────────────────────────────────
  chip:
    backgroundColor: transparent
    textColor: "{colors.off-white}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 0 14px
    height: 30px
    borderColor: "{colors.border}"
  chip-active:
    backgroundColor: "{colors.lime-500}"
    textColor: "{colors.green-900}"
  chip-soft-lime:
    backgroundColor: "{colors.lime-100}"
    textColor: "{colors.lime-700}"
  chip-soft-gold:
    backgroundColor: "{colors.gold-200}"
    textColor: "{colors.gold-600}"

  status-chip-primary:
    backgroundColor: "{colors.lime-500}"
    textColor: "{colors.green-900}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 0 12px
    height: 28px
  status-chip-secondary:
    backgroundColor: "{colors.gold-500}"
    textColor: "{colors.green-900}"

  # ── Surfaces ─────────────────────────────────────────────────
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-elevated:
    backgroundColor: "{colors.card-elev}"
    rounded: "{rounded.lg}"
    padding: 32px

  # ── Chrome ───────────────────────────────────────────────────
  header:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    height: 72px
  footer:
    backgroundColor: "{colors.green-950}"
    textColor: "{colors.fg-muted}"

  # ── Avatar ───────────────────────────────────────────────────
  avatar:
    backgroundColor: "{colors.green-700}"
    textColor: "{colors.gold-500}"
    rounded: "{rounded.full}"
    size: 56px

motion:
  duration:
    instant: 0ms
    fast: 120ms
    base: 200ms
    slow: 400ms
    pulse: 2400ms
  ease:
    standard: cubic-bezier(0.4, 0, 0.2, 1)
    emphasized: cubic-bezier(0.2, 0, 0, 1)
    entrance: cubic-bezier(0, 0, 0.2, 1)
    exit: cubic-bezier(0.4, 0, 1, 1)
---

# Greenpill Network — DESIGN.md

## Overview

Greenpill Network is a regenerative-finance community building local chapters, guilds, and stories around the idea that public goods can be funded. The brand voice is **earnest, grounded, and warm** — not corporate, not playful. The UI should feel like a *living forest field-guide* rather than a SaaS app: high-contrast typography, organic green canvas, a single vibrant accent that earns its presence.

Target audience is contributors, stewards, and curious readers stepping into the network — most arriving from Twitter / Farcaster / Discord. They expect substance and density, not splash screens. Pages should reward scrolling and reading; interactions should feel **considered, not flashy**.

Visual character:

- **Dark by default.** The canvas is deep forest green, not black, not white. Lighter surfaces step up the green scale rather than introducing grey.
- **Editorial typography.** Display headlines in Spectral (serif) carry the warmth; UI text in Manrope (sans) carries the function. Mono is reserved for technical / metadata moments.
- **One accent does the work.** Lime green is the primary action color and appears sparingly — overuse kills its meaning. Gold is reserved for display headlines and "steward" emphasis.
- **Topographic texture.** Pages can carry a subtle topo-line background wash (12% opacity, overlay blend) to evoke terrain and place without becoming wallpaper.

## Colors

The palette is rooted in a deep-forest canvas with a single vibrant lime accent and a warm gold reserved for headlines.

- **Primary — Greenpill Lime (`#B8E835`):** The sole driver for primary actions, links, focus rings, and active states. Use *once* per screen as a CTA. Pairs with `green-900` text for accessible contrast.
- **Secondary — Steward Gold (`#F0DCA0`):** All display and headline text. Lends warmth and editorial gravity. Never used for interactive elements.
- **Tertiary — Forest mid-tone (`#3F8A6C`):** Informational accents, soft highlights, link hover on light surfaces. Used sparingly.
- **Neutral — Off-white (`#FAF7EE`):** All body text. Warm-tinted to feel like paper rather than screen, never pure white.
- **Canvas — Deep Forest (`#0F3D2E`):** Default page background. Surfaces (`green-800`), cards (`green-700`), and elevated cards (`green-600`) step up the scale in 8–12% increments.

Semantic statuses map onto the palette intentionally: `success` reuses primary lime (success *is* the active state), `warning` reuses gold (gold is already the "attention" color), `info` is the forest mid-tone, and `error` is an earthy terracotta (`#E07856`) — never a saturated red, which would feel alien against the canvas.

The full 100–950 green scale, 100–700 lime scale, and 200–600 gold scale are tokenized so any chart, illustration, or one-off surface can pull from a coherent ramp without inventing new values.

## Typography

The type system pairs three families with strict role assignments:

- **Spectral** (variable serif, weights 400–700) — All display + headline text (`headline-display`, `headline-lg`, `headline-md`, `headline-sm`). Always set in gold for warmth and editorial weight. Optical sizing is enabled so large display sizes pick up appropriately tighter letterforms.
- **Manrope** (variable sans, weights 300–800) — All UI: titles, body, labels, captions, buttons, navigation. Body sets at 16px / 1.6 line-height for long-form readability.
- **JetBrains Mono** — Overlines and technical metadata only (timestamps, IDs, chip labels in `mono` variant). Reserved for moments that should feel like data, not voice.

Headlines never use Manrope. Body never uses Spectral. Overlines never use anything but mono. This three-way split is what gives the site its editorial character — breaking it produces a generic landing-page voice.

Headline color is `secondary` (Steward Gold), body color is `fg` (Off-white). Mono overlines are colored `primary` (Lime) when used as section labels, `fg-dim` when used as inline metadata.

**Note for implementation:** `gp-tokens.css` imports Spectral and Manrope via Google Fonts. JetBrains Mono is referenced in the `mono` family but not auto-loaded — add a `@fontsource/jetbrains-mono` (or equivalent) import when wiring fonts into Astro.

## Layout

The site uses a **container-query-based responsive system** rather than viewport media queries. Every page root carries `container-type: inline-size`; child layouts reflow based on the container's width, not the viewport. This makes pages composable into any column or sidebar without breakage.

Container widths step through `container-md` (768px), `container-lg` (1024px), `container-xl` (1280px), `container-2xl` (1440px). Most page content lives in `container-xl`; full-width hero sections may bleed to the edge.

A strict **8px spacing scale** governs all rhythm. The half-step (`xs: 4px`) is reserved for micro-adjustments inside small components — never used for section spacing.

| Use | Token |
|---|---|
| Inside small chips, badge padding | `spacing.xs` (4px) |
| Tight stacks (icon + label, meta lines) | `spacing.sm` (8px) |
| Card internal padding, default gap | `spacing.md` (16px) |
| Generous card padding, section internal gap | `spacing.lg` (24px) |
| Card-to-card gap, sub-section gap | `spacing.xl` (32px) |
| Section gap inside a page | `spacing.2xl` (48px) |
| Section gap between major page regions | `spacing.3xl` (64px) |
| Hero vertical padding | `spacing.4xl` (96px) |
| Page-top hero on landing surfaces | `spacing.5xl` (128px) |

The three reference breakpoints are **375 (mobile) / 1024 (tablet) / 1440 (desktop)**. Every HiFi page should look correct at these three widths in container-query terms.

## Responsive Behavior

The site is **mobile-equal**, not mobile-first or mobile-after — every layout is designed at all three reference widths (375 / 1024 / 1440) and the reflow rules are codified, not improvised. Container queries (not viewport media queries) drive every reflow, so a component placed in a sidebar or modal at a narrower inline-size reflows the same way it would at the matching viewport width.

### Reflow primitives — the rules that apply everywhere

These are the cross-cutting rules. Apply them to shared primitives once; most page-level mobile issues disappear in one pass.

| Primitive | Rule |
|---|---|
| **Inline CTAs** (text + → arrow) | `white-space: nowrap` on the entire link. The text and arrow must never split across lines. If a CTA genuinely can't fit on one line in its container, drop the arrow and underline the label instead — never let the arrow drop alone. |
| **Chips** (all variants — filter, status, share, topic, translation, event) | `white-space: nowrap` on the chip body. Pills must not wrap internally; a wrapped pill reads as a broken lozenge. If the row overflows, either wrap the row (`flex-wrap: wrap`) or horizontal-scroll with an edge mask fade — pick one per context. |
| **Filter pill rows** (Stories topics, Chapter regions) | Horizontal scroll with `mask-image` edge fade at narrow widths. The fade is the affordance — no scrollbar styling needed. Pills use `flex: none` so they never compress. |
| **Overlines / eyebrows** (`PRIMARY · SECONDARY`) | Wrap *between* `·`-separated segments, never mid-segment. Each segment is its own `white-space: nowrap` span; the row wraps as a unit. If a segment + adjacent count badge can't coexist on one row, the count gets `flex: none` and the eyebrow gets `flex: 1` with ellipsis. |
| **Bylines / metadata rows** (`Author · Date · Read time`) | Same rule as overlines — each `·` segment is a `nowrap` span so the row wraps cleanly without splitting a date or time across lines. |
| **Breadcrumbs** | At mobile, middle crumbs collapse to `…`. The current (final) crumb ellipsizes if it overflows. Never let a breadcrumb wrap to two lines. |
| **Avatar stack `+N more`** | `+N` text gets `flex: none` so the avatar row can compress without pushing the count onto its own line. |
| **Map / data overlays** | At narrow inline-sizes (≤520px), overlays reflow into a single horizontal pill row anchored at the bottom of the stage rather than a corner-anchored block. Compact mode shows dots + numbers only, no labels. |
| **Icon badges** (`TW`, `DC`, `CAL`, etc.) | Fixed 44×44px regardless of glyph length. 3-character glyphs auto-shrink type rather than expand the circle. |

### Breakpoints

| Breakpoint | Width | Used for |
|---|---|---|
| **Mobile** | 375px | Single column, hamburger nav, horizontal-scroll filter rows, stacked CTAs |
| **Tablet** | 1024px | 2-column grids, condensed nav, paired hero + meta layouts |
| **Desktop** | 1440px | Full multi-column layouts, sidebar + main, full-bleed heroes |

These are reference widths for design review and acceptance — *not* hard breakpoints. Because the system uses container queries, the actual reflow thresholds are component-local (e.g., a chapter card grid collapses to 1 column at `≤520px container width` regardless of viewport).

### Per-page reflow matrix

What each page does at the three reference widths. This is the acceptance contract for page builds.

| Page | Desktop (1440) | Tablet (1024) | Mobile (375) |
|---|---|---|---|
| **Home** | Hero with mycelial map left + node CTA right; Library bento at 4-up book covers; Stories grid 3-up; Podcast strip cover + body + timer inline | Map full-width; bento collapses to 2-col at `≤1100px` container width (Library card 3-up books); Stories 2-up | Map stacked; map overlay reflows to bottom pill row; hero CTAs `width: 100%`; podcast cover stacks above meta + timer; books grid 2-up; Stories 1-up; hero card chip ellipsizes |
| **Chapters** | Hero map + stats overlay; "Featured chapters" 3-up; full directory 3-col; Sister chapters 3-col | Map full-width; directory 2-col; Sister chapters 2-col | Map overlay → bottom pill row; directory and Sister chapters **collapse to 1-col at `≤520px`** (status chips and city titles need the room); region filter row wraps to 2 rows |
| **Chapter (detail)** | Hero photo + steward card side-by-side; events 2-col; Sister chapters 3-col | Hero stacks; events 2-col; Sister chapters 2-col | Hero stacks; events 1-col; Sister chapters 1-col; breadcrumb collapses middle crumbs to `…`; RSVP CTAs `width: 100%` |
| **Library** | Editorial hero + 4-up book rail; Knowledge Garden 3-col; podcast list inline | Book rail 3-up; Knowledge Garden 2-col | Hero stacks; book rail horizontal scroll with edge fade; Knowledge Garden 1-col; podcast list cover stacks above meta |
| **Stories** | Side-by-side featured + grid 3-up; filter pills + selects inline | Featured 1-up above grid 2-up | Featured + grid all 1-col; **filter pill row → horizontal scroll with edge mask**; selects stack |
| **Story (detail)** | Hero photo full-bleed + article column 720px max; share rail floats right | Article full-width; share rail moves inline below title | Article full-width; share chips wrap row; breadcrumb collapses middle to `…`; "More from" ghost buttons `width: 100%` |
| **Guild** | Mandate hero + diagram side-by-side; member grid 4-up; events 2-col | Hero stacks; member grid 3-up; events 2-col | Hero stacks; member grid 2-up; events 1-col; "View on GitHub" + "Add to calendar" `width: 100%`; project meta wraps cleanly via nowrap segments |
| **Garden** | Steps in vertical rhythm with side illustrations; chat mockup card inline | Same vertical rhythm; illustrations scale down | Steps fully stacked; assessment chip rows wrap to multiple lines; calendar tiles must meet **44×44px touch target** |

### Mobile touch targets

All interactive elements must hit **44×44px minimum** at mobile. This applies to:

- Buttons (primary and ghost) — minimum 48px height, already meets target
- Chips and filter pills — minimum 30px height at desktop; **must scale up to 44px at mobile**
- Calendar tiles in Garden Step 04
- Avatars used as links
- Icon badges

The pill / chip default sizes are calibrated for desktop. When porting components, add a mobile-breakpoint rule that bumps interactive chip heights to 44px.

### What doesn't reflow

A few things stay constant across all breakpoints — note these so they're not "fixed" by mistake:

- **Type families** never change at mobile — Spectral stays Spectral, Manrope stays Manrope. No mobile-only font swaps.
- **Type sizes** scale down only at the display level (`headline-display` may drop from 72 → 48px at mobile; `headline-lg` may drop from 56 → 36px). Body, label, and overline sizes hold steady.
- **Color tokens** are identical across all breakpoints. No mobile-only color overrides.
- **Spacing scale** is identical across all breakpoints. The same `spacing.lg` (24px) gap works at mobile and desktop — what changes is the *gap token chosen*, not the value behind it.

---

## Elevation & Depth

The site favors **tonal layers over heavy shadows**. Hierarchy is conveyed primarily by stepping up the green scale (`bg` → `surface` → `card` → `card-elev`) rather than by drop-shadow.

Shadows are reserved for three specific moments:

- **`shadow-card`** — Soft 8px shadow under floating cards. Includes a 1px white inset (4% opacity) for a subtle top edge.
- **`shadow-card-lg`** — 16px shadow + brighter inset, for elevated / hover states on cards.
- **`shadow-pill`** — The signature lime glow on primary buttons: `0 0 32px rgba(184, 232, 53, 0.35), 0 0 80px rgba(184, 232, 53, 0.15)`. This is the *only* place glow effects are used; it's what makes a primary action read as alive.
- **`shadow-deep`** — A directional shadow (`-7px 7px 28px`) for the map hero and similar "stage" treatments. Use sparingly.
- **`shadow-focus`** — 3px lime ring at 40% opacity. Applied to every `:focus-visible` interactive element. Do not override.

Cards should not stack shadows on hover. State changes are conveyed by stepping `card` → `card-elev`, not by deepening the shadow.

## Shapes

The shape language is **soft and organic** — pill-shaped interactives, generous radii on cards, no sharp corners anywhere in the UI.

- `rounded.sm` (6px) — Inputs that aren't pills, small badges, focus-ring rounding.
- `rounded.md` (12px) — Small cards, tooltips, dropdown menus.
- `rounded.lg` (20px) — Standard cards, chapter / story / library tiles.
- `rounded.xl` (32px) — Hero photos, large editorial surfaces, the map stage.
- `rounded.full` (9999px) — All buttons, all chips, all status pills, avatars, the email input.

The pill-everywhere convention is load-bearing for the brand's organic feel. **Do not** mix sharp 4px corners with the pill language; a single sharp-cornered button will read as foreign.

## Motion

Motion is **restrained and purposeful** — used to confirm intent, smooth state changes, and signal life on a small number of designated surfaces. Never used for decoration, never used to draw the eye.

### Duration tokens

| Token | Value | When to use |
|---|---|---|
| `motion.duration.instant` | 0ms | State changes that should not animate (focus ring application, disabled toggles) |
| `motion.duration.fast` | 120ms | Hover color shifts, link underlines, chip tone changes |
| `motion.duration.base` | 200ms | Card surface step (`card` → `card-elev`), button press shifts, dropdown open/close |
| `motion.duration.slow` | 400ms | Modal/overlay entrance, hero photo crossfades, page-level transitions |
| `motion.duration.pulse` | 2400ms | The mycelial map node pulse cycle (one full breath) |

### Easing tokens

| Token | Value | When to use |
|---|---|---|
| `motion.ease.standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default for all hover, focus, and color transitions |
| `motion.ease.emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Card hover lifts, modal entrance — when the motion should feel decisive |
| `motion.ease.entrance` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering view (loading skeletons revealing content) |
| `motion.ease.exit` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving view (modal dismissal, dropdown close) |

### Where motion is allowed

- **Hover / focus on interactive elements** — color and background transitions at `fast / standard`. The lime pill glow on primary buttons is steady, not animated.
- **Card hover** — surface tone shift (`card` → `card-elev`) at `base / emphasized`. No translate, no scale, no shadow stack.
- **Filter chip tone change** — at `fast / standard`.
- **Modal / dropdown / mobile nav slide-down** — at `base / emphasized` (open) and `fast / exit` (close).
- **Mycelial map node pulse** — `pulse` duration, infinite loop, opacity oscillation only (no scale). Pulse is the *only* idle/infinite animation in the system.
- **Page transitions** — none by default. Astro's native page navigation behavior is preserved.

### Where motion is forbidden

- No scale-down or translate-down on button press. The color shift *is* the press affordance.
- No animated entrance for static content on page load. Content appears instantly when ready.
- No scroll-triggered animations (parallax, fade-in-on-scroll, etc.). The site is a reading surface.
- No looping animations beyond the map pulse.
- No animation on text — no typewriter, no count-up, no character reveal.

### Reduced motion

`@media (prefers-reduced-motion: reduce)` is honored globally — all transitions and animations drop to 1ms (effectively instant). This is already wired in `gp-tokens.css` and must not be overridden.

## Components

The component vocabulary is small and reused across all eight pages. The full visual contract lives in `Components (Hi-Fi).html`; below are the prose contracts.

### Buttons

- **`button-primary`** — Pill, lime fill, deep-forest text, carries the signature pill glow shadow. Used *once per screen* for the primary action. Hover lightens to `lime-400`; active darkens to `lime-600`. No transform on press — the color shift *is* the press affordance.
- **`button-ghost`** — Transparent pill with a hairline `border` outline. Hover fills `green-800` and shifts text to `lime-400`. Use for secondary actions; multiple ghost buttons can co-exist on a screen.
- **Inline arrow link** — Text link with a trailing → arrow. Default lime; gold variant available for editorial / mono contexts. Use for "Read more" / "Browse all" affordances inside cards.

### Chips & Status

- **`chip`** (variants: `outline`, `soft-lime`, `soft-gold`, `fill-lime` / active) — The unified pill chip. Sizes `sm` (22px), `md` (30px), `lg` (36px). Set `mono` for uppercase technical chips (IRL, ENG, etc).
- **`status-chip-primary`** — Lime dot + label, for "Active" / "Live" states.
- **`status-chip-secondary`** — Gold dot + label, for "Forming" / "Upcoming" / "Pending".
- **Filter chip with count** — Used in the chapter directory. Two kinds: single-select (region) and multi-select (status, with a checkbox). Active state fills with soft lime and a lime border.

### Inputs

- **`input-pill`** — The single input atom. Pill-shaped, transparent `green-900` fill, hairline border. Focus ring is `shadow-focus` (3px lime at 40%). Used for newsletter signup and the Garden contributor email capture.
- **Select pill** — Visual-only "Label: Value ▾" affordance for inline filters in the Stories feed. Not a real `<select>`.

### Cards

- **`card`** — Standard surface, `card` background, 20px radius, 24px padding. Used for chapter cards, story cards, library resources.
- **`card-elevated`** — `card-elev` background, 32px padding. Used for featured / hero content where extra weight is needed.

Cards never use horizontal scroll-snap rails by default — use a real grid with `gap: spacing.xl`. Rails (book covers, podcast tiles) are the exception and use the `GP_RailArrows` control.

### Chrome

- **`header`** — Logo lockup left, primary nav right. Active item gets a lime underline. Mobile collapses to a hamburger with a slide-down nav overlay (max 320px tall). Nav items live in a single constant — never inline them in pages.
- **`footer`** — Four-column layout (Network / Get involved / Resources / Connect) with a right-rail wordmark + tagline. Set `showWordmark` for the editorial direction that centers the wordmark above the columns.
- **Breadcrumb** — Back-link + slash-separated trail. Used on Chapter / Story / Guild detail pages. Last crumb is the current page and is not linked.

### Avatars

- **`avatar`** — Initials in a `green-700` disc with a soft gold inner glow. Sizes 32 / 48 / 56 / 72 / 96. First two initials of the name only.
- **Avatar stack** — Overlapped avatars + "+N more" indicator. For steward strips, guild rosters, contributor previews.

### Imagery placeholders

- **Image placeholder** — `green-800` surface with topo wash + faint gold radial sheen + mono corner label. Use anywhere real photography is missing; do *not* substitute with stock or AI-generated imagery.
- **Hero photo placeholder** — Topographic wash + warm radial gradient + optional scrim. Used by Story / Chapter / Guild detail heroes.

## Form Patterns

Forms are sparse across the site — newsletter signup, chapter applications, contributor pledges, story comments — but every one follows the same shape so users learn it once.

### Form atom layout

A form field is a vertical stack:

1. **Label** — `label-md` (Manrope 14px / weight 600 / letter-spacing 0.01em), color `fg`. Required fields append a single asterisk in `error` color, no other decoration.
2. **Input** — the `input-pill` component (or appropriate variant). 8px gap below the label.
3. **Helper text** *(optional)* — `caption` (12px), color `fg-dim`. 4px gap below the input. Replaced by error or success text when those states apply.

Labels are always above the input. Floating / placeholder-as-label patterns are forbidden — they fail accessibility and read as cheap.

### Input states

| State | Treatment |
|---|---|
| **Default** | `border` color, `green-900` fill, `fg` text |
| **Focus** | Border shifts to `primary` (lime), `shadow-focus` ring applied |
| **Filled** | Same as default — no visual distinction |
| **Error** | Border shifts to `error` (terracotta), helper text replaced with error message in `error` color |
| **Success** | Optional trailing lime check icon inside the pill, right-aligned. Border stays `border` (no green border — too noisy) |
| **Disabled** | 50% opacity, `cursor: not-allowed`, no hover state |
| **Submitting** | Input becomes read-only during submission; not visually distinct |

### Validation timing

- Validate **on blur**, not on every keystroke. Typing should never produce a red border.
- Server-side errors surface inline on the affected field, plus a form-level error banner above the submit button if the error isn't field-specific.
- Success states are subtle — a small check icon, not a green wash.

### Submit button

- Always a single `button-primary`. No "Cancel" pair — if the form needs cancellation, it's a route-level concern (back link, modal close).
- On mobile, submit is `width: 100%`.
- **Submitting state** — button text changes to a present-progressive verb ("Subscribing…", "Submitting…", "Sending…"). No spinner inside the button — the text change is the affordance. Button is disabled but retains its lime fill.
- **Success state** — replace the entire form with a success card (see *State Patterns* below). Do not keep the form visible with a check mark.

### Field types covered by the system

The HiFi covers email (newsletter, garden), single-select pills (Garden assessment, Story filters), multi-line text (Story comments, Chapter application). Other types — file upload, date pickers, signature, multi-step forms — are **not designed**. Flag and ask before implementing.

## State Patterns

The HiFi mockups show the happy path. These are the rules for the other states every page will encounter.

### Loading

- Use a **skeleton matching the final content shape** — card outlines, line lengths, image aspect ratios. Skeletons sit on the same surface tone as the real content (`card`, not bg).
- Skeleton fill is `surface` tone with the `gp-topo` background utility at 30% opacity. No shimmer animation by default — too noisy for a reading surface.
- A subtle 1.2s opacity pulse (`0.6 → 1.0 → 0.6`) is permitted on the topographic wash *only*, never on the skeleton edges. Honors reduced-motion.
- Skeletons reveal content with a `fast / entrance` opacity transition — the skeleton fades, the real content fades in.
- For above-the-fold critical content (hero headlines, first paragraph), prefer SSR over skeleton. Skeletons are for below-the-fold and API-driven sections.

### Empty

An empty state is a *small composition* inside the surface that would otherwise hold content — not a separate page. Three elements, always in this order:

1. **Placeholder visual** — a small `GP_PlaceImg` (or topographic icon) at the top, 96–160px square.
2. **Headline** — `headline-sm` (Spectral 28px), one short sentence. Voice is matter-of-fact, never apologetic. "No stories yet from this chapter." Not "Oops! No stories here."
3. **Body** — one supporting sentence in `body-md`. What the user can do or expect.
4. **Optional CTA** — single `button-ghost` (not primary — empty states rarely warrant the primary slot). E.g., "Browse all stories →".

Empty states sit inside a `card` or `card-elevated` surface, never on the raw page bg. Centered, 32px padding minimum.

### Error

Error states share the empty-state composition with three differences:

- 1px `error` color border on the containing surface (subtle — not a red wash)
- Headline copy names the failure: "Couldn't load this section." / "Connection dropped."
- CTA is **"Try again"** — a `button-ghost` that re-fetches.

Errors are scoped to the affected section, not page-wide. A failed map fetch shouldn't blank the page; it should error the map and leave the rest functional.

For form-level errors that aren't tied to a specific field, surface a single horizontal banner above the submit button: `error` color top-border, `body-sm` copy, no icon.

### Success

Two forms:

- **Inline success** — a horizontal pill at the top of the form area: `success` (lime) background, `green-900` text, `label-md` typography, `rounded.full`, 8px vertical / 16px horizontal padding. Used for actions the user might repeat (saving a story, voting on a pledge).
- **Replacement success** — the entire form is replaced with a centered success card following the empty-state composition: small lime check visual, `headline-sm` confirmation ("You're subscribed."), one supporting sentence, optional ghost CTA ("Browse stories →" or "Back to home →"). Used for terminal actions (newsletter signup, chapter application submitted).

### Disabled

- 50% opacity on the entire element
- `cursor: not-allowed`
- No hover state — the element does not respond to the cursor
- Tooltip on hover (or focus) explaining *why* the action is disabled. Tooltips are not designed in the HiFi; use a simple `card-elevated` mini-card at `label-sm` size, positioned with 8px offset.

### Offline / connectivity

- A single bottom-fixed banner at `green-950` bg, `fg` text, `body-sm` size: "You're offline. Some content may not be current." Dismissible. No icon.
- Banner does not appear for transient network blips — debounce to 5s of confirmed offline state.

## Iconography

The system uses **almost no iconography**. Where icons would normally appear (nav, social, technical chips), the design substitutes short text labels — "TW", "DC", "FC" for social handles; uppercase mono chips like "IRL" and "ENG" for tags. This is intentional and load-bearing: the brand reads as editorial *because* it doesn't fall back on generic icons.

When a true icon is required (e.g., an arrow, a checkbox tick), it should be a simple geometric line form in 1.5px stroke weight, colored `fg` or `primary`. Never use filled or colored icons.

## Imagery & Asset Sourcing

Background imagery, logo treatment, and photography are **not authored in the design system** — they are lifted from the live greenpill.network site. The HiFi mockups define the slot; the live site provides the content. Specifically:

- **Topographic background textures** — Download from the live site into `public/backgrounds/`. Apply via the `.gp-topo` utility class (12% opacity, overlay blend mode).
- **Logo mark** — The HiFi header is wordmark-only as shipped; the live site uses a logo mark to the left of the wordmark. Default behavior on implementation is to restore the mark from the live site.
- **Photography** — Real chapter and story photos lifted from the live site, placed against the topographic backdrop, capped at 32px radius (`rounded.xl`).
- **Brand iconography** — Any branded glyphs from the live site that don't have HiFi equivalents are pulled in and replace generic substitutes.

## Do's and Don'ts

- **Do** reserve `primary` (lime) for the single most important action per screen.
- **Do** use Spectral *exclusively* for display + headline text, and Manrope *exclusively* for UI text.
- **Do** convey hierarchy by stepping the green scale (`bg` → `surface` → `card` → `card-elev`) before reaching for shadows.
- **Do** use container queries (`container-type: inline-size`) at every page root.
- **Do** apply the `shadow-focus` lime ring on every interactive element — do not override or remove it.
- **Do** match all radii to the `rounded` scale; pill (`rounded.full`) for all buttons, chips, inputs, and avatars.
- **Don't** introduce greys. The neutral surface is warm off-white; everything else steps the green scale.
- **Don't** use saturated red, blue, or purple. The only chromatic colors in the system are forest green, lime, gold, and earthy terracotta (for `error`).
- **Don't** mix sharp 4px corners with the pill language anywhere in the UI.
- **Don't** stack multiple shadows on hover; transition between `card` and `card-elev` instead.
- **Don't** use icons where a short mono label would communicate (TW / DC / FC / IRL / ENG, etc.).
- **Don't** use stock photography or AI-generated imagery. Use the `GP_PlaceImg` placeholder until real photography is supplied.
- **Don't** introduce pure white (`#FFFFFF`) or pure black (`#000000`). The warmest off-white in the system is `#FAF7EE`; the darkest green is `#0A2D21`.
- **Don't** stack more than two primary buttons in the same view — there is exactly one primary action per screen.
- **Don't** invent new tokens. If a value isn't in the YAML frontmatter, ask the design owner before introducing it.
- **Don't** let inline CTAs split text from their `→` arrow across lines. Use `white-space: nowrap` on the whole link.
- **Don't** let chips wrap internally. A wrapped pill is a broken pill — use `white-space: nowrap` on every chip body.
- **Don't** let overlines or bylines wrap mid-segment. Each `·`-separated segment is its own `nowrap` span; the row wraps as a unit.
- **Don't** use viewport media queries for reflow. Every page root uses `container-type: inline-size` and reflows respond to inline-size, not viewport width.
- **Don't** shrink interactive targets below 44×44px at mobile, even if the desktop component is smaller.
