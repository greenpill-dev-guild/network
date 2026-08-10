# Claude Design Wireframe Prompts — Website Polish Pass

Five paste-ready prompts for Claude Design, one per page, produced from the Jul 16 website audit call (Afo × Matt) and the decisions locked afterward. Each prompt is **repo-aware and self-contained**: it points Claude Design at the linked codebase (tokens, DESIGN.md, the `ui/` primitives, the current page) and requests **three named design variants**, while still embedding a full design-system digest, the site chrome, and real site copy — so it degrades gracefully even if the repo attachment fails.

**How to use**

1. In Claude Design, link the `greenpill/network` repo to the project first. Then open one session per page and paste the entire fenced block.
2. Each prompt requests three variants of the full page — **V1 Field Guide** (faithful evolution), **V2 Editorial Atlas** (print/editorial push), **V3 Living Network** (most expressive) — same locked structure and content, different look and feel. The same three theses repeat across all five pages, so if one direction wins everywhere you get a coherent site.
3. Compare, pick a direction, then keep iterating in the same session — the prompt tells Claude Design to produce the mobile companion and refinements of the winner after you choose. Don't re-paste.
4. Lines tagged `[refresh ok]` are the only copy Claude Design may rewrite (these are the spots the call flagged); everything else is real site copy and should appear verbatim.
5. Entries tagged `[illustrative]` are placeholders for content still being finalized (hats list, Growth WG blurb, incoming book) — keep the slot, expect the words to change.

Pages: 1. Home · 2. Library · 3. Guild (Dev template + Writers variant) · 4. Garden · 5. Guilds & Working Groups (new). A decision-coverage appendix is at the bottom.

---

## Prompt 1 — Home

