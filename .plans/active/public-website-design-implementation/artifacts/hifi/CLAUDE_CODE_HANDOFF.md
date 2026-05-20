# Claude Code Handoff Guide — Greenpill Network

This doc is the bridge between the design package in this folder and the packages-first Greenpill Network repo. It is meant to be **read by you (the designer/PM) once**, then used to drive a sequence of focused prompts into Claude Code.

The mistake to avoid: dropping all nine HiFi pages on Claude Code in one message and saying "build this." That produces a soup of half-correct components, inconsistent tokens, and content that's hard-coded in the wrong layer. Instead, we want a **staged handoff** where each stage has a clear contract and a visual acceptance check.

**Two important framings to carry through every stage:**

1. **The HiFi is ~90% of the visual spec, not 100%.** The design system was built off the existing greenpill.network site, so it's already aligned — but it intentionally omits some things the live site does well that we want to keep: **background imagery / textures**, the **logo treatment** (the HiFi header is wordmark-only; the live site uses the logo mark, and we want to reconsider that), and likely a few other subtle environmental touches. See §3 (90/10 lift list) below for what to pull from the live site.

2. **Content first, code second.** Most of the copy in the HiFi pages is placeholder. The repo cleanup already moved the public content model into `packages/website/src/content`, `packages/website/src/content/config.ts`, and `packages/website/keystatic.config.ts`. Fill the public content gaps before token, component, or page implementation so layout work is grounded in real copy instead of invented placeholder lengths.

3. **Keep the design package where it is.** The HiFi package already lives in `.plans/active/public-website-design-implementation/artifacts/hifi/`. Do not copy it to `/design/`, and do not recreate a root `docs/` folder. Planning truth for this effort stays in `.plans/active/public-website-design-implementation`.

---

## 1. The stack contract (state this in every prompt)

| Layer | Tech | What lives here |
|---|---|---|
| Site shell | **Astro in `packages/website`** | Routing, layouts, page composition, SSG of static public pages |
| Public content | **Keystatic + Astro content in `packages/website`** | Marketing copy, chapter directory entries, library resources, stories, guild mandates — anything an editor should change through local file-backed authoring |
| Public/private contracts | **`packages/shared`** | Reusable payload normalization, public projections, and privacy-boundary helpers used by both website and agent |
| Private runtime | **`packages/agent` on Fly + Postgres** | Map-node intake, approved public projections, chapter impact cache, readiness checks, and private database access |
| Dynamic data | **Public agent routes** | Existing public routes include `/map/state`, `/public-counts`, `/map-nodes/public`, and `/impact/chapters/:slug`; never fetch private tables or expose `DATABASE_URL` from the public website |
| Styling | **Design tokens from `artifacts/hifi/hifi/gp-tokens.css`** | Port into `packages/website/src/styles/` as the website token layer, never hardcode values. Spectral is the approved brand/content font; preserve secondary token roles only where the HiFi requires them. |
| Components | **Astro components + scoped CSS in `packages/website/src/components`** | Treat `artifacts/hifi/hifi/*.jsx` as visual/behavior specs only, not production source |

---

## 2. Content domain map (the part Claude Code keeps getting wrong)

For each page, declare up front what gets sourced from where. Without this, Claude Code will hard-code everything as page props.

