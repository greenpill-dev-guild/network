# Wireframe Design Prompt — Homepage + 4 Sub-Pages

Use this prompt with a design generation tool (Claude artifacts, Stitch, or similar) to wireframe the V2 homepage and four sub-pages. Pull together repo strategy from `docs/v2/v2-brief.md`, `docs/research/greenpill-ui-ux-audit.md`, the steward-aligned narrative direction in `docs/v2/steward-brief-one-page.md` and `docs/v2/steward-telegram-polls.md`, and the active decision hub at `.plans/active/v2-steward-decision-pack/`.

For Claude artifacts, paste the whole prompt block at once. For Stitch or image-generation tools, split at section boundaries — feed brand foundation + section 1 first, then each subsequent section + sub-page on its own.

```text
# Greenpill Network — Wireframe Brief

You're wireframing a public-website refresh for greenpill.network. The site is built in Astro + Keystatic and is being repositioned from a book brand and link hub into a public knowledge commons and onboarding surface for a living global network. Output low-to-mid fidelity wireframes — structural, but with brand color and type cues so they feel like Greenpill, not generic gray boxes.

---

## What Greenpill is (one paragraph)

Greenpill is a global regenerative network — local chapters, builders, writers, and stewards using web3 tools to coordinate real-world impact. There are 21+ chapters worldwide, a Dev Guild and Writers Guild, projects like Green Goods, GreenWill, Impact Reef, Cookie Jar, and Gardens, a 200+ episode podcast, and a 13-book library translated across 10+ languages. Tagline: "Turning Degens to Regens (one green pill at a time)."

## Who visits the site

- Curious newcomer — no Greenpill context, possibly no web3 context. Needs to understand what this is in 30 seconds.
- Chapter organizer — wants to start or grow a local chapter.
- Builder / writer — wants to find guilds, projects, and contribution paths.
- Partner / funder — evaluating credibility and collaboration entry points.
- Existing member — checking what's active, finding their next thing.

The public site is anonymous by default. Auth lives in a separate workspace app at app.greenpill.network (out of scope for this wireframe pass). No login required to browse, read, or take low-friction actions like adding a map pin.

## Brand foundation — extend, don't rebrand

| Token | Value | Use |
|---|---|---|
| Background | #254D32 (dark green) + organic plant-texture overlay | Page background — already exists |
| Primary accent | #C2E812 (lime) | Interactive elements, CTAs, active states |
| Secondary accent | #FFD972 (gold) | Display headings, highlights, status indicators |
| Mid green | #4FB477 | Hover states |
| Body | #FFFFFF | Body copy on dark background |
| Muted | rgba(243, 246, 239, 0.68) | Secondary copy |
| Display font | Volkhov (serif) | Often uppercase for hero moments, gold or yellow color |
| UI / body font | Inter (medium weight) | Body, nav, UI |
| Buttons | 35px border-radius pills, ~160px min-width, bold | Lime fill + dark-green text for primary; outlined for secondary |
| Card pattern | Glass-morphism: rgba(9, 25, 18, 0.82) panel, lime-tinted border (rgba(194, 232, 18, 0.16)), backdrop-filter: blur(18px) | Use as the default card pattern site-wide |
| Atmosphere | Parallax floating organic elements (leaves, plant motifs), scroll-driven image sequences for hero moments | Use selectively — atmospheric on home, calm on dense content pages |

Tone: warm, organic, alive. We are an ecosystem, not a brochure. Avoid generic SaaS layouts (feature grid + testimonial + CTA stack). Avoid stock imagery — prefer real chapter photos, organic textures.

---

## Homepage — 4 sections in this order

### 1. Hero + Global Map

A single-screen impact moment that establishes who Greenpill is and shows the global network as a living thing in one view.

- Hero copy (left or top): "Turning Degens to Regens" in Volkhov gold, uppercase, large display size. Subhead in white: "(one green pill at a time)" or a one-line network description like "A global regenerative network of chapters, builders, and storytellers."
- Global Map — invent something fresh. Do NOT default to a flat 2D map with circular pins, and do NOT mimic a force-directed graph. The public graph explorer is deferred into `.plans/backlog/knowledge-commons-graph-explorer/`, so this map should be a chapter-discovery moment rather than a knowledge graph. Treat this as the brand's signature visualization moment. Some directions to riff on (pick one or propose better):
  - A stylized 3D globe with chapters appearing as growing organic forms (sprouts, leaves, vines), where size or animation reflects activity.
  - A generative "living world" — abstract topographic or garden-like terrain where chapters surface as glowing nodes with regional clusters.
  - A layered cartographic view — illustrated, painterly, with chapters as bespoke icons or photo-thumbnails, gold/lime accents on a dark organic background.
  - A time-aware animation — the map "blooms" on load, regions light up in sequence, recent activity ripples outward.
  Whatever the form: it must feel organic, alive, and unmistakably Greenpill — not a generic Mapbox or D3 default. Lean on the dark-green organic background, lime/gold accents, and the existing parallax/image-sequence aesthetic.
- Hovering a chapter shows the chapter name + city in a small tooltip; clicking opens a peek card overlay with steward, latest activity, and a "View chapter →" link.
- No-login add-yourself affordance (critical interaction): a persistent pill button on the map — "+ Add yourself to the map" — opens a tiny inline form (name, location auto-detected or typed, role: visitor / starting a chapter / regen project) with a one-click submit. New entries appear immediately in a "pending" state, visually distinct from established chapters.
- Filter chips below or alongside the map: All / Chapters / Builders / Projects / New this month.
- Section footer: a faint scroll-cue and one secondary CTA — "See all chapters ->" linking to `/chapters`.

Wireframe states to deliver: (a) default hero + map, (b) hover state on a chapter showing tooltip / peek card, (c) "+ Add yourself" form open, (d) submitted-entry pending state.

Mobile (375px) fallback: the fresh visualization will not gracefully shrink to phone width. Render mobile as a stylized regional accordion or scrollable chapter list under a small atmospheric header (a cropped slice of the visual language used on desktop) — don't attempt to fit the full hero visualization at narrow widths.

### 2. Chapter Stories

3–4 featured chapters that are actively creating impact. The point of this section is proof — show that real work is happening on the ground.

- Layout: asymmetric editorial grid (not a uniform 4-column). One feature card (large, image-led) + 2–3 supporting cards. Magazine quality.
- Card content: chapter photo (real, not stock), chapter name + city, one-line story headline (e.g. "Greenpill Brasil — 200 trees planted onchain in a single weekend"), 2-line excerpt, steward name + avatar, date.
- Click → immersive dialog (do not navigate away): the card expands into a full-bleed overlay over the homepage. Dialog contains: hero photo (large), longer story body, key impact stats (e.g. trees planted, members, events), named stewards with avatars, embedded gallery or short video, links to chapter Telegram / Discord, and a final "Visit full chapter page →" link out to /chapters/[slug] for those who want to go deeper.
- Close behavior: click outside or X to close back to the homepage with no scroll loss.
- Section CTA below the cards: "See all chapters →" linking to /chapters.

Wireframe states to deliver: (a) section default with 3–4 cards, (b) immersive dialog open over the homepage with one chapter story expanded.

### 3. The Library

A unified knowledge commons that combines books, podcasts, tools, and toolkit into one browse surface. This replaces the current site's separate book and podcast sections.

- Filter pills at top: All / Books / Podcasts / Tools / Toolkit. Active state lime-filled.
- Grid: mixed-media cards. Books show cover + title + translations chip. Podcasts show cover + episode count + "Listen →". Tools show name + status badge (Active / Beta / Experimental) + tech stack chips. Toolkit items show icon + title + "Download →" or "Open →".
- Two destination types per item:
  - Direct link — e.g. podcast cards link to Spotify; toolkit PDFs download directly.
  - Canvas page — e.g. each book opens an internal /library/[slug] "canvas" page: full-bleed cover at top, scroll-to-reveal sections (description, chapter list, translations, related podcast episodes, related tools), sticky TOC sidebar, embedded media. Treat each canvas as an immersive single-page experience, not a brochure.
- Section CTA: "Browse the full library →" linking to a /library index.

Wireframe states to deliver: (a) library grid with filters in default (All) state, (b) library grid with "Books" filter active, (c) one canvas page (e.g. for a book) shown in full — desktop scroll layout with sticky TOC.

### 4. Enter The Garden

The participation entry. The metaphor is a doorway into a living, growing space — soft, inviting, not overwhelming. (Note: this is the entry metaphor, distinct from the "Greenpill Garden" program which is one inside example, not the headline.)

- Section visual: organic, garden-like — plant motifs, gentle gradient, atmospheric. Less dense than other sections.
- Four entry choices as cards, each with an icon, short label, and one-line description:
  1. Join Telegram → opens external Telegram link.
  2. Book a Call → opens a scheduling embed or modal with steward availability.
  3. Give Feedback → inline 2–3 question form (what brought you here / what's missing / contact).
  4. Take the Regen Assessment → starts an interactive flow (see below).
- Regen Assessment flow (deliver as a separate wireframe sequence):
  - Step 1: "Where are you on the Greenpill journey?" 5–7 multi-choice questions covering current involvement (none / reader / participant / contributor / steward), interests (local action / building / writing / funding), and motivation.
  - Step 2: Result screen — "Based on your answers, here's where to start" — recommends 1–3 next steps (e.g. "Start with the Green Pill book", "Visit Greenpill Brasil", "Join the Dev Guild builder space").
  - Optional poll variant: a single-question version — "Where are you on the journey?" with 5 options that aggregate publicly (show a small bar chart of how others answered).
- Section footer: small "What is Greenpill Garden?" link → routes to /learn or a program page (to disambiguate from the entry metaphor).

Wireframe states to deliver: (a) section default with 4 entry cards, (b) Regen Assessment Step 1 (a question), (c) Regen Assessment result screen.

---

## Global chrome

- Top nav (replacing the current 4-anchor nav): logo + Chapters / Library / Stories / Garden. Mobile: hamburger → vertical list with backdrop blur.
- Footer: site nav (mirror top nav), social links (Discord, Telegram, Twitter, Warpcast, YouTube, Paragraph, GitHub), newsletter input, Supermodular attribution. No Charmverse links anywhere.

## Sub-pages to wireframe in this batch

For each, deliver desktop (1440px) + mobile (375px), with section breakdowns and key states.

1. Chapter detail (/chapters/[slug]) — chapter hero (photo + name + city + status badge), about, stewards (avatars + roles), recent activity feed, impact metrics (3 stat cells), connected guilds/projects/region chips, join CTAs (Telegram / Discord / view workspace). Breadcrumb back to /chapters.

2. Library canvas page (/library/[slug]) — full-bleed cover hero, sticky TOC sidebar (desktop) or accordion (mobile), scrollable sections (description, contents, translations, related media, "What to read next"), fixed bottom CTA bar with "Get the book" / "Listen on..." / "Download PDF" depending on item type.

3. Garden — Regen Assessment full flow — start screen with intro copy, the 5–7 question sequence (one question per screen with progress bar), result screen with recommended paths.

4. Chapters index (/chapters) — uses the same visual language and chapter-rendering style as the homepage hero, but scaled to full-viewport with proper map controls (zoom, pan, region focus, search) — this page IS the map, with controls; the hero map was a decorative moment beside copy. Filter chips by region (All / Americas / Africa / Asia / Europe / Oceania). Card grid of chapter previews below the map. "Start a chapter" CTA at the bottom with a brief playbook teaser.

## Constraints — what to avoid

- Generic SaaS landing patterns (hero + 3-feature row + testimonial + CTA stack).
- Wallet connect, login prompts, or auth UI on the public site.
- Charmverse links or references as final destinations.
- The "Beginner / Intermediate / Advanced" progression framing — too abstract, replace with role-based and journey-based language.
- Treating books as the brand's main identity — they're one part of the Library now.
- Stock imagery — prefer real chapter photos, organic textures, the existing image-sequence aesthetic.
- Walls of external links — every external link should sit inside a card with context.

## Deliverables checklist

- [ ] Homepage — desktop + mobile, all 4 sections
- [ ] Homepage interaction states (map add-pin, chapter dialog open, assessment flow start)
- [ ] Chapter detail page — desktop + mobile
- [ ] Library canvas page — desktop + mobile
- [ ] Garden Regen Assessment full flow (intro → questions → result)
- [ ] Chapters index — desktop + mobile
- [ ] Brief annotations on key interactions (modal triggers, form behavior, hover states)
```