```text
Design a hi-fi wireframe for the homepage of greenpill.network — the public front door of the
Greenpill Network, a global regenerative network of local chapters, builder guilds, and
storytellers coordinating public goods and onchain impact. Audience: curious newcomers deciding
whether this is "their people," plus returning members jumping to a chapter, guild, or resource.
The page's job: show a living network (map first), then layer stories, knowledge, guilds,
ecosystem, and a gentle on-ramp.

CODEBASE — the repo is linked to this session
The greenpill/network monorepo is attached. Before designing, ground yourself in:
- packages/website/src/styles/gp-tokens.css — the canonical --gp-* design tokens.
- packages/website/DESIGN.md — the UI contract, including the per-page reflow matrix.
- packages/website/src/components/ui/ — the primitive vocabulary (Button, Card, Chip,
  StatusChip, Text, Overline, Meta, ArrowLink, Container, SectionHeader, Avatar, AvatarStack,
  EmailInput, LinkRow, CtaStrip, RailArrows) and src/components/shell/ (SiteHeader, SiteFooter).
- packages/website/src/pages/index.astro and src/components/page-sections/HomeMap.astro — the
  homepage and map as they exist today; this design replaces them.
Build on that vocabulary: compose and evolve the existing primitives rather than inventing a
parallel component language, and annotate each section with the primitive it builds on (or a
clearly flagged NEW COMPONENT proposal) — these wireframes will be implemented in this exact
codebase. The design-system digest below summarizes the token file; where they disagree, the
repo wins. If the repo is not attached, the digest is sufficient on its own.

VARIANTS — produce three distinct directions of this page
Hold constant across all three: the section order and content below, the chrome, the token
palette and type roles, and every AVOID rule. Vary composition, density, and expressive range:
- V1 · FIELD GUIDE — faithful evolution. Closest to the current site: same component feel,
  tightened composition, better rhythm and polish. The safe baseline.
- V2 · EDITORIAL ATLAS — push the print/editorial register: stronger serif moments, bolder
  type-scale contrast, magazine-style grids and pull-quotes, gold used with more confidence.
- V3 · LIVING NETWORK — the most expressive: organic, mycelial motifs; the map's theme-tinted
  threads may bleed into section transitions; topographic texture more present. Still
  dark-forest, still token-true, still buildable.

DESIGN SYSTEM — "Greenpill" (digest of gp-tokens.css — apply exactly)

Canvas & color
- Dark, warm forest canvas. Page background #0F3D2E (deepest wells #0A2D21), raised surface
  #143F30, card #1A4D3A, elevated card #235C46, hairline borders #2A6B52 at ~55% opacity.
- Accent: Greenpill Lime #B8E835 — exactly ONE lime primary action per screen (the main CTA);
  hover #C4F02C. Lime also marks live map nodes and active states.
- Headlines: Steward Gold #F0DCA0 — display/headline text and quiet emphasis only. Gold is
  never a button or link color.
- Text: #FAF7EE body, #E8E2D4 muted, #B8B0A0 only for large dim metadata.
- Error/attention: terracotta #E07856 (never red). Info: #5BA889. No grey, no pure black/white.

Typography
- Spectral (serif) for display + headlines only — always gold. Display ≈72px desktop / 42px
  mobile; H2 ≈40/30; H3 ≈28/22.
- Manrope (sans) for all body/UI at 16px / 1.6.
- JetBrains Mono, uppercase, letterspaced, ~11–12px, for overlines ("SECTION · CONTEXT") and
  technical metadata only.

Shape & rhythm
- Pill radius (fully rounded) on every button, chip, input, avatar. Cards 20px radius. 8px
  spacing scale, generous section padding (64–96px). Content max-width ~1280px on 1440 canvas.
- Depth = stepping the green scale, not shadows. The only glow: a soft lime halo on the primary
  button. Subtle topographic contour-line texture (~12% opacity, overlay) behind hero areas.

Voice & details
- Earnest, grounded, warm — a living forest field-guide, not a SaaS dashboard.
- Almost no icons: short uppercase mono text labels instead (GH, X, TG, YT, HUB). Links end
  in "→". Accessibility: AA contrast, lime focus rings, 44px touch targets on mobile, real text.

SITE CHROME (include on the frame)
- Sticky 72px header: wordmark "Greenpill" left; nav Chapters · Guilds · Library · Stories ·
  Garden; the active item carries a small lime dot. Mobile: hamburger.
- Footer, 4 columns:
  NETWORK — Chapters · Guilds & Working Groups · Garden · Code of Conduct
  GET INVOLVED — Start in the Garden · Events calendar (Luma) · Join the map · Talk to a steward
  RESOURCES — Library · Stories · Podcast
  CONNECT — X / Twitter · Farcaster · Telegram · LinkedIn · YouTube · Regen Hub
  Bottom mono row: greenpill.network · 2026 Greenpill Network · Ecoregion boundaries: RESOLVE
  Ecoregions 2017, CC-BY 4.0.

PAGE STRUCTURE (top to bottom)

1. HERO — headline, map, dek, CTAs (centered stack)
   - H1 (gold serif, one line at desktop): "A global regenerative network."
   - Directly beneath: the interactive world map — the hero's centerpiece. Dark equirectangular
     dot-grid landmass on the forest canvas; 18 lime chapter nodes across Africa, the Americas,
     Asia, and Europe; thin theme-tinted "mycelial threads" connecting related nodes.
     CRITICAL: the map spans the full content width (~1280px) and reads generously on a 14"
     laptop — the current build renders it small and skewed; design the fixed version.
   - Map overlay controls: three node-type filter pills — Chapters · Stewards · Members — plus a
     compact theme legend. Show one filter active (lime fill) with a quiet "Show all" reset pill
     beside it: filtering must always offer an obvious way back.
   - On-map secondary pill: "Join the map" (self-submission entry — never "Submit yourself").
   - Dek under the map (muted): "Start with the map, read the field notes, browse the public
     library, or enter through the Garden at the pace that fits."
   - CTAs: primary lime pill "Find your people" + ghost pill "Browse chapters".

2. STORIES — bento of field notes
   - Overline "STORIES · FROM THE FIELD" · H2 "Stories from the network." · "See all stories →"
   - Bento: 1 large horizontal card + 3 smaller cards. Card anatomy: photo, mono meta line
     ("IMPACT · AFRICA"), H3 title, 2–3 line excerpt, "Read the story →". Use these real
     stories: "Greenpill Nigeria Water Cup" (impact · Africa), "The Dev Guild regenerative
     stack" (build · global), "Greenpill Brasil GG20 climate milestones" (funding · Americas),
     "Phangan environmental monitoring" (impact · Asia).

3. THE COMMONS — two-tile knowledge bento (slimmed)
   - Overline "LIBRARY · KNOWLEDGE COMMONS" · H2 "The Greenpill commons." · "Browse the library →"
   - Dek: "Books, podcast conversations, public guild writing, and field guides — open and made
     by the network."
   - Tile A — Books (elevated card): header "BOOKS · 13 TITLES" + mono "All free"; H3 "Read the
     books."; a 4×2 grid of eight 2:3 book covers with tiny captions; footer "Multiple
     translations · field-tested" + "Browse all →".
   - Tile B — Podcast (elevated card): square cover art; mono "Hosted by Kevin Owocki and
     guests"; H3 "The Greenpill Podcast"; "The greenpill podcast dives deeper into the
     regenerative crypto-economic frontier." · "296 episodes — every one free to stream or
     watch."; ghost pill "Listen on Apple Podcasts" + "Watch on YouTube →".
   - Nothing else in this bento: the old Knowledge Map, Regen Toolkit, and guild tiles are gone.

4. GUILDS — new standalone section
   - Overline "GUILDS · WORKING CIRCLES" · H2 "Built by guilds." [refresh ok] ·
     "All guilds & working groups →"
   - Two wide feature cards side by side:
     · Dev Guild — status chip "Active", "Building open-source coordination tools for the
       regenerative network." · mono footer "Green Goods · Cookie Jar · Grant Ships" ·
       "Visit guild →"
     · Writers Guild — status chip "Active", "Stories, translations, field reports, and public
       knowledge work for the network." · mono footer "Books · newsletters · translations" ·
       "Visit guild →"

5. ECOSYSTEM — categorized, two labeled rows
   - Overline "ECOSYSTEM · COMMUNITIES WE COORDINATE WITH" · H2 "Stronger together." ·
     Dek: "Greenpill sits inside a wider regenerative web3 ecosystem — funders, builders,
     storytellers, scientists."
   - Row label (mono) "PARTNERS & COLLABORATORS" — nine compact tiles (lime dot + gold serif
     name + one-line muted blurb): Gitcoin "Public goods funding network" · ReFi DAO
     "Regenerative finance network" · Regen Coordination "Shared coordination hub" · Octant
     "Epoch-based public goods" · Giveth "Donation & funding rounds" · JournoDAO "Podcast
     season collaborator" · VDAO "Resilience podcast season" · Network Nations "Network
     coordination series" · Bread Cooperative "Solidarity funding network".
   - Row label (mono) "TOOLS WE BUILD WITH" — three tiles, subtly distinguished (gold dot or a
     small outline chip "TOOL"): Gardens "Community funding & governance" · Hypercerts "Impact
     proof infrastructure" · Karma GAP "Grantee accountability protocol".

6. GARDEN RAMP — three numbered cards
   - Overline "PARTICIPATE · ENTER THE GARDEN" · H2 "Meet the network where you are." · Dek:
     "Three public, low-pressure ways into Greenpill. Pick whichever matches the moment you are
     in." · "Open the Garden →"
   - Card 01 "Subscribe to field notes" — commitment label (mono) reworded away from
     "friction" language [refresh ok]; body "An occasional public digest with chapter updates,
     new resources, podcast highlights, and upcoming calls. Unsubscribe any time."; ghost CTA
     "Subscribe".
   - Card 02 "Join the public conversation" — "Drop into the shared Greenpill chat and listen
     before you contribute. Lurk as long as you like — nobody is keeping score."; ghost CTA
     "Open Telegram"; secondary link "Or read the Hub →".
   - Card 03 "Book a steward call" — "For people thinking about starting a chapter, joining a
     guild, partnering on a project, or finding the right steward to talk with."; mono meta
     "Private · by request"; ghost CTA "Book a call".
   - (The Regen Assessment step no longer exists — exactly three cards.)

7. FOOTER (per chrome spec).

STATES & RESPONSIVE
- Show the map with one filter active + "Show all" reset visible.
- Story and guild cards: hover = lime border tint + slightly elevated green.
- Mobile 375: map ~60% viewport height with overlay pills reflowing to a bottom row; all
  sections stack single-column; book grid 2-up; 44px targets.

AVOID
- No Knowledge Map tile, no Toolkit tile, no "Submit yourself" wording, no fourth garden step,
  no icon fonts, no light theme, no lorem ipsum, no more than one lime primary per screen.

DELIVER
- First response: THREE full-page desktop 1440px frames — V1, V2, V3 — each the complete page.
- Label every frame with its variant name. Annotate, outside the canvas: which existing gp
  primitive each section builds on (or NEW COMPONENT), plus the key interactions (map filter,
  hover, reset).
- After I pick a direction: produce the full-page mobile 375px companion of the winner and
  iterate on that direction only.
- Use the copy above verbatim except lines tagged [refresh ok].
```

---

## Prompt 2 — Library