| Page | Public content source | Private runtime | Public API/runtime fetch |
|---|---|---|---|
| Home | `home-page`, `site-settings`, featured refs into `chapters`, `stories`, `resources`, `books`, `guilds`, `projects` | — | `/map/state` and `/public-counts` from `packages/agent`, using payload contracts from `packages/shared` |
| Chapters (directory) | `chapters-index`, `chapters`, `themes` | — | Optional public counts only; no private member data |
| Chapter (detail) | `chapters/[slug]`, public `people`, `themes`, related `stories` / `resources` | — | Optional `/impact/chapters/:slug` public impact cache |
| Library | `library`, `resources`, `books`, related `projects` / `guilds` | — | — (SSG unless a future public route is added) |
| Stories (feed) | `stories-index`, `stories`, `chapters`, `themes` | — | — (SSG) |
| Story (detail) | `stories/[slug]`, public author/person refs | — | — (SSG) |
| Guild | `guilds/[slug]`, public `people`, related `projects` / `resources` | No member-only content or applications in this pass | — unless a future public activity route is planned through `packages/shared` first |
| Garden | `garden` singleton rendered at new public route `/garden` | No pledge state or authenticated contributor state in this pass | — unless a future public-only route is planned through `packages/shared` first |
| Components (HiFi) | — | — | — (not a real route; design reference only) |

**Rule of thumb for Claude Code**:
- Anything an editor would want to edit weekly → Keystatic.
- Anything tied to a logged-in identity, applications, review notes, raw submissions, or per-user state → private runtime only, out of scope for the logged-out public website pass.
- Anything that must be fresh on every page load and isn't user-specific → public `packages/agent` route, with reusable payload/projection code in `packages/shared` when the website depends on it.

---

## 3. The 90/10 lift list (what to pull from greenpill.network)

The HiFi is the visual contract for layout, type, color, components, and interaction. These specific things are **not** in the HiFi and should be lifted from the live site:

| What | Where it's used | Notes |
|---|---|---|
| **Background imagery / textures** | Page backgrounds, section backgrounds, hero environments | The live site has organic/topographic background treatments that aren't reproduced in the HiFi. Store approved assets under `packages/website/public/backgrounds/` and reference them from the appropriate page sections. Don't try to re-render them as CSS — use the existing image assets. |
| **Logo mark** | Header (currently wordmark-only in HiFi), favicon, OG images | Decide with the design owner whether the header keeps the wordmark-only treatment from the HiFi or restores the mark from the live site. Default: bring the mark in and place it left of the wordmark in the header. |
| **Photography** | Story cards, chapter cards, library resource thumbnails | Lift real images from greenpill.network where they exist; placeholder accordingly where they don't. |
| **Brand iconography** | Anywhere the HiFi uses generic icons that the live site has branded equivalents for | Spot-check and replace. |

For each of these, the rule is: **HiFi defines the slot, the live site provides the content of the slot.** Don't invent new background treatments or icon styles.

---

## 4. Staged handoff plan

Run these as **separate Claude Code sessions or distinct prompts within one session**. Wait for each to land cleanly before starting the next.

### Stage 0 — Orientation (no code)
Goal: Claude Code reads the design package and the existing repo, then *writes back a plan*. Do not let it touch code yet.

### Stage 1 — Public content gap pass

This is the stage that flips the usual order, and it's deliberate. The schema foundation already exists after the repo cleanup and Schema Delta Pass, so this stage is a gap pass over the current public content, not a fresh CMS/Postgres design exercise. Do this before token, component, or page implementation because real content length and density will affect layout decisions.

Goal, in three sub-steps:

**1a. Content audit of current public content.** Claude Code inventories `packages/website/src/content` against the HiFi pages and, only where useful, the live greenpill.network site. If a written audit artifact is needed, put it under `.plans/active/public-website-design-implementation/research/content-inventory.md`, not a root `/design/` or `docs/` path.

**1b. Schema gap review.** Review `packages/website/src/content/config.ts` and `packages/website/keystatic.config.ts` for missing public fields only. Runtime contracts that code depends on belong in `packages/shared`. Private database changes belong in `packages/agent/migrations` and should not be added from this visual implementation prompt unless a future plan explicitly scopes that work.

**1c. Seed missing public content only.** Populate missing Keystatic/Astro content entries with real public copy, not samples. Do not seed private member records, applications, review notes, pending submissions, raw upstream feedback, or database credentials into the website package.

