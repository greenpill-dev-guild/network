# Claude Code Handoff Guide — Greenpill Network

This doc is the bridge between the design package in this folder and the partially-scaffolded Astro + Keystatic + fly.io repo. It is meant to be **read by you (the designer/PM) once**, then used to drive a sequence of focused prompts into Claude Code.

The mistake to avoid: dropping all nine HiFi pages on Claude Code in one message and saying "build this." That produces a soup of half-correct components, inconsistent tokens, and content that's hard-coded in the wrong layer. Instead, we want a **staged handoff** where each stage has a clear contract and a visual acceptance check.

**Two important framings to carry through every stage:**

1. **The HiFi is ~90% of the visual spec, not 100%.** The design system was built off the existing greenpill.network site, so it's already aligned — but it intentionally omits some things the live site does well that we want to keep: **background imagery / textures**, the **logo treatment** (the HiFi header is wordmark-only; the live site uses the logo mark, and we want to reconsider that), and likely a few other subtle environmental touches. See §3 (90/10 lift list) below for what to pull from the live site.

2. **Content first, code second.** Most of the copy in the HiFi pages is placeholder. Before any pages get built, we want Keystatic + the CMS schema defined and seeded with **real copy lifted from greenpill.network**, so that as pages come online they immediately render real content. The staged plan is ordered accordingly.

3. **Bring the design package into the repo.** Copy this whole folder into the repo as `/design/` (or wherever the team standardises) so Claude Code can `read` the HiFi files and tokens directly without leaving the workspace.

---

## 1. The stack contract (state this in every prompt)

| Layer | Tech | What lives here |
|---|---|---|
| Site shell | **Astro** | Routing, layouts, page composition, SSG of static pages |
| Public content | **Keystatic** | Marketing copy, chapter directory entries, library resources, stories, guild mandates — anything an editor should change without a deploy gate |
| Private content / member state | **Custom CMS on fly.io + Postgres** | Member profiles, gated guild content, steward dashboards, contributor pledges, applications |
| Dynamic data | **API (fly.io)** | Live chapter counts, recent activity, map state, anything that should be fresh on page load |
| Styling | **Design tokens from `hifi/gp-tokens.css`** | Single source of truth — port these into Astro as a global stylesheet or Tailwind theme, never hardcode values |
| Components | **Astro components + scoped CSS** (or whichever convention the existing scaffold uses) | Port from `hifi/*.jsx` as **specs**, not as code to copy verbatim |

---

## 2. Content domain map (the part Claude Code keeps getting wrong)

For each page, declare up front what gets sourced from where. Without this, Claude Code will hard-code everything as page props.

| Page | Keystatic collections | Postgres / CMS | API (runtime fetch) |
|---|---|---|---|
| Home | `site-config`, `featured-chapters` (refs), `featured-stories` (refs) | — | `/api/map/state` (live node counts, recent activity) |
| Chapters (directory) | `chapters` collection | — | `/api/chapters/stats` (member counts, last-active) |
| Chapter (detail) | `chapters/[slug]` entry | Steward roster (if private), event RSVPs | `/api/chapters/[slug]/feed` (recent posts/events) |
| Library | `resources` collection (tags, type, body) | — | `/api/library/popular` (optional) |
| Stories (feed) | `stories` collection | — | — (SSG) |
| Story (detail) | `stories/[slug]` entry | Reactions / comments (if any) | — |
| Guild | `guilds/[slug]` entry (mandate, public roster) | Member-only content, applications | `/api/guilds/[slug]/activity` |
| Garden | `garden` singleton (onboarding copy) | Contributor pledge state | `/api/garden/coordination-globe` |
| Components (HiFi) | — | — | — (not a real route; design reference only) |

**Rule of thumb for Claude Code**:
- Anything an editor would want to edit weekly → Keystatic.
- Anything tied to a logged-in identity or that changes per-user → CMS/Postgres.
- Anything that must be fresh on every page load and isn't user-specific → API endpoint that the Astro page calls server-side (or client-side, depending on freshness need).