```text
Design a hi-fi wireframe for the Library page of greenpill.network — the public knowledge
commons of the Greenpill Network, a global regenerative network of chapters, guilds, and
storytellers. The Library is the network's strongest page today: books lead, the podcast
follows, and legacy guides step back into a quiet archive. Audience: readers and researchers
who want the source material, plus members sharing "the shelf" as a link.

CODEBASE — the repo is linked to this session
The greenpill/network monorepo is attached. Before designing, ground yourself in:
- packages/website/src/styles/gp-tokens.css — the canonical --gp-* design tokens.
- packages/website/DESIGN.md — the UI contract, including the per-page reflow matrix.
- packages/website/src/components/ui/ — the primitive vocabulary (Button, Card, Chip,
  StatusChip, Text, Overline, Meta, ArrowLink, Container, SectionHeader, Avatar, AvatarStack,
  EmailInput, LinkRow, CtaStrip, RailArrows) and src/components/shell/ (SiteHeader, SiteFooter).
- packages/website/src/pages/library/index.astro — the Library as it exists today; this design
  replaces it. Book data lives in src/content/books/.
Build on that vocabulary: compose and evolve the existing primitives rather than inventing a
parallel component language, and annotate each section with the primitive it builds on (or a
clearly flagged NEW COMPONENT proposal) — these wireframes will be implemented in this exact
codebase. The design-system digest below summarizes the token file; where they disagree, the
repo wins. If the repo is not attached, the digest is sufficient on its own.

VARIANTS — produce three distinct directions of this page
Hold constant across all three: the section order and content below, the chrome, the token
palette and type roles, and every AVOID rule. Vary composition, density, and expressive range:
- V1 · FIELD GUIDE — faithful evolution. Closest to the current site: same component feel,
  tightened composition, better rhythm and polish. The safe baseline.
- V2 · EDITORIAL ATLAS — this page is V2's natural home turf: treat the shelf like a
  beautifully set print catalog — stronger serif moments, index numerals, generous margins,
  gold used with more confidence.
- V3 · LIVING NETWORK — the most expressive: treat the commons as knowledge terrain —
  topographic texture, shelf-as-landscape moments, organic section transitions. Still
  dark-forest, still token-true, still buildable.

DESIGN SYSTEM — "Greenpill" (digest of gp-tokens.css — apply exactly)

Canvas & color
- Dark, warm forest canvas. Page background #0F3D2E (deepest wells #0A2D21), raised surface
  #143F30, card #1A4D3A, elevated card #235C46, hairline borders #2A6B52 at ~55% opacity.
- Accent: Greenpill Lime #B8E835 — exactly ONE lime primary action per screen (the main CTA);
  hover #C4F02C.
- Headlines: Steward Gold #F0DCA0 — display/headline text and quiet emphasis only. Gold is
  never a button or link color.
- Text: #FAF7EE body, #E8E2D4 muted, #B8B0A0 only for large dim metadata.
- Error/attention: terracotta #E07856 (never red). Info: #5BA889. No grey, no pure black/white.

Typography
- Spectral (serif) for display + headlines only — always gold. Display ≈72px desktop / 42px
  mobile; H2 ≈40/30; H3 ≈28/22.
- Manrope (sans) for all body/UI at 16px / 1.6.
- JetBrains Mono, uppercase, letterspaced, ~11–12px, for overlines and technical metadata only.

Shape & rhythm
- Pill radius on every button, chip, input, avatar. Cards 20px radius. 8px spacing scale,
  generous section padding (64–96px). Content max-width ~1280px on 1440 canvas.
- Depth = stepping the green scale, not shadows. Only glow: soft lime halo on the primary
  button. Subtle topographic contour texture (~12% opacity, overlay) behind the hero.

Voice & details
- Earnest, grounded, warm — a living forest field-guide, not a SaaS dashboard.
- Almost no icons: short uppercase mono text labels (GH, X, YT, RSS). Links end in "→".
- Accessibility: AA contrast, lime focus rings, 44px touch targets on mobile, real text.

SITE CHROME (include on the frame)
- Sticky 72px header: wordmark "Greenpill" left; nav Chapters · Guilds · Library · Stories ·
  Garden; "Library" carries a small lime dot (active). Mobile: hamburger.
- Footer, 4 columns:
  NETWORK — Chapters · Guilds & Working Groups · Garden · Code of Conduct
  GET INVOLVED — Start in the Garden · Events calendar (Luma) · Join the map · Talk to a steward
  RESOURCES — Library · Stories · Podcast
  CONNECT — X / Twitter · Farcaster · Telegram · LinkedIn · YouTube · Regen Hub
  Bottom mono row: greenpill.network · 2026 Greenpill Network · Ecoregion boundaries: RESOLVE
  Ecoregions 2017, CC-BY 4.0.

PAGE STRUCTURE (top to bottom)

1. HERO (topo texture wash)
   - Overline "LIBRARY" · H1 (gold serif) "Everything we have made public."
   - Dek: "Books, podcast conversations, and Garden guides from across the Greenpill network."
   - CTAs: primary lime "Browse books" + ghost "Listen to the podcast".
   - Stat strip (mono, hairline-divided): "13 BOOKS & ZINES" · "296 PODCAST EPISODES" ·
     "15 TRANSLATIONS" · "ALL FREE & PUBLIC".

2. SHELF ROW 1 — "Written by Greenpill"
   - Overline "BOOKS · WRITTEN BY GREENPILL" · H3 row title "The foundation shelf."
   - Four large 2:3 book covers with serif index numerals (01–04), title, and a small
     translations chip where relevant: Greenpill v0 ("11 translations"), Impact DAOs
     ("1 translation"), Onchain Capital Allocation, Onchain Impact Networks.
     (The exact four Greenpill-written titles may be swapped at build time — hold four slots.)

3. SHELF ROW 2 — "From the wider shelf"
   - Overline "BOOKS · COMMUNITY & ADJACENT" — smaller covers, denser row (6–8 across):
     Pathways to Regeneration · Ethereum Localism · Grassroots Economics · Exploring MycoFi
     ("3 translations") · Future History of the Open Internet · Comics · Stuff Crypto OGs Know.
   - End the row with one dashed-border "New addition on the way" slot [illustrative] — a book
     being added to the shelf soon.

4. PODCAST — by season & series
   - Overline "PODCAST · 296 EPISODES" · H2 "A long-running public conversation."
   - Featured episode card: cover art, mono "LATEST", title "S.10 Ep.11 — $170M to Fix Ethereum
     Security with Griff Green", inline audio player bar (play pill, scrubber, duration),
     ghost CTA "Listen on Apple Podcasts" + "Watch on YouTube →".
   - Below: a horizontal series rail (prev/next pill arrows) of season/series cards, each with
     cover thumb, series name, episode count, and a one-line collaborator credit:
     · "Main show · Seasons 1–10 · hosted by Kevin Owocki"
     · "VDAO series · 12 episodes · with VDAO"
     · "Network Nations series · 15 episodes · with Network Nations"
     · "JournoDAO season · with JournoDAO"
   - Small mono footnote row: "APPLE · YOUTUBE · RSS".

5. GARDEN HAND-OFF — single CTA band
   - Full-width strip (soft gold-tinted surface): eyebrow "GARDEN", title "Enter the Garden",
     summary "A public onboarding ramp from a light newsletter subscription to a high-intent
     steward call.", ghost pill "Open Garden". (This replaces the old Tools & Guides grid —
     no guild tiles on this page anymore.)

6. ARCHIVE — quiet bottom strip
   - Overline "ARCHIVE · GREENPILL ARTIFACTS" + one muted line: "Earlier guides and working
     documents, kept as part of our history — headed for the Knowledge Commons." [refresh ok]
   - One compact row of small, deliberately quiet cards (mono title + "→"): Local Regen Guide ·
     Green Goods docs · Regen Protocols · Public Goods Staking Protocol v0 · Regen Coordination
     Hub threads. Visually subordinate: smaller type, dimmer text, thin borders, no imagery.

7. FOOTER (per chrome spec).

STATES & RESPONSIVE
- Featured episode player shown in a playing state (progress partly filled).
- Book cover hover: slight lift + lime border tint.
- Mobile 375: stat strip wraps 2×2; foundation shelf 2-up; wider shelf a horizontal scroll row;
  series rail swipes; archive stacks.

AVOID
- No guild cards or "working circles" tile on this page. No big guide grid — guides only in the
  quiet archive strip. No icon fonts, no light theme, no lorem, one lime primary per screen.

DELIVER
- First response: THREE full-page desktop 1440px frames — V1, V2, V3 — each the complete page.
- Label every frame with its variant name. Annotate, outside the canvas: which existing gp
  primitive each section builds on (or NEW COMPONENT), plus the series-rail and audio-player
  interactions.
- After I pick a direction: produce the full-page mobile 375px companion of the winner and
  iterate on that direction only.
- Use the copy above verbatim except lines tagged [refresh ok].
```