**Acceptance:**
- The public content inventory or gap notes live under `.plans/active/public-website-design-implementation/research/` if a standalone artifact is needed.
- Keystatic admin UI shows the current public collections and singletons from `packages/website/keystatic.config.ts`.
- Any public schema edits are in `packages/website/src/content/config.ts` and `packages/website/keystatic.config.ts`; any reusable runtime contract edits are in `packages/shared`.
- Background images, logo, and photography from §3's lift list are in `packages/website/public/` and referenced from the appropriate public content entries.

### Stage 2 — Tokens + global styles
Goal: `gp-tokens.css` ported into the Astro project as the global theme. Type ramp, color palette, spacing, radii, shadows all available as CSS custom properties. Spectral is the approved font and should be wired through the existing website font-loading approach or a self-hosted equivalent. Do not add font packages without approval. Preserve secondary fallback token roles only if the HiFi still depends on them, and document that decision before implementation.

**Acceptance:** A throwaway `/_tokens` page in the Astro app renders the type scale and color swatches and visually matches `Components (Hi-Fi).html` section-for-section using real content samples where useful.

### Stage 3 — Shell components
Goal: Header, footer, container, Button, Card, Pill/Tag, Overline, type atoms (Display, H1-H3, Title, Body, Meta), and the basic page chrome. Use the Stage 1 real content inventory for stress cases, but do not build full pages yet.

**Acceptance:** A `/_kit` route that renders the relevant sections of `Components (Hi-Fi).html` using the ported components. Side-by-side visual review against `Components (Hi-Fi).html?raw`.

### Stage 4 — Page implementations (in priority order)
1. **Home** — most architecturally interesting (map + bento + Keystatic refs + API). Doing this first surfaces every integration concern.
2. **Chapters (directory)** — simplest Keystatic-driven list page; validates the collection wiring.
3. **Chapter (detail)** — dynamic route from Keystatic + first API integration.
4. **Library** — second collection list page; confirms the Card pattern generalises.
5. **Stories** + **Story** — together; same pattern as Library but article-shaped.
6. **Guild** — public guild page only; no member-only applications or private activity.
7. **Garden** — new `/garden` route backed by the `garden` singleton; no pledge state or authenticated contributor state.

Each page is one prompt. Each ends with a visual acceptance check against the corresponding `*-Hi-Fi.html?raw` view at 1440 / 1024 / 375.

### Stage 5 — API integration
Goal: Replace placeholder public data on Home and Chapter pages with real fetches against public `packages/agent` routes. Define a typed client in `packages/website/src/lib/api.ts` if needed, using public payload shapes from `packages/shared`. Do not add root `src/` helpers, root API routes, or website-side database access.

### Stage 6 — Private / workspace surfaces
Goal: Auth-gated routes for guild members, steward dashboards, contributor state. This is **out of scope of the current design package and the public website implementation pass** — the HiFi covers logged-out reader only. Flag this clearly and design the gated states separately before building, likely against `packages/workspace` / private service boundaries rather than the static public website.

---

## 5. The first prompt to paste into Claude Code

Use this verbatim as the opening message of a new Claude Code session. It's intentionally a **planning prompt, not a build prompt**.

````markdown
You're implementing the Greenpill Network site. Two things to read before writing any code:

1. **Design package** at `<path to this design folder>` — start with `HANDOFF.md`, then open `Components (Hi-Fi).html?raw` in a browser to see the design system rendered, then skim the other `*(Hi-Fi).html` files at `?raw` to understand each page.
2. **`CLAUDE_CODE_HANDOFF.md`** in the same folder — that's the implementation playbook (stack contract, content domain map, staged plan).