---

## 3. The 90/10 lift list (what to pull from greenpill.network)

The HiFi is the visual contract for layout, type, color, components, and interaction. These specific things are **not** in the HiFi and should be lifted from the live site:

| What | Where it's used | Notes |
|---|---|---|
| **Background imagery / textures** | Page backgrounds, section backgrounds, hero environments | The live site has organic/topographic background treatments that aren't reproduced in the HiFi. Download these into `public/backgrounds/` and reference from the appropriate page sections. Don't try to re-render them as CSS — use the existing image assets. |
| **Logo mark** | Header (currently wordmark-only in HiFi), favicon, OG images | Decide with the design owner whether the header keeps the wordmark-only treatment from the HiFi or restores the mark from the live site. Default: bring the mark in and place it left of the wordmark in the header. |
| **Photography** | Story cards, chapter cards, library resource thumbnails | Lift real images from greenpill.network where they exist; placeholder accordingly where they don't. |
| **Brand iconography** | Anywhere the HiFi uses generic icons that the live site has branded equivalents for | Spot-check and replace. |

For each of these, the rule is: **HiFi defines the slot, the live site provides the content of the slot.** Don't invent new background treatments or icon styles.

---

## 4. Staged handoff plan

Run these as **separate Claude Code sessions or distinct prompts within one session**. Wait for each to land cleanly before starting the next.

### Stage 0 — Orientation (no code)
Goal: Claude Code reads the design package and the existing repo, then *writes back a plan*. Do not let it touch code yet.

### Stage 1 — Tokens + global styles
Goal: `gp-tokens.css` ported into the Astro project as the global theme. Type ramp, color palette, spacing, radii, shadows all available as CSS custom properties. Spectral + Manrope + JetBrains Mono wired via `@fontsource` or a self-hosted equivalent.

**Acceptance:** A throwaway `/_tokens` page in the Astro app renders the type scale and color swatches and visually matches `Components (Hi-Fi).html` section-for-section.

### Stage 2 — Shell components
Goal: Header, footer, container, Button, Card, Pill/Tag, Overline, type atoms (Display, H1–H3, Title, Body, Meta), and the basic page chrome. No page content yet.

**Acceptance:** A `/_kit` route that renders the relevant sections of `Components (Hi-Fi).html` using the ported components. Side-by-side visual review against `Components (Hi-Fi).html?raw`.

### Stage 3 — Content extraction + Keystatic/CMS schema (do this BEFORE page builds)

This is the stage that flips the usual order, and it's deliberate. We want real copy and real content shape locked in before pages start consuming data, so page work isn't polluted with lorem-style placeholders.

Goal, in three sub-steps:

**3a. Content audit of greenpill.network.** Claude Code crawls the live site (or you supply a list of URLs) and produces a structured inventory: every chapter, every story, every library resource, every guild, plus all marketing copy used on the home/garden surfaces. Output is a markdown file like `/design/content-inventory.md` with one section per page/collection, real copy verbatim, and a note for each entry about which images go with it.

**3b. Keystatic + Postgres schema design.** Define all Keystatic collections (`chapters`, `stories`, `resources`, `guilds`, plus `site-config` and `garden` singletons) and the matching Postgres tables for member/CMS data. Field shape is driven by the HiFi pages **and** the content inventory from 3a — if real content has a field the HiFi doesn't show, decide explicitly whether to render it or drop it.

**3c. Seed real content.** Populate Keystatic with the full inventory from 3a — not 2-3 sample entries, the real thing. Stub the CMS/Postgres tables with the real member/private content where it exists, otherwise leave them empty with a clear schema.

**Acceptance:**
- `/design/content-inventory.md` exists and is complete.
- Keystatic admin UI shows all collections with real, populated entries.
- A schema diagram (or `schema.sql`) for the Postgres side is committed.
- Background images, logo, and photography from §3's lift list are in `public/` and referenced from the appropriate Keystatic entries.