---

## Prompt 3 — Guild page (Dev Guild template + Writers Guild variant)

```text
Design a hi-fi wireframe for the Guild page template of greenpill.network — the public home of
a working guild inside the Greenpill Network, a global regenerative network of chapters,
guilds, and storytellers. Each guild page must be strong enough to serve as the guild's
linkable homepage. Produce TWO desktop frames from one template: (A) Dev Guild, (B) Writers
Guild — same skeleton, different content emphasis. Audience: potential contributors, partner
orgs, and grant reviewers checking what the guild ships.

CODEBASE — the repo is linked to this session
The greenpill/network monorepo is attached. Before designing, ground yourself in:
- packages/website/src/styles/gp-tokens.css — the canonical --gp-* design tokens.
- packages/website/DESIGN.md — the UI contract, including the per-page reflow matrix.
- packages/website/src/components/ui/ — the primitive vocabulary (Button, Card, Chip,
  StatusChip, Text, Overline, Meta, ArrowLink, Container, SectionHeader, Avatar, AvatarStack,
  EmailInput, LinkRow, CtaStrip, RailArrows) and src/components/shell/ (SiteHeader, SiteFooter).
- packages/website/src/pages/guilds/[slug].astro — the guild template as it exists today; this
  design replaces it. Guild data: src/data/operational-content-seed/guilds/.
Build on that vocabulary: compose and evolve the existing primitives rather than inventing a
parallel component language, and annotate each section with the primitive it builds on (or a
clearly flagged NEW COMPONENT proposal) — these wireframes will be implemented in this exact
codebase. The design-system digest below summarizes the token file; where they disagree, the
repo wins. If the repo is not attached, the digest is sufficient on its own.

VARIANTS — produce three distinct directions of this template
Hold constant across all three: the template structure and content below, the chrome, the token
palette and type roles, and every AVOID rule. Vary composition, density, and expressive range:
- V1 · FIELD GUIDE — faithful evolution. Closest to the current site: same component feel,
  tightened composition, better rhythm and polish. The safe baseline.
- V2 · EDITORIAL ATLAS — push the print/editorial register: stronger serif moments, bolder
  type-scale contrast, magazine-style grids, gold used with more confidence.
- V3 · LIVING NETWORK — the most expressive: may express projects, media, and hats as one
  connected system (subtle threads between cards) — though the hats section itself stays a
  list, never a diagram. Still dark-forest, still token-true, still buildable.

DESIGN SYSTEM — "Greenpill" (digest of gp-tokens.css — apply exactly)

Canvas & color
- Dark, warm forest canvas. Page background #0F3D2E (deepest wells #0A2D21), raised surface
  #143F30, card #1A4D3A, elevated card #235C46, hairline borders #2A6B52 at ~55% opacity.
- Accent: Greenpill Lime #B8E835 — exactly ONE lime primary action per screen; hover #C4F02C.
- Headlines: Steward Gold #F0DCA0 — display/headline text and quiet emphasis only. Gold is
  never a button or link color.
- Text: #FAF7EE body, #E8E2D4 muted, #B8B0A0 only for large dim metadata.
- Error/attention: terracotta #E07856 (never red). Info: #5BA889. No grey, no pure black/white.

Typography
- Spectral (serif) for display + headlines only — always gold. Display ≈72px desktop / 42px
  mobile; H2 ≈40/30; H3 ≈28/22.
- Manrope (sans) for all body/UI — on THIS template run body at 17–18px: guild pages read too
  small today and the call asked for bigger text.
- JetBrains Mono, uppercase, letterspaced, ~11–12px, for overlines and technical metadata only.

Shape & rhythm
- Pill radius on every button, chip, input, avatar. Cards 20px radius. 8px spacing scale,
  generous section padding. Content max-width ~1280px on 1440 canvas.
- Depth = stepping the green scale, not shadows. Only glow: soft lime halo on the primary
  button. Subtle topographic contour texture (~12% opacity, overlay) behind the hero.

Voice & details
- Earnest, grounded, warm — a living forest field-guide, not a SaaS dashboard.
- Almost no icons: short uppercase mono text labels (GH, X, TG, YT, HUB). Links end in "→".
- Accessibility: AA contrast, lime focus rings, 44px touch targets on mobile, real text.

SITE CHROME (include on the frames)
- Sticky 72px header: wordmark "Greenpill" left; nav Chapters · Guilds · Library · Stories ·
  Garden; "Guilds" carries a small lime dot (active). Mobile: hamburger.
- Footer, 4 columns:
  NETWORK — Chapters · Guilds & Working Groups · Garden · Code of Conduct
  GET INVOLVED — Start in the Garden · Events calendar (Luma) · Join the map · Talk to a steward
  RESOURCES — Library · Stories · Podcast
  CONNECT — X / Twitter · Farcaster · Telegram · LinkedIn · YouTube · Regen Hub
  Bottom mono row: greenpill.network · 2026 Greenpill Network · Ecoregion boundaries: RESOLVE
  Ecoregions 2017, CC-BY 4.0.

TEMPLATE STRUCTURE (top to bottom)

1. HERO (topo texture) — identity + THE LINKS UP TOP
   - Breadcrumb "← Guilds & Working Groups".
   - Overline "GUILD · ACTIVE · FOUNDED {year}" · H1 (gold serif) guild name · one-liner ·
     2–3 theme chips.
   - Directly in the hero, above the fold: a KEY LINKS row of pill link-buttons with mono
     labels — this is the point of the redesign; a visitor must reach the guild's core
     surfaces without scrolling.

2. MANDATE — condensed two-column strip
   - Left: one short mandate paragraph. Right: three numbered principles (serif numerals,
     bold title + one line each).

3. WORK — the guild's shipped output (content varies by guild, see variants)

4. MEDIA & APPEARANCES — replaces the old "Public Proof" section entirely
   - Overline "MEDIA · INTERVIEWS & BUILDER SPACES" · H2 "See the guild in motion." [refresh ok]
   - Lead card: an embedded YouTube player (16:9 thumbnail with play pill) for a recent
     interview or builder space recording.
   - Beside/below: a list of media rows — mono source label, title, "→": podcast appearances,
     builder-space recordings, interviews. This section is warm and alive (video + faces),
     not a data table.

5. HATS & ROLES — structured list (NOT an org-chart diagram)
   - Overline "HATS · HOW THE GUILD IS ORGANIZED".
   - Grouped list rows: group heading (mono) → hat rows (hat name, holder avatar + name or an
     "Open hat" chip in gold outline, small "→" link). Three groups [illustrative]:
     "GUILD STEWARDSHIP" (Guild Steward, Operations), "PROJECT LEADS" (one per flagship
     project), "CONTRIBUTOR HATS" (open roles). Keep it list-clean and scannable.

6. CONTRIBUTORS
   - Overline "PEOPLE · PUBLIC CONTRIBUTORS" — avatar grid (10–14 people), name + role beneath.
     More faces than today: contribution should be visibly credited.

7. CONNECT + CTA
   - Link rows (mono glyph label + name + handle + "→") for the guild's channels.
   - Full-width CTA band: "Bring your craft into the guild." + ghost pill "Start in the Garden".

FRAME A — DEV GUILD
- Hero: name "Dev Guild" · overline "GUILD · ACTIVE · FOUNDED 2023" · one-liner "Building
  open-source coordination tools for the regenerative network."
- KEY LINKS row: "GH GitHub" · "KARMA Karma GAP" · "GG Green Goods" · "X Twitter" ·
  "LUMA Builder spaces".
- Principles: "Public by default" — "Use public repositories, public docs, and public grant
  updates whenever they can carry the claim." · "Integrate before rebuilding" — "Frame the
  guild around practical coordination infrastructure and integrations with tools such as EAS,
  Gitcoin, Allo, KarmaGAP, and Green Goods." · "Chapter-informed tooling" — "Show how tools
  support local chapters and real regenerative work, not software for its own sake."
- WORK section = "PROJECTS · ACTIVE" grid of six cards (name, one-liner, mono tech chips,
  "Repo →" / "Live →"): Green Goods "Offline-first impact verification for regenerative work."
  · Cookie Jar "Smart-contract-governed funding pools for DAOs and communities." · Grant Ships
  "Grant-allocation game and public-goods funding experiment." · GreenWill "Public-good
  reputation and pay-it-forward activity tooling." · Public Goods Staking Protocol "Validator
  infrastructure and vault routing for regenerative funding." · Greenpill Network website
  "Public front door for chapters, Library, Stories, Guilds, and the map."
  Show ONLY active projects — no experimental or inactive entries.
- Media rows: "CRYPTO ALTRUISM PODCAST — Trailblazers of Octant Ep. 4: Greenpill Dev Guild" ·
  "YOUTUBE — Builder space recordings" · "PARAGRAPH — Dev Guild public writing".
- Connect: GitHub (greenpill-dev-guild) · Dev Guild Paragraph (@greenpilldevguild) · Builder
  spaces (Luma).

FRAME B — WRITERS GUILD (same skeleton, content differences only)
- Hero: name "Writers Guild" · overline "GUILD · ACTIVE · FOUNDED 2024" · one-liner "Stories,
  translations, field reports, and public knowledge work for the network."
- KEY LINKS row: "PG Paragraph" · "X Twitter curation" · "POD Greenpill Podcast" · "HUB Regen Hub".
- WORK section = "PUBLISHED BY THE GUILD" — four content shelves instead of a projects grid,
  each with a contributor credit line (crediting real people is the point):
  · Books — mini-row of 2:3 covers the guild wrote and produced, with translation chips
    (e.g. "Greenpill v0 · 11 translations").
  · Newsletters — "Field notes" digest card + Paragraph link.
  · Translations — "15 translations across the shelf" with language chips [illustrative].
  · Toolkit series — "Regen toolkit series · knowledge-commons groundwork" credited to the
    guild's funded contributors.
  Each shelf row ends with a mono credit line, e.g. "CONTRIBUTORS — Sarah · Matty · +6".
- Media & appearances: "GREENPILL PODCAST — 296 public episodes" as the lead media card.
- Hats & roles and Contributors sections: same structure as Frame A.

STATES & RESPONSIVE
- One hover state on a project card (lime border tint). "Open hat" chips in gold outline.
- Mobile 375 (Dev Guild only): key-links row wraps to 2 rows of pills above the fold; projects
  stack; hats list keeps its grouped structure.

AVOID
- No "Public Proof" section or label anywhere. No inactive projects. No org-chart/tree diagram
  for hats — it is a list. No icon fonts, no light theme, no lorem, one lime primary per frame.

DELIVER
- First response: THREE desktop 1440px frames of Frame A (Dev Guild) — V1, V2, V3.
- Label every frame with its variant name. Annotate, outside the canvas: which existing gp
  primitive each section builds on (or NEW COMPONENT).
- After I pick a direction: apply the winning direction to Frame B (Writers Guild) at 1440px
  and produce the mobile 375px companion of Frame A.
- Use the copy above verbatim except lines tagged [refresh ok]; [illustrative] entries keep
  their slot but the words may change later.
```