Then read the existing repo:
- Root `package.json` — workspace scripts; run installs and validation from the repo root.
- `packages/website/package.json`, `packages/website/astro.config.mjs`, `packages/website/tsconfig.json`, and `packages/website/keystatic.config.ts` — public website wiring.
- `packages/website/src/` — current layouts, components, pages, content, scripts, and styles.
- `packages/shared/src/` — public/private payload contracts and privacy-boundary helpers.
- `packages/agent/src/` — existing public route surfaces and private runtime boundaries.
- `.plans/active/public-website-design-implementation/{handoffs/README.md,spec.md,plan.todo.md,status.json}` — active planning truth.

For context on the existing brand, content, and assets, you can browse https://greenpill.network — **use it only as a source of real copy, imagery, and the chapter list**, not as a UI to replicate. The HiFi mockups in the design package are the visual contract, not the live site.

**Do not write any code yet.** Reply with:

1. A short summary of what's already scaffolded in the repo (3–6 bullets).
2. Anything in `CLAUDE_CODE_HANDOFF.md`'s staged plan that conflicts with the existing scaffolding, and how you'd resolve it.
3. Your proposed order of operations for Stage 1 (public content gap pass) — which current `packages/website/src/content` collections/singletons need filling first, which HiFi pages stress their layout, where any inventory notes belong, and which fields are missing from the existing public schemas.
4. Any clarifying questions for me before you start.

Once I approve the plan, we'll do Stage 1 as one focused change, validate from the repo root with `bun run plans:validate` and `bun run build`, then move through tokens, components, and pages one stage at a time.
````

---

## 6. Per-stage prompt templates

After Stage 0 lands, use these. Each is short on purpose — the design files and `CLAUDE_CODE_HANDOFF.md` carry the detail.

**Stage 1a — Content audit**
> Audit `packages/website/src/content` against the HiFi pages and the live public site where useful. If a standalone artifact is needed, produce `.plans/active/public-website-design-implementation/research/content-inventory.md`. One section per page / collection, real public copy, image notes per entry, and explicit gaps. Put approved background images, logo mark, and per-entry photography under `packages/website/public/` (organize sensibly). Don't touch page implementation code yet. Show me the inventory or gap notes when done.

**Stage 1b — Schema**
> Review the existing public schemas in `packages/website/src/content/config.ts` and `packages/website/keystatic.config.ts` against Stage 1a. Patch only missing public fields needed by the HiFi. If a reusable payload/projection contract is required by website and agent code, put it in `packages/shared`. Do not add Postgres tables or private fields from this visual handoff unless a separate plan explicitly scopes that work. Show me the schema diff before any seeding.

**Stage 1c — Seed**
> Populate missing public Keystatic/Astro content from the inventory. Real public content, not samples. Do not seed private member state, applications, review notes, pending submissions, raw upstream feedback, or database credentials. Verify in the Keystatic admin UI that the edited public collection lists and detail entries match the inventory.

**Stage 2 — Tokens**
> Implement Stage 2 from `CLAUDE_CODE_HANDOFF.md`: port `.plans/active/public-website-design-implementation/artifacts/hifi/hifi/gp-tokens.css` into `packages/website/src/styles/`, wire Spectral through the existing website font-loading approach without adding dependencies unless approved, and create `packages/website/src/pages/_tokens.astro` as a temporary review page that renders the type scale and color swatches matching the Foundations section of `Components (Hi-Fi).html`. Preserve secondary font token roles only if the HiFi still needs them, and show me the file diff before committing.

**Stage 3 — Components**
> Implement Stage 3: port the shell + atoms + primitives shown on `Components (Hi-Fi).html` (Header, Footer, Container, Button, Card, Pill, Overline, type atoms) into `packages/website/src/components`. Build `packages/website/src/pages/_kit.astro` as a temporary review route that mirrors that page section-by-section and includes real-content stress cases from Stage 1. Reference the JSX in `.plans/active/public-website-design-implementation/artifacts/hifi/hifi/comp-*.jsx` and `gp-shell.jsx` for behavior and structure, but write idiomatic Astro components — do not copy JSX patterns literally.