### Stage 4 — Page implementations (in priority order)
1. **Home** — most architecturally interesting (map + bento + Keystatic refs + API). Doing this first surfaces every integration concern.
2. **Chapters (directory)** — simplest Keystatic-driven list page; validates the collection wiring.
3. **Chapter (detail)** — dynamic route from Keystatic + first API integration.
4. **Library** — second collection list page; confirms the Card pattern generalises.
5. **Stories** + **Story** — together; same pattern as Library but article-shaped.
6. **Guild** — first page that touches the private CMS.
7. **Garden** — onboarding flow; touches CMS for pledge state.

Each page is one prompt. Each ends with a visual acceptance check against the corresponding `*-Hi-Fi.html?raw` view at 1440 / 1024 / 375.

### Stage 5 — API integration
Goal: Replace placeholder data on Home and Chapter pages with real fetches against the fly.io API. Define a typed client in `src/lib/api.ts`.

### Stage 6 — Private CMS surfaces
Goal: Auth-gated routes for guild members, steward dashboards, contributor state. This is **out of scope of the current design package** — the HiFi covers logged-out reader only. Flag this clearly and design the gated states separately before building.

---

## 5. The first prompt to paste into Claude Code

Use this verbatim as the opening message of a new Claude Code session. It's intentionally a **planning prompt, not a build prompt**.

````markdown
You're implementing the Greenpill Network site. Two things to read before writing any code:

1. **Design package** at `<path to this design folder>` — start with `HANDOFF.md`, then open `Components (Hi-Fi).html?raw` in a browser to see the design system rendered, then skim the other `*(Hi-Fi).html` files at `?raw` to understand each page.
2. **`CLAUDE_CODE_HANDOFF.md`** in the same folder — that's the implementation playbook (stack contract, content domain map, staged plan).

Then read the existing repo:
- `astro.config.*`, `package.json`, `tsconfig.json` — what's already wired
- `src/` tree — what scaffolding exists for layouts, components, content
- Any existing Keystatic config (`keystatic.config.*`)
- Anything in `src/lib/`, `src/pages/api/`, or similar — backend touchpoints already in place
- `README.md` and any internal docs

For context on the existing brand, content, and assets, you can browse https://greenpill.network — **use it only as a source of real copy, imagery, and the chapter list**, not as a UI to replicate. The HiFi mockups in the design package are the visual contract, not the live site.

**Do not write any code yet.** Reply with:

1. A short summary of what's already scaffolded in the repo (3–6 bullets).
2. Anything in `CLAUDE_CODE_HANDOFF.md`'s staged plan that conflicts with the existing scaffolding, and how you'd resolve it.
3. Your proposed order of operations for Stage 1 (tokens + global styles) — file paths, where Spectral/Manrope/JetBrains Mono get loaded, where `gp-tokens.css` ends up, and how Astro pages will consume the tokens.
4. Any clarifying questions for me before you start.

Once I approve the plan, we'll do Stage 1 as one focused commit, then move through the staged plan one page at a time.
````

---

## 6. Per-stage prompt templates

After Stage 0 lands, use these. Each is short on purpose — the design files and `CLAUDE_CODE_HANDOFF.md` carry the detail.

**Stage 1 — Tokens**
> Implement Stage 1 from `CLAUDE_CODE_HANDOFF.md`: port `hifi/gp-tokens.css` into the Astro project, wire the three Google Fonts, and create a `/_tokens` review page that renders the type scale and color swatches matching the Foundations section of `Components (Hi-Fi).html`. Show me the file diff before committing.

**Stage 2 — Components**
> Implement Stage 2: port the shell + atoms + primitives shown on `Components (Hi-Fi).html` (Header, Footer, Container, Button, Card, Pill, Overline, type atoms). Build a `/_kit` route that mirrors that page section-by-section. Reference the JSX in `hifi/comp-*.jsx` and `hifi/gp-shell.jsx` for behavior and structure, but write idiomatic Astro components — do not copy JSX patterns literally.