---

## Prompt 4 — Garden

```text
Design a hi-fi wireframe for the Garden page of greenpill.network — the public onboarding ramp
of the Greenpill Network, a global regenerative network of chapters, guilds, and storytellers.
The Garden meets newcomers at their own pace: three public, low-pressure steps, plus the
network's operating documents. Audience: people who just found Greenpill and want a next step
that isn't a commitment.

CODEBASE — the repo is linked to this session
The greenpill/network monorepo is attached. Before designing, ground yourself in:
- packages/website/src/styles/gp-tokens.css — the canonical --gp-* design tokens.
- packages/website/DESIGN.md — the UI contract, including the per-page reflow matrix.
- packages/website/src/components/ui/ — the primitive vocabulary (Button, Card, Chip,
  StatusChip, Text, Overline, Meta, ArrowLink, Container, SectionHeader, Avatar, AvatarStack,
  EmailInput, LinkRow, CtaStrip, RailArrows) and src/components/shell/ (SiteHeader, SiteFooter).
- packages/website/src/pages/garden/index.astro and src/content/garden.json — the Garden as it
  exists today; this design replaces it (the GardenAssessment component is being removed).
Build on that vocabulary: compose and evolve the existing primitives rather than inventing a
parallel component language, and annotate each section with the primitive it builds on (or a
clearly flagged NEW COMPONENT proposal) — these wireframes will be implemented in this exact
codebase. The design-system digest below summarizes the token file; where they disagree, the
repo wins. If the repo is not attached, the digest is sufficient on its own.

VARIANTS — produce three distinct directions of this page
Hold constant across all three: the section order and content below, the chrome, the token
palette and type roles, and every AVOID rule. Vary composition, density, and expressive range:
- V1 · FIELD GUIDE — faithful evolution. Closest to the current site: same component feel,
  tightened composition, better rhythm and polish. The safe baseline.
- V2 · EDITORIAL ATLAS — push the print/editorial register: stronger serif moments, bolder
  type-scale contrast, generous margins, gold used with more confidence.
- V3 · LIVING NETWORK — the most expressive: lean into growth motifs for the three-step ramp —
  the source data already stages steps as seed → sapling → flowering — expressed through
  texture and illustration, never icon fonts. Still dark-forest, token-true, buildable.

DESIGN SYSTEM — "Greenpill" (digest of gp-tokens.css — apply exactly)

Canvas & color
- Dark, warm forest canvas. Page background #0F3D2E (deepest wells #0A2D21), raised surface
  #143F30, card #1A4D3A, elevated card #235C46, hairline borders #2A6B52 at ~55% opacity.
- Accent: Greenpill Lime #B8E835 — exactly ONE lime primary action per screen; hover #C4F02C.
- Headlines: Steward Gold #F0DCA0 — display/headline text and quiet emphasis only. Gold is
  never a button or link color.
- Text: #FAF7EE body, #E8E2D4 muted, #B8B0A0 only for large dim metadata.
- Error/attention: terracotta #E07856 (never red). Info: #5BA889. No grey, no pure black/white.

Typography
- Spectral (serif) for display + headlines only — always gold. Display ≈72px desktop / 42px
  mobile; H2 ≈40/30; H3 ≈28/22.
- Manrope (sans) for all body/UI at 16px / 1.6.
- JetBrains Mono, uppercase, letterspaced, ~11–12px, for overlines and technical metadata only.

Shape & rhythm
- Pill radius on every button, chip, input, avatar. Cards 20px radius. 8px spacing scale,
  generous section padding. Content max-width ~1280px on 1440 canvas.
- Depth = stepping the green scale, not shadows. Only glow: soft lime halo on the primary
  button. Subtle topographic/garden texture (~12% opacity, overlay) behind the hero.

Voice & details
- Earnest, grounded, warm — a living forest field-guide, not a SaaS dashboard.
- Almost no icons: short uppercase mono text labels (X, TG, HUB, PDF). Links end in "→".
- Accessibility: AA contrast, lime focus rings, 44px touch targets on mobile, real text,
  labeled form fields.

SITE CHROME (include on the frame)
- Sticky 72px header: wordmark "Greenpill" left; nav Chapters · Guilds · Library · Stories ·
  Garden; "Garden" carries a small lime dot (active). Mobile: hamburger.
- Footer, 4 columns:
  NETWORK — Chapters · Guilds & Working Groups · Garden · Code of Conduct
  GET INVOLVED — Start in the Garden · Events calendar (Luma) · Join the map · Talk to a steward
  RESOURCES — Library · Stories · Podcast
  CONNECT — X / Twitter · Farcaster · Telegram · LinkedIn · YouTube · Regen Hub
  Bottom mono row: greenpill.network · 2026 Greenpill Network · Ecoregion boundaries: RESOLVE
  Ecoregions 2017, CC-BY 4.0.

PAGE STRUCTURE (top to bottom)

1. HERO (garden texture wash)
   - Overline "GARDEN" · H1 (gold serif) "Enter the garden."
   - Summary: "Three public, low-pressure ways to meet Greenpill: subscribe to field notes,
     join the public conversation, then book a steward call when a human conversation is the
     right next step." [refresh ok]
   - Small sticky pill (bottom-right of viewport): "Start with Step 1".

2. STEP 1 — Stay in the loop (large card)
   - Kicker (mono) "STEP 1 · STAY IN THE LOOP" + commitment label reworded away from
     "friction" language [refresh ok] — e.g. "Start light".
   - H3 "Subscribe to field notes" · body "An occasional public digest with chapter updates,
     new resources, podcast highlights, and upcoming calls. Unsubscribe any time."
   - Form row: pill email input (labeled "Email") + lime pill "Subscribe" — PERFECTLY aligned
     on one baseline; this exact misalignment is a bug being fixed, so make the alignment
     obviously deliberate at desktop and stacked-full-width at mobile.
   - Beneath the form, a quiet low-friction actions row: "Listen to the podcast →" ·
     "Follow on X →" (the podcast is the lowest-friction thing a visitor can do — keep it here).
   - Mono meta: "PUBLIC UPDATES · UNSUBSCRIBE ANYTIME · NO ACCOUNT".

3. STEP 2 — Join the public conversation (large card)
   - Kicker "STEP 2 · LURK OR CHAT" + commitment label [refresh ok].
   - H3 "Join the public conversation" · body "Drop into the shared Greenpill chat and listen
     before you contribute. Lurk as long as you like — nobody is keeping score."
   - CTAs: ghost pill "Open Telegram" + link "Read the Regen Hub →".
   - Mono meta: "PUBLIC CONVERSATION · LISTEN FIRST".

4. STEP 3 — Book a steward call (large card, the human step, always last)
   - Kicker "STEP 3 · HUMAN-TO-HUMAN" + commitment label [refresh ok].
   - H3 "Book a steward call" · body "For people thinking about starting a chapter, joining a
     guild, partnering on a project, or finding the right steward to talk with."
   - CTA: ghost pill "Book a call" · mono meta "PRIVATE · BY REQUEST".
   - (There is NO Regen Assessment step on this page — exactly three steps, renumbered 1–3.)

5. HOW THE NETWORK OPERATES — new gold-accented document block
   - Overline "NETWORK STRUCTURE · HOW WE OPERATE" · H2 "How the network operates." [refresh ok]
   - Three document cards (mono source tag, serif title, one-line summary, "→"):
     · "REGEN HUB — Code of Conduct" · "The network's new shared agreements for participation."
       [illustrative summary]
     · "PDF — Network structure" · "How chapters, guilds, and working groups fit together."
       [illustrative summary]
     · "REGEN HUB — How the network operates" · "The living post on coordination and cadence."
       [illustrative summary]
   - This block uses gold accents (steward emphasis) and sits calmly between the ramp and the
     after-cards.

6. AFTER THE RAMP — three pointer cards
   - "If you want local connection" → "Find an existing chapter" → ghost "Browse chapters".
   - "If you want to build" → "Find a contribution path" → ghost "Visit Dev Guild".
   - "If you want to learn" → "Read the public commons" → ghost "Open Library".

7. FOOTER (per chrome spec).

STATES & RESPONSIVE
- Email field shown twice in a small annotation strip: focus state (lime ring) and success
  state ("Check your inbox — one click to confirm." in info green); error uses terracotta
  #E07856, never red.
- Mobile 375: steps stack full-width; form stacks (input above button, both full-width);
  sticky "Start with Step 1" pill stays reachable; 44px targets.

AVOID
- No Regen Assessment, quiz, or self-assessment anywhere. No "friction" wording in labels.
  No fourth step. No icon fonts, no light theme, no lorem, one lime primary per screen.

DELIVER
- First response: THREE full-page desktop 1440px frames — V1, V2, V3 — each the complete page.
- Label every frame with its variant name. Annotate, outside the canvas: which existing gp
  primitive each section builds on (or NEW COMPONENT), plus the form states (focus, success,
  terracotta error).
- After I pick a direction: produce the full-page mobile 375px companion of the winner and
  iterate on that direction only.
- Use the copy above verbatim except lines tagged [refresh ok]; [illustrative] summaries keep
  their slot but the words may change.
```