**Stage 4 — Page (template, swap the name)**
> Implement the **Home** page per `Home (Hi-Fi).html?raw`. Source data per the content domain map row for Home. The mycelial map is the visually load-bearing element — preserve its layout and node treatment exactly; the JS pulse animation can be reimplemented idiomatically. After build, take screenshots at 1440 / 1024 / 375 and compare to the HiFi.

**Stage 5 — API**
> Wire the public API integrations called out in the content domain map. Define a typed client in `packages/website/src/lib/api.ts` if needed. Start with the `packages/agent` public `/map/state` route consumed by Home and payload contracts from `packages/shared`; do not create root `src/` helpers or expose private agent/database fields to the browser bundle.

---

## 7. Things to tell Claude Code *not* to do

- Don't invent design tokens. If a value isn't in `gp-tokens.css`, ask.
- Don't invent background treatments or icon styles. Lift from the live site per §3.
- Don't seed Keystatic with lorem-style placeholders — always pull from the Stage 1 content inventory.
- Don't build tokens, components, or pages before Stage 1 is complete. Real content shape informs layout decisions.
- Don't ship the gallery/frame wrappers from the mockups — those are dev chrome.
- Don't copy JSX-in-browser patterns (the `<App>` + `?raw` branch). Astro pages don't need that.
- Don't build member-only / gated states yet — those aren't designed.
- Don't hard-code chapter, story, or resource content into Astro pages — that goes through Keystatic.
- Don't bypass the token layer to match a screenshot pixel-perfectly — if something looks off, fix the token, not the consumer.
- Don't treat the prototype JSX in `artifacts/hifi/hifi/` as production source. It is a reference for structure, state, and visual details only.
- Don't recreate root `docs/`, root `/design/`, or root `src/` paths for this work.
- Don't expose private node-intake fields, review notes, pending submissions, raw upstream feedback, or database credentials in public content, generated JSON, browser bundles, or website API clients.

---

## 8. What to do *with* the existing site (greenpill.network)

The live site is the source of:

1. **Real public copy gaps** — marketing, chapter writeups, story bodies, library descriptions, guild mandates, garden onboarding. Compare against current `packages/website/src/content` first, then capture gaps in Stage 1a's inventory or notes.
2. **The 90/10 visual lift list in §3** — background imagery, logo mark, photography, brand icons.
3. **The real chapter / story / resource list** — actual counts and names, not invented samples.

Everything else — layout, type, color, component structure, interaction patterns — comes from the HiFi package, not the live site.

---

## 9. Component naming + porting contract

When porting the JSX specs in `artifacts/hifi/hifi/*.jsx` into Astro components, follow these conventions so every page imports the same surface and Claude/Codex don't reinvent the API per page.

### Naming

| JSX spec name | Astro component name | Notes |
|---|---|---|
| `GP_Header` | `<SiteHeader />` | Single instance, accepts `activeNav` prop |
| `GP_Footer` | `<SiteFooter />` | Accepts `showWordmark` boolean |
| `GP_Breadcrumb` | `<Breadcrumb />` | `back` and `crumbs` props |
| `GP_PrimaryButton` | `<Button variant="primary">` | Single Button component, variant prop |
| `GP_GhostButton` | `<Button variant="ghost">` | Same |
| `GP_ArrowLink` | `<ArrowLink />` | Accepts `size`, `color` |
| `GP_RailArrows` | `<RailArrows />` | `onPrev`, `onNext` |
| `GP_StatusChip` | `<StatusChip tone="primary\|secondary">` | |
| `GP_Chip` | `<Chip tone="outline\|soft-lime\|soft-gold\|fill-lime">` | `size`, `mono`, `active` |
| `GP_Meta` | `<Meta items={[...]} />` | `size`, `color`, `accentIndex` |
| `GP_Avatar` | `<Avatar />` | `size`, `name` |
| `GP_AvatarStack` | `<AvatarStack />` | `count`, `extra`, `size` |
| `GP_LinkRow` | `<LinkRow />` | Glyph + label + sub + handle |
| `GP_PlaceImg` | `<ImagePlaceholder />` | `label`, `h`, `ratio` |
| Email input (inline in spec) | `<EmailInput />` | Standalone atom, used in newsletter / Garden |