**Stage 3a — Content audit**
> Crawl https://greenpill.network and produce `/design/content-inventory.md` per Stage 3a in `CLAUDE_CODE_HANDOFF.md`. One section per page / collection, real copy verbatim, image notes per entry. Also download every background image, the logo mark, and per-entry photography into `public/` (organize sensibly). Don't touch any Astro page code yet. Show me the inventory file when done.

**Stage 3b — Schema**
> Define Keystatic collections and Postgres tables per Stage 3b. Field shape is driven by the HiFi pages cross-referenced against the content inventory from 3a — flag any fields where the inventory has data the HiFi doesn't render, and ask before deciding to keep or drop them. Show me the schemas before any seeding.

**Stage 3c — Seed**
> Populate Keystatic with the full content inventory. Real content, not samples. Stub Postgres tables for any private content surfaces. Verify in the Keystatic admin UI that every collection list and detail entry matches the inventory.

**Stage 4 — Page (template, swap the name)**
> Implement the **Home** page per `Home (Hi-Fi).html?raw`. Source data per the content domain map row for Home. The mycelial map is the visually load-bearing element — preserve its layout and node treatment exactly; the JS pulse animation can be reimplemented idiomatically. After build, take screenshots at 1440 / 1024 / 375 and compare to the HiFi.

**Stage 5 — API**
> Wire the API integrations called out in the content domain map. Define a typed client in `src/lib/api.ts`. Start with `/api/map/state` consumed by Home.

---

## 7. Things to tell Claude Code *not* to do

- Don't invent design tokens. If a value isn't in `gp-tokens.css`, ask.
- Don't invent background treatments or icon styles. Lift from the live site per §3.
- Don't seed Keystatic with lorem-style placeholders — always pull from the §3a content inventory.
- Don't build pages before Stage 3 is complete. Real content shape informs component decisions.
- Don't ship the gallery/frame wrappers from the mockups — those are dev chrome.
- Don't copy JSX-in-browser patterns (the `<App>` + `?raw` branch). Astro pages don't need that.
- Don't build member-only / gated states yet — those aren't designed.
- Don't hard-code chapter, story, or resource content into Astro pages — that goes through Keystatic.
- Don't bypass the token layer to match a screenshot pixel-perfectly — if something looks off, fix the token, not the consumer.

---

## 8. What to do *with* the existing site (greenpill.network)

The live site is the source of:

1. **All real copy** — marketing, chapter writeups, story bodies, library descriptions, guild mandates, garden onboarding. Captured in Stage 3a's `content-inventory.md`.
2. **The 90/10 visual lift list in §3** — background imagery, logo mark, photography, brand icons.
3. **The real chapter / story / resource list** — actual counts and names, not invented samples.

Everything else — layout, type, color, component structure, interaction patterns — comes from the HiFi package, not the live site.

---

## 9. Component naming + porting contract

When porting the JSX specs in `hifi/*.jsx` into Astro components, follow these conventions so every page imports the same surface and Claude/Codex don't reinvent the API per page.

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
src/
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
│   └── garden.astro
├── lib/
│   ├── api.ts               ← typed API client (Stage 5)
│   └── content.ts           ← Keystatic helpers
└── styles/
    └── tokens.css           ← ported from hifi/gp-tokens.css