---

## Prompt 5 — Guilds & Working Groups (new page)

```text
Design a hi-fi wireframe for a NEW page on greenpill.network: "Guilds & Working Groups" — the
directory of how the Greenpill Network organizes its work. Greenpill is a global regenerative
network of local chapters, builder guilds, and storytellers. Guilds are long-running craft
circles (builders, writers); working groups are purpose-scoped teams that form and dissolve.
This page is also a living history: groups are added, not deleted. Audience: contributors
choosing where to plug in, and members linking "here's how we're organized."

CODEBASE — the repo is linked to this session
The greenpill/network monorepo is attached. Before designing, ground yourself in:
- packages/website/src/styles/gp-tokens.css — the canonical --gp-* design tokens.
- packages/website/DESIGN.md — the UI contract, including the per-page reflow matrix.
- packages/website/src/components/ui/ — the primitive vocabulary (Button, Card, Chip,
  StatusChip, Text, Overline, Meta, ArrowLink, Container, SectionHeader, Avatar, AvatarStack,
  EmailInput, LinkRow, CtaStrip, RailArrows) and src/components/shell/ (SiteHeader, SiteFooter).
- This page does not exist yet. Its closest existing patterns are
  packages/website/src/pages/guilds/[slug].astro and src/pages/chapters/index.astro; the live
  token gallery is src/pages/design-system.astro.
Build on that vocabulary: compose and evolve the existing primitives rather than inventing a
parallel component language, and annotate each section with the primitive it builds on (or a
clearly flagged NEW COMPONENT proposal) — these wireframes will be implemented in this exact
codebase. The design-system digest below summarizes the token file; where they disagree, the
repo wins. If the repo is not attached, the digest is sufficient on its own.

VARIANTS — produce three distinct directions of this page
Hold constant across all three: the section order and content below, the chrome, the token
palette and type roles, and every AVOID rule. Vary composition, density, and expressive range:
- V1 · FIELD GUIDE — faithful evolution. Closest to the current site: same component feel,
  tightened composition, better rhythm and polish. The safe baseline.
- V2 · EDITORIAL ATLAS — push the print/editorial register: stronger serif moments, bolder
  type-scale contrast, magazine-style grids, gold used with more confidence.
- V3 · LIVING NETWORK — the most expressive: may visualize the living history as growth rings
  or a rooted timeline — expressive but quiet, and never an org-chart. Still dark-forest,
  still token-true, still buildable.

DESIGN SYSTEM — "Greenpill" (digest of gp-tokens.css — apply exactly)

Canvas & color
- Dark, warm forest canvas. Page background #0F3D2E (deepest wells #0A2D21), raised surface
  #143F30, card #1A4D3A, elevated card #235C46, hairline borders #2A6B52 at ~55% opacity.
- Accent: Greenpill Lime #B8E835 — exactly ONE lime primary action per screen; hover #C4F02C.
- Headlines: Steward Gold #F0DCA0 — display/headline text and quiet emphasis only. Gold is
  never a button or link color.
- Text: #FAF7EE body, #E8E2D4 muted, #B8B0A0 only for large dim metadata.
- Error/attention: terracotta #E07856 (never red). Info: #5BA889. No grey, no pure black/white.

Typography
- Spectral (serif) for display + headlines only — always gold. Display ≈72px desktop / 42px
  mobile; H2 ≈40/30; H3 ≈28/22.
- Manrope (sans) for all body/UI at 16px / 1.6.
- JetBrains Mono, uppercase, letterspaced, ~11–12px, for overlines and technical metadata only.

Shape & rhythm
- Pill radius on every button, chip, input, avatar. Cards 20px radius. 8px spacing scale,
  generous section padding. Content max-width ~1280px on 1440 canvas.
- Depth = stepping the green scale, not shadows. Only glow: soft lime halo on the primary
  button. Subtle topographic contour texture (~12% opacity, overlay) behind the hero.

Voice & details
- Earnest, grounded, warm — a living forest field-guide, not a SaaS dashboard.
- Almost no icons: short uppercase mono text labels (GH, X, PG, HUB). Links end in "→".
- Accessibility: AA contrast, lime focus rings, 44px touch targets on mobile, real text.

SITE CHROME (include on the frame)
- Sticky 72px header: wordmark "Greenpill" left; nav Chapters · Guilds · Library · Stories ·
  Garden; "Guilds" carries a small lime dot (active). Mobile: hamburger.
- Footer, 4 columns:
  NETWORK — Chapters · Guilds & Working Groups · Garden · Code of Conduct
  GET INVOLVED — Start in the Garden · Events calendar (Luma) · Join the map · Talk to a steward
  RESOURCES — Library · Stories · Podcast
  CONNECT — X / Twitter · Farcaster · Telegram · LinkedIn · YouTube · Regen Hub
  Bottom mono row: greenpill.network · 2026 Greenpill Network · Ecoregion boundaries: RESOLVE
  Ecoregions 2017, CC-BY 4.0.

PAGE STRUCTURE (top to bottom)

1. HERO (topo texture)
   - Overline "GUILDS · WORKING GROUPS" · H1 (gold serif) "Where the network does its work."
     [refresh ok]
   - Dek: "Guilds are long-running craft circles. Working groups form around a purpose and
     hand their work back to the network. Both leave a public trail." [refresh ok]
   - Stat strip (mono): "2 ACTIVE GUILDS" · "1 FORMING WORKING GROUP" · "9 SHIPPED PROJECTS" ·
     "296 PODCAST EPISODES".

2. ACTIVE GUILDS — two large feature cards
   - Overline "GUILDS · ACTIVE".
   - Card: status chip "Active" (lime soft), serif guild name, one-liner, mono founded line,
     a mini key-links row of small pills, footer "Visit guild →".
     · Dev Guild — "Building open-source coordination tools for the regenerative network." ·
       "FOUNDED 2023" · links "GH GitHub · KARMA Karma GAP · GG Green Goods" · mono strip
       "Green Goods · Cookie Jar · Grant Ships".
     · Writers Guild — "Stories, translations, field reports, and public knowledge work for
       the network." · "FOUNDED 2024" · links "PG Paragraph · X Twitter · POD Podcast" · mono
       strip "Books · newsletters · 15 translations".
   - The card grid must scale gracefully to 3–4 guilds (a third guild may become public later)
     — show the two cards at a width that clearly tiles.

3. WORKING GROUPS
   - Overline "WORKING GROUPS · PURPOSE-SCOPED" · one muted intro line [refresh ok].
   - Card: Growth Working Group — status chip "Forming" (gold outline), one-liner "Coordinating
     network growth, partnerships, and storytelling reach." [illustrative], ghost CTA
     "Express interest →".
   - Beside it, a dashed-border invitation card: "Start a working group" — "Have a purpose that
     needs a team? Raise it on the Hub or bring it to a steward call." + link "Post on the
     Hub →". (This is an empty-state pattern, not a form.)

4. LIVING HISTORY — the archive that grows
   - Overline "LIVING HISTORY · GROUPS ARE ADDED, NOT DELETED" · H2 "What came before." [refresh ok]
   - A vertical list of history rows (year range in mono, serif title, one-line summary, credit
     line, "→"), visually quieter than the sections above:
     · "2023–2024 — Regen toolkit series" · "Writers Guild-funded groundwork for the knowledge
       commons." · credit "Writers Guild contributors" [illustrative]
     · "2022–2023 — The guides era" · "Local Regen Guide and the first field guides, now
       archived in the Library." [illustrative]
     · "2022–ongoing — Podcast collaborator seasons" · "VDAO, Network Nations, and JournoDAO
       seasons produced with partner communities." [illustrative]
     · "2022–ongoing — Translation waves" · "Greenpill v0 carried into 11 languages by
       volunteer translators." [illustrative]
   - Each row's credit line exists to make contribution visible.

5. CTA BAND
   - "Have a craft the network needs?" [refresh ok] + primary lime pill "Start in the Garden" +
     ghost "Talk to a steward".

6. FOOTER (per chrome spec).

STATES & RESPONSIVE
- Guild card hover: lime border tint + elevated green. "Forming" chip in gold outline.
- Mobile 375: stat strip wraps 2×2; guild cards stack; history rows keep the mono year column
  as a top label; 44px targets.

AVOID
- No org-chart diagrams. No member rosters or private info — public credits only. No icon
  fonts, no light theme, no lorem outside [illustrative] slots, one lime primary per screen.

DELIVER
- First response: THREE full-page desktop 1440px frames — V1, V2, V3 — each the complete page.
- Label every frame with its variant name. Annotate, outside the canvas: which existing gp
  primitive each section builds on (or NEW COMPONENT).
- After I pick a direction: produce the full-page mobile 375px companion of the winner and
  iterate on that direction only.
- Use the copy above verbatim except lines tagged [refresh ok]; [illustrative] entries keep
  their slot but the words may change.
```