Page-specific bits (`ChFilterPill`, `StFilterBar`, `SdShareSaveButtons`, etc.) follow the same pattern: drop the page prefix, switch to PascalCase, expose the same props.

### File structure

```
packages/website/src/
├── components/
│   ├── ui/                  ← atoms + primitives (Button, Chip, Avatar, ImagePlaceholder, …)
│   ├── chrome/              ← SiteHeader, SiteFooter, Breadcrumb
│   ├── page-sections/       ← page-specific composed sections (HomeMap, StoryHero, ChapterDirectory, …)
│   └── content/             ← rich-text renderers, Markdown components for Keystatic body content
├── layouts/
│   └── BaseLayout.astro     ← html shell, head, fonts, gp-tokens.css, SiteHeader/SiteFooter
├── pages/
│   ├── index.astro          ← Home
│   ├── chapters/index.astro ← directory
│   ├── chapters/[slug].astro
│   ├── library/index.astro
│   ├── stories/index.astro
│   ├── stories/[slug].astro
│   ├── guilds/[slug].astro
│   ├── garden.astro         ← Garden
│   └── map/edit.astro       ← Submitted-node edit flow
├── lib/
│   ├── api.ts               ← typed API client (Stage 5)
│   └── content.ts           ← Keystatic helpers
└── styles/
    └── tokens.css           ← ported from artifacts/hifi/hifi/gp-tokens.css
```

`/garden` is the public onboarding route for the Garden HiFi page. Do not restore the retired standalone onboarding route, the former join route, a root guild directory, or project index/detail pages. Guild navigation should link directly to Dev Guild and Writers Guild detail pages, and Green Goods should stay a Dev Guild proof/reference plus Library link.

### Prop conventions

- **`variant`** for tone (`primary` / `ghost` / `outline` / `soft-lime` / `soft-gold`).
- **`size`** for sizing (`sm` / `md` / `lg`), using the design system's named scale.
- **`as`** prop on Button + ArrowLink to render as `<a>` or `<button>` without changing styling.
- All components accept and forward `class` (Astro) / `className` (if React island) so consumers can extend.
- Components do **not** accept inline `style` props as their primary customization API. If a one-off override is needed, wrap in a `<div class="...">` and target.
- Interactive components (Button, Chip, EmailInput) forward all native HTML attributes via `...rest`.

### Astro vs React islands

- Default to **Astro components** (`.astro`). They're SSR-only, zero JS, fastest.
- Use **React (or your framework of choice) islands** only when interactivity requires it: the mycelial map, the filter bar with live filtering, the email form's success state.
- Mark islands explicitly with `client:visible` for below-the-fold interactivity, `client:load` only for above-the-fold critical interactions.

### Token consumption

All components reference `gp-tokens.css` custom properties — never inline hex codes or pixel values. A component that hardcodes `#B8E835` is a bug.

---

## 10. Analytics events

Analytics aren't designed in the HiFi but should be instrumented from day one. The naming convention and required-events list below give Codex/Claude enough to wire event hooks during the page build, not retrofit later.

### Event naming

- Format: `noun_verb`, all lowercase, snake_case. E.g., `chapter_view`, `story_share`, `newsletter_subscribe_succeed`.
- Three-tier verb for state machines: `_attempt` → `_succeed` / `_fail`. Always instrument all three for any form.
- No PII in event names or payloads. Email addresses, names, etc. are off-limits.

### Required events per page