```

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
- `<meta name="description">` — 150–160 chars, written per entry in Keystatic (`seoDescription` field on every collection)
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
- Long-term: generate OG images dynamically with `astro-og-canvas` or `satori`, using the entry's title + chapter name + a topographic backdrop. Not required for launch, but the schema field should exist.

### Structured data

Every page emits JSON-LD in `<head>`:

- All pages — `Organization` schema with the Greenpill Network info
- Home + index pages — `WebSite` schema with `SearchAction` if a global search exists
- Story detail — `Article` schema (`headline`, `author`, `datePublished`, `image`)
- Chapter detail — `Organization` (sub-organization) schema if the chapter is treated as an entity
- Chapter events — `Event` schema per upcoming event

### Sitemap + robots

- Astro's `@astrojs/sitemap` integration enabled. Excludes `/_tokens`, `/_kit`, any draft Keystatic entries.
- `robots.txt` allows all crawlers in production, blocks all in preview / dev environments (driven by `import.meta.env.PROD`).

---

## 12. Optional: split the work between Codex and Claude Code

The staged plan splits cleanly along agent strengths. If you want to run a two-agent workflow:

**Codex owns Stages 0–3** — the content + backend half:
- Stage 0: orientation + plan
- Stage 1: tokens + global styles wired into Astro
- Stage 2: shell + atom components (Header, Footer, Container, Button, Card, type atoms)
- Stage 3a: content inventory crawl of greenpill.network
- Stage 3b: Keystatic + Postgres schema design
- Stage 3c: seed Keystatic with real content; stub the Postgres tables

This phase is mostly structured data work, schema design, content extraction, and disciplined token porting — well-suited to Codex.

**Claude Code owns Stages 4–6** — the visual translation half:
- Stage 4: page implementations against the HiFi mockups, in priority order
- Stage 5: API integration on Home + Chapter detail
- Stage 6: design + build for member-only / gated surfaces (after design follow-on)

This phase is heavy on visual fidelity, component composition, and matching the HiFi exactly at 1440 / 1024 / 375 — well-suited to Claude.

### Handoff contract between the two agents

When Codex finishes its phase, it should produce a single `HANDOFF_TO_CLAUDE.md` in the repo with:

1. **What's wired:** Astro setup, font loading, token file location, Keystatic config path, Postgres connection setup.
2. **What's seeded:** every Keystatic collection with entry counts, every Postgres table with row counts (or "empty by design").
3. **Component inventory:** every shell/atom component built in Stage 2, with file path and the section of `Components (Hi-Fi).html` it maps to.
4. **Open questions:** any decisions Codex made that Claude should sanity-check against the HiFi (e.g. "used wordmark-only in header per HiFi — confirm before page builds").
5. **Known gaps:** anything from §3's 90/10 lift list that wasn't resolvable from the live site (e.g. missing photography for a specific chapter).

Claude Code's first prompt then becomes: *"Read `HANDOFF.md`, `CLAUDE_CODE_HANDOFF.md`, and `HANDOFF_TO_CLAUDE.md`. Verify the component inventory matches `Components (Hi-Fi).html`. Reply with your plan for Stage 4 starting with the Home page. Don't write code yet."*

### Why not just one agent for everything?

You can. But the split has two real advantages:
- **Forced checkpoint at the content/UI boundary.** The handoff doc is itself useful documentation — if Codex can't produce a clean one, the foundation isn't ready for UI work.
- **No context bleed between phases.** Codex doesn't get tempted to half-build pages while doing schema; Claude doesn't get tempted to redesign tokens while building pages.

### Things to watch

- **Token fidelity:** Codex must port `gp-tokens.css` *exactly* — every CSS custom property name and value preserved. Run a literal diff before approving Stage 1. Any deviation will cascade through every page Claude builds later.
- **Component API consistency:** If Codex's Button component has a different prop shape than what the HiFi JSX suggests, Claude will work around it inconsistently across pages. Lock the component APIs in Stage 2 review before moving on.
- **Image asset paths:** Whatever directory structure Codex uses in `public/` for backgrounds, logo, and photography — document it in the handoff doc so Claude doesn't reorganize it mid-build.

---

## 13. Definition of "done" for the handoff

- All nine HiFi pages have a corresponding Astro route that visually matches the mockup at 1440 / 1024 / 375.
- Every color, type size, and spacing value on every page resolves to a `--gp-*` custom property.
- All page content not tied to identity comes from Keystatic.
- The two API endpoints needed by Home and Chapter detail are integrated with proper loading + empty states.
- A short follow-on doc identifies the member-only / gated surfaces that still need to be designed.