---

## Appendix — decision coverage map

Every decision from the Jul 16 call and the follow-up Q&A, and where it lands:

| Call/Q&A decision | Where it appears |
|---|---|
| Map fills its container (ThinkPad sizing bug) | Prompt 1 · Hero (marked CRITICAL) |
| Keep Chapters/Stewards/Members filters + reset affordance | Prompt 1 · Hero overlay + states |
| "Join the map" label (replaces "Submit yourself") | Prompt 1 hero · all footers (Get involved) |
| Hide Knowledge Map + Toolkit tiles | Prompt 1 · Commons ("Nothing else in this bento") + Avoid |
| Guilds section on homepage (2 cards) | Prompt 1 · Section 4 |
| Ecosystem categorized rows; full partner roster + tools row | Prompt 1 · Section 5 |
| "Join the conversation" + Hub link; Field Notes + Twitter | Prompt 1 ramp card 02 · Prompt 4 steps 1–2 |
| Footer: Farcaster rename, LinkedIn, YouTube, Luma, CoC, Guilds | Chrome block in all five prompts |
| Guild key links up top (GitHub, Karma, Green Goods, Twitter) | Prompt 3 · Hero key-links row |
| Remove inactive projects | Prompt 3 · Frame A Work + Avoid |
| Public Proof → media/content section (YouTube, interviews, builder spaces) | Prompt 3 · Section 4 + Avoid |
| Hats Tree as structured list | Prompt 3 · Section 5 + Avoid (no diagram) |
| More public contributors credited | Prompt 3 · Section 6 |
| Guild text bigger | Prompt 3 · Typography note (17–18px body) |
| Writers Guild: books, newsletters, translations, toolkit series, Twitter curation, contributor credits | Prompt 3 · Frame B |
| Library: GP-written four lead, second row for the wider shelf | Prompt 2 · Sections 2–3 |
| Daniel's book slot incoming | Prompt 2 · "New addition on the way" slot |
| Old guides demoted to quiet archive / Knowledge Commons | Prompt 2 · Section 6 |
| Podcast by season/series with collaborators | Prompt 2 · Section 4 |
| Guilds tile removed from Library | Prompt 2 · Section 5 + Avoid |
| Garden: Regen Assessment removed, 3 steps renumbered | Prompt 4 · Steps + Avoid |
| Subscribe button alignment + multi-action low-friction row | Prompt 4 · Step 1 |
| "Friction" labels reframed | Prompts 1 & 4 · [refresh ok] commitment labels |
| Steward call last (human step) | Prompt 4 · Step 3 · Prompt 1 card 03 |
| Code of Conduct + network-structure PDF + Hub posts on Garden | Prompt 4 · Section 5 |
| New Guilds & Working Groups page (guilds + WGs + living history) | Prompt 5 |
| Growth WG "forming" card | Prompt 5 · Section 3 |
| Living history credits contribution | Prompt 5 · Section 4 |
| Copy verbatim; refresh only flagged spots | `[refresh ok]` convention, all prompts |
| Evolve within the gp-token system | Design-system block, all prompts |
| Full chrome on every frame; Guilds in primary nav | Chrome block, all prompts |
| Three variants per page (V1 Field Guide · V2 Editorial Atlas · V3 Living Network) | Variants + Deliver blocks, all prompts |
| Claude Design builds on the linked repo (tokens, DESIGN.md, ui primitives, current page files) | Codebase blocks, all prompts |
| Desktop 1440 ×3 variants first; mobile 375 of the chosen winner | Deliver block, all prompts |

**Implementation-only items (not wireframe concerns):** the actual map rendering fix, LinkedIn profile refresh, compiling the canonical link list, Matt DM'ing Daniel about his book, stories-page source-system work (deferred), consulting Gu.