| Page | Events |
|---|---|
| All pages | `page_view` (auto), `nav_click {target}`, `footer_link_click {target}` |
| Home | `hero_cta_click {cta_id}`, `map_node_click {chapter_slug}`, `featured_story_click {story_slug}`, `featured_chapter_click {chapter_slug}` |
| Chapters | `chapter_filter_change {filter, value}`, `chapter_card_click {chapter_slug}`, `chapter_apply_click` |
| Chapter (detail) | `chapter_rsvp_attempt {event_id}`, `chapter_rsvp_succeed`, `chapter_link_click {link_type}` |
| Library | `library_filter_change {filter, value}`, `library_resource_click {resource_slug}`, `library_book_click {book_id}` |
| Stories | `story_filter_change {filter, value}`, `story_card_click {story_slug}` |
| Story (detail) | `story_share_click {channel}`, `story_save_click`, `story_read_complete` (fired at 90% scroll) |
| Guild | `guild_join_attempt`, `guild_join_succeed`, `guild_link_click {link_type}` |
| Garden | `garden_step_complete {step_index}`, `garden_assessment_select {topic}`, `garden_submit_attempt`, `garden_submit_succeed` |
| Newsletter (global) | `newsletter_subscribe_attempt`, `newsletter_subscribe_succeed`, `newsletter_subscribe_fail {reason}` |

### User properties

- `anonymous_id` (cookie) — always set
- `locale` (browser) — always set
- `referrer_source` — first-touch attribution (utm_source if present, else referrer host)
- `member_id` — only when authenticated (Stage 6)

### Implementation note

Decide on the analytics provider (Plausible / PostHog / Umami / GA4) before Stage 4 so the event hooks aren't wrapped in an abstraction that has to be ripped out later. Lightweight, cookieless options (Plausible, Umami) align best with the brand voice.

---

## 11. SEO, meta, and OG

Every page renders the same `<head>` shape via a shared layout, populated from Keystatic entry fields (or sensible defaults for index pages).

### Title pattern

- Page title — `"{Page name} — Greenpill Network"`
- Home — `"Greenpill Network — A CoordiNation of Regenerators"` (no suffix duplication)
- Detail pages — `"{Entry title} — {Collection} — Greenpill Network"` (e.g., `"Reforesting the Amazon — Stories — Greenpill Network"`)

### Required meta tags

Every page MUST include:

- `<title>`
- `<meta name="description">` — 150–160 chars, written per entry in Keystatic (`seo.description` in the current public schemas)
- `<link rel="canonical">`
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta property="og:image">` — see OG image strategy below
- `<meta property="og:type">` — `website` for index pages, `article` for stories, `profile` for chapter / guild pages
- `<meta property="og:url">`
- `<meta name="twitter:card" content="summary_large_image">`
- `<meta name="twitter:site" content="@greenpill">`

### OG image strategy

- Each Keystatic entry has an optional `ogImage` field. If set, use it.
- If not set, fall back to a per-collection default (`/og/chapter-default.png`, `/og/story-default.png`, etc.) — produced as static PNGs at 1200×630.
- Index / marketing pages use `/og/greenpill-default.png`.
- Long-term: generate OG images dynamically only after a separate dependency decision, using the entry's title + chapter name + a topographic backdrop. Not required for launch, but the schema field should exist.

### Structured data

Every page emits JSON-LD in `<head>`:

- All pages — `Organization` schema with the Greenpill Network info
- Home + index pages — `WebSite` schema with `SearchAction` if a global search exists
- Story detail — `Article` schema (`headline`, `author`, `datePublished`, `image`)
- Chapter detail — `Organization` (sub-organization) schema if the chapter is treated as an entity
- Chapter events — `Event` schema per upcoming public event if events become part of the public content model

### Sitemap + robots

- Sitemap support should be checked against the current `packages/website` dependencies before implementation. Do not add `@astrojs/sitemap` or another dependency without approval. Exclude `/_tokens`, `/_kit`, and any draft Keystatic entries from whatever sitemap path is used.
- `robots.txt` allows all crawlers in production, blocks all in preview / dev environments (driven by `import.meta.env.PROD`).

---

## 12. Optional: split the work between Codex and Claude Code

The staged plan splits cleanly along agent strengths. If you want to run a two-agent workflow:

**Codex owns Stages 0–3** — the public foundation half:
- Stage 0: orientation + plan
- Stage 1a: current public content inventory / gap pass
- Stage 1b: public Keystatic/Astro schema gap review
- Stage 1c: seed missing public content; no private Postgres stubs
- Stage 2: tokens + global styles wired into Astro, with Spectral as the approved font decision
- Stage 3: shell + atom components (Header, Footer, Container, Button, Card, type atoms)

This phase is mostly structured data work, public schema review, content extraction, and disciplined token/component porting — well-suited to Codex.

**Claude Code owns Stages 4–6** — the visual translation half:
- Stage 4: page implementations against the HiFi mockups, in priority order
- Stage 5: public API integration on Home + Chapter detail
- Stage 6: design + build for member-only / gated surfaces only after a separate design follow-on

This phase is heavy on visual fidelity, component composition, and matching the HiFi exactly at 1440 / 1024 / 375 — well-suited to Claude.

### Handoff contract between the two agents

When Codex finishes its phase, it should produce a single `.plans/active/public-website-design-implementation/handoffs/HANDOFF_TO_CLAUDE.md` with:

1. **What's wired:** Astro setup, font loading, token file location, Keystatic config path, public agent base URL assumptions, and shared public contract paths.
2. **What's seeded:** every public Keystatic/Astro collection with entry counts and any intentional empty public collections.
3. **Component inventory:** every shell/atom component built in Stage 3, with file path and the section of `Components (Hi-Fi).html` it maps to.
4. **Open questions:** any decisions Codex made that Claude should sanity-check against the HiFi (e.g. "used wordmark-only in header per HiFi — confirm before page builds").
5. **Known gaps:** anything from §3's 90/10 lift list that wasn't resolvable from the live site (e.g. missing photography for a specific chapter).

Claude Code's first prompt then becomes: *"Read `HANDOFF.md`, `CLAUDE_CODE_HANDOFF.md`, and `HANDOFF_TO_CLAUDE.md`. Verify the component inventory matches `Components (Hi-Fi).html`. Reply with your plan for Stage 4 starting with the Home page. Don't write code yet."*

### Why not just one agent for everything?

You can. But the split has two real advantages:
- **Forced checkpoint at the content/UI boundary.** The handoff doc is itself useful documentation — if Codex can't produce a clean one, the foundation isn't ready for UI work.
- **No context bleed between phases.** Codex doesn't get tempted to half-build pages while doing schema; Claude doesn't get tempted to redesign tokens while building pages.

### Things to watch

- **Token fidelity:** Codex must port `gp-tokens.css` *exactly* — every CSS custom property name and value preserved. Run a literal diff before approving Stage 2. Any deviation will cascade through every page Claude builds later.
- **Component API consistency:** If Codex's Button component has a different prop shape than what the HiFi JSX suggests, Claude will work around it inconsistently across pages. Lock the component APIs in Stage 3 review before moving on.
- **Image asset paths:** Whatever directory structure Codex uses in `packages/website/public/` for backgrounds, logo, and photography — document it in the handoff doc so Claude doesn't reorganize it mid-build.

---

## 13. Definition of "done" for the handoff

- All public HiFi pages have a corresponding Astro route that visually matches the mockup at 1440 / 1024 / 375, including a new `/garden` route for the Garden page.
- Every color, type size, and spacing value on every page resolves to a `--gp-*` custom property.
- All page content not tied to identity comes from Keystatic.
- The public API endpoints needed by Home and Chapter detail are integrated with proper loading + empty states and shared public payload contracts.
- A short follow-on doc identifies the member-only / gated surfaces that still need to be designed.
