# Claude Design prompt: home map P1 information layout

A sixth prompt for the [wireframe prompt set](claude-design-wireframe-prompts.md), written for the map on the home page rather than a whole page. It covers P1 of the [map polish audit](map-polish-audit.md) (items 6 to 10), which the audit says to design together before anyone builds it. Linear: PRD-1424, a child of PRD-739.

**Status, 2026-11-07:** the three variants were drawn from live public map data on a private Claude Design canvas in Afo's account, <https://claude.ai/artifact/5Q6JNPPZDp5PbjydrM8QYQ> (share it from the canvas before anyone else can open it). Afo picked **V1 Field Guide**, the docked inspector, a phone map of at least 60svh with one row of controls, and filters that narrow and then add. The decisions, and what the build changes, are in [map-polish-audit.md § 5](map-polish-audit.md#5-p1-decisions-2026-11-07).

**How to use**

1. As with the page prompts: link the `greenpill/network` repo to the Claude Design project, then paste the whole fenced block into one session.
2. It asks for three named variants of the same map: V1 Field Guide, V2 Editorial Atlas, V3 Living Network, the same three theses as the page prompts.
3. After you pick, keep iterating in the same session; the prompt asks for the 375 companion of the winner.
4. Tags: `[refresh ok]` copy may be rewritten; `[illustrative]` keeps its slot while the words change; `[live data]` is filled from the public `/map/state` when the map renders. Untagged copy is real and appears verbatim.

Where the data comes from: chapter names, cities and weights from `packages/website/src/data/operational-content-snapshot.json`; counts and theme totals from the public `https://agent.greenpill.network/map/state` on 2026-11-07. People appear only as `[live data]` slots, apart from Matty Compost, whom the audit already names.

```text
Design hi-fi wireframes for the interactive world map that opens the homepage of
greenpill.network: the Greenpill Network's live map of local chapters, stewards and members,
joined by theme-tinted "mycelial threads". Audience: newcomers deciding whether these are their
people, and members looking for each other. This round is the map's information layout: what
shows on hover and on selection, how the filters and the list work, and how it all fits a
phone. The drawing itself (dot-grid land, node styles, threads, overlap badges) stays as is.

CODEBASE: the repo is linked to this session
The greenpill/network monorepo is attached. Before designing, ground yourself in:
- packages/website/src/styles/gp-tokens.css: the canonical --gp-* design tokens.
- packages/website/DESIGN.md: the UI contract. Read the Home row of the reflow matrix, the
  "Map / data overlays" reflow primitive (DESIGN.md:403), the touch-target rules (DESIGN.md:431)
  and the motion rules (no idle or looping animation in the map).
- packages/website/src/components/ui/: the primitives (Chip, Button, Card, StatusChip,
  Overline, Meta, Text).
- packages/website/src/components/page-sections/HomeMap.astro: the map as it ships after PR #41.
  This design replaces its overlays (hover card, selected card, themes panel, list drawer,
  control rows), not its drawing.
- docs/design/map-polish-audit.md: why. P1 is items 6 to 10.
- scripts/map-node-contract.test.ts: the contract tests that pin today's overlays. A design
  that reverses one should say which.
Build on that vocabulary and annotate each piece with the primitive it builds on, or flag it as
a NEW COMPONENT; these wireframes will be built in this exact codebase. Where the digest below
and the repo disagree, the repo wins. If the repo is not attached, the digest is enough.

VARIANTS: produce three distinct directions of the same map
Hold constant across all three: the content and states below, the token palette and type roles,
the map drawing, and every AVOID rule. Vary composition, density and expressive range:
- V1 · FIELD GUIDE: faithful evolution. Keep today's rounded map stage, type legend and control
  row. Add a theme strip, one right-hand dock inside the stage that holds either the list or the
  selected node, and chapter labels at rest. The safe baseline.
- V2 · EDITORIAL ATLAS: the map as a printed plate beside a permanent index. The index is the
  list (grouped by region, numbered, searchable); selecting a node turns it into an entry with a
  way back. Spectral italic place names, a degree graticule, a KEY box for the node types,
  themes as a key row under the plate. Nothing ever covers the plate.
- V3 · LIVING NETWORK: the most expressive. A full-bleed map band with stronger topographic
  texture, labels on short leader lines, every control in one floating bar, the list and the
  inspector as floating panels (the inspector may draw a small web of the node's threads).
  Still dark-forest, still token-true, still buildable, still no idle motion.

DESIGN SYSTEM: "Greenpill" (digest of gp-tokens.css; apply exactly)

Canvas & color
- Dark, warm forest canvas. Page background #0F3D2E (deepest wells #0A2D21), raised surface
  #143F30, card #1A4D3A, elevated card #235C46, hairline borders #2A6B52 at about 40% opacity.
- Accent: Greenpill Lime #B8E835, exactly ONE lime primary action per screen (here the hero's
  "Find your people"); hover #C4F02C. Lime also marks chapter nodes and pressed filters.
- Headlines: Steward Gold #F0DCA0, for display and headline text and quiet emphasis only. Gold is
  never a button or link color. Stewards are gold dots on the map.
- Text: #FAF7EE body, #E8E2D4 muted (use it for small metadata), #B8B0A0 only for large dim text.
- Error/attention: terracotta #E07856, never red. Info: #5BA889. No grey, no pure black or white.
- Map node colors are data, not chrome: chapters lime with a dark ring, stewards gold, members
  mint #C8E6D6 with a gold ring. The 16 theme hues come from the public map contract
  (packages/shared, PUBLIC_MAP_THEMES) and only tint threads, theme dots and theme tags.

Typography
- Spectral (serif) for display and headlines only, always gold. Display about 72px desktop and
  42px mobile; H2 about 40/30; H3 about 28/22.
- Manrope (sans) for all body and UI at 16px / 1.6; labels 12 to 14px, weight 600.
- JetBrains Mono, uppercase, letterspaced, 11 to 12px, for overlines and technical metadata
  (for example "MEMBER · GREENPILL NYC").

Shape & rhythm
- Pill radius on every button, chip, input and avatar. Cards 20px radius, the map stage 32px,
  tooltips 12px. 8px spacing scale. Content max-width about 1280px on a 1440 canvas.
- Depth = stepping the green scale, not shadows. The only glow is the soft lime halo on the
  primary button. Subtle topographic contour texture (about 12 to 18% opacity, overlay).

Voice & details
- Earnest, grounded, warm: a living forest field-guide, not a SaaS dashboard.
- Almost no icons: short text labels instead; where a true icon is needed (zoom, close, search,
  arrows), a 1.5px line form. Links end in "→".
- Accessibility: AA contrast, lime focus rings, 44px touch targets, real text, semantic buttons
  and links, one polite live region for counts, aria-pressed on filters, aria-expanded on the
  list toggle.

THE MAP AS IT SHIPS (context; the problems this round solves)
- Hero, top to bottom: H1 "A global regenerative network.", the map, the intro "Start with the
  map, read the field notes, browse the public library, or enter through the Garden at the pace
  that fits.", then the primary lime pill "Find your people" and the ghost pill "Browse chapters".
- The stage is a rounded card whose width comes from its container, with the height capped at
  56.25svh and the world at a 200/88 aspect. People who overlap a chapter or each other collapse
  into a count badge that fans out when activated.
- Chrome today: the type legend "CHAPTERS 12 · STEWARDS 2 · MEMBERS 15" at the top right, with a
  "Show all" chip while any filter narrows the map; a control row at the bottom left: "Themes",
  "List", zoom (minus, reset, plus) and "Join the map".
- What is wrong (from the audit):
  · The hover card shows type, place, the member's note and every theme chip, and covers part
    of the map while you browse.
  · The selected card floats beside the node, covers the legend, and its connections list runs
    past the card's bottom edge.
  · "Themes" opens 16 toggles over most of the map, all on by default.
  · "List" opens a drawer over North America: one flat list of tall rows, no search, no link
    back to the map while browsing.
  · At 375 the drawing is about 150px tall, with the legend row and the control row stacked
    under it. The code switches to this compact layout at a 720px container, while DESIGN.md:403
    says 520px.

CONTENT (real data, 7 November 2026)
- Counts [live data]: 12 chapters, 2 stewards, 15 members. One name appears twice at the same
  point (two approved submissions). Settling that is for stewards in Directus, not the map, so
  the map draws both.
- Chapters, as name / city / featured weight (the weight sets label priority at rest):
    Greenpill Brasil / Rio de Janeiro (multi-city) / 100
    Greenpill Nigeria / Awka / 95
    GreenSofa / Distributed / 90
    Greenpill Koh Phangan / Koh Phangan / 80
    Greenpill NYC / New York City / 75
    Greenpill Côte d'Ivoire / Abidjan / 70
    Greenpill Germany / Distributed / 65
    Greenpill Kenya / Nairobi / 55
    Greenpill Toronto / Toronto / 50
    Greenpill London Ontario / London / 45
    Greenpill Ottawa / Ottawa / 30
    Greenpill Cape Town / Cape Town / 0
  The four Great Lakes chapters (Toronto, London Ontario, Ottawa, NYC) sit within about 20px of
  each other on a laptop; their labels must not collide.
- Themes with node counts [live data]: Public Goods 16, Education 15, Grants & Funding 13,
  Local Events 12, Impact Tracking 9, Open Source 9, Water 7, Mutual Aid 7, Trees & Biodiversity
  4, Clean Energy 4, Local Governance 4, Food & Farms 3, Storytelling 3, AI & Automation 3,
  DeSci 2, Waste 1.
- The selected node in the inspect state: Matty Compost · MEMBER · GREENPILL NYC. Public note:
  one line [live data]. Themes: Impact Tracking, Mutual Aid, Food & Farms, Waste. Three
  connections [live data], two through Mutual Aid and one through Impact Tracking.
- A hovered node in each state: one person or chapter [live data].
- The browse state: theme filter "Education", which leaves 15 nodes (11 chapters, 1 steward,
  3 members [live data]); the hovered row is "Greenpill Nigeria" (CHAPTER · AWKA).
- Status line [illustrative]: "Live · updated 2 min ago". Its wording belongs to the map's
  live-status work, not this round.

WHAT TO DESIGN (the P1 brief)
1. Hover: a compact tooltip with the name, then TYPE · PLACE in mono. Nothing else. It sits
   beside the node and flips to the other side when there is no room.
2. Selection: the rich content (TYPE · PLACE, the name in Spectral, the public note, themes,
   connections as rows that select that node, public links such as "Visit chapter →", and, for
   an approved steward or member submission only, "Edit this node"; chapters have no edit
   action) opens in a docked side inspector on desktop and a bottom sheet on phones.
   Today's alternative is the card that floats beside the node; a variant may argue for it, but
   say so. Opening the inspector never resizes the map; if the node would sit under the
   inspector, the map pans it into view.
3. Themes: a single-row chip strip: "All" (pressed by default), the most-used themes, and "+N"
   for the rest. The full panel (all 16 with counts, "Clear", "Done") is only for editing.
   One open surface at a time: opening the list, the theme panel, the inspector or the join
   walkthrough closes the others and clears any hover.
4. List: a non-modal drawer on desktop with a search field (label "Search the map" [refresh ok],
   placeholder "Name or place" [refresh ok]), compact rows of about 40px (mark, name, place),
   grouped (by type or by region) with counts. Hovering or focusing a row rings its pin on the
   map and shows its tooltip; picking a row selects the node. Keep the heading "Map list" and
   the kicker "Visible nodes".
5. Phone (375): one row of controls along the bottom of the stage (the types as dots and
   numbers only, then Themes, List, Join the map), scrolling behind an edge fade (DESIGN.md:403);
   a map stage of at least 60svh. Show the cost honestly: the intro and buttons move below the
   first screen, and a 60svh portrait stage shows only part of the world, so give a way to pan
   to the rest and a way back that does not need dragging (a reset button in the row). Lay out
   by container width, never by pointer type: a wide touch screen gets the desktop layout.
   Reconcile the breakpoint with DESIGN.md (520px, not 720px).
6. Chapter labels at rest on desktop: the highest featured weight wins, a label that would
   collide hides, and people stay hover- or tap-only.
7. Hit targets of at least 44px everywhere: pins, badges, chips, rows, buttons.
8. Unchanged since #41: "Join the map" opens the join walkthrough, and "Find your people" in the
   hero opens the list. Keep both labels and both behaviours.

STATES TO SHOW (in every variant)
- Inspect: the hero at 1440 with a member selected (Matty Compost), another node hovered with
  its compact tooltip, filters at rest, chapter labels at rest.
- Browse: the hero at 1440 with the list open, the theme filter "Education" applied, and the row
  "Greenpill Nigeria" hovered, its pin ringed on the map.
- Shared, once: the theme editor panel opened from "+N".

AVOID
- No rich hover card, no modal list on desktop, no stacked two-row chrome on phones.
- No new tokens, no grey, no pure black or white, no icon fonts, no emoji.
- No idle, pulsing or looping animation in the map; one-shot motion only.
- No invented people or data: names, places and connections come from /map/state.
- No "Submit yourself" wording, no light theme, no lorem ipsum, no em dashes in copy, no more
  than one lime primary on screen.

DELIVER
- First response: THREE desktop 1440 frames, V1, V2, V3, each the hero in the inspect state.
  Then the browse state for each variant, and one shared frame for the theme editor.
- Label every frame with its variant name. Annotate, outside the canvas: the primitive each
  piece builds on (or NEW COMPONENT), the interactions (hover, select, list, filters, one open
  surface), and which contract tests the variant would reverse.
- After I pick a direction: the 375 companion of the winner, at rest and with a node open, and
  iterate on that direction only.
- Use the copy above verbatim except lines tagged [refresh ok]; [illustrative] and [live data]
  keep their slots.
```

## Decision coverage

| P1 item (audit § 3) | Where it lands in the prompt |
|---|---|
| 6. Compact hover tooltip; rich content in a docked inspector or bottom sheet; connections overflow and ghost buttons | What to design 1 and 2; Avoid |
| 7. Theme chip strip with Clear and All; full panel only for editing; one open surface | What to design 3; States (shared editor frame) |
| 8. Non-modal list drawer with grouped compact rows, row hover highlights the pin, search | What to design 4; Browse state |
| 9. One-row phone chrome, map at least 60svh, scroll affordance, 520 vs 720/480 breakpoints | What to design 5 |
| 10. Chapter labels at rest, 44px hit targets, node data clean-up | What to design 6 and 7; Content (counts, and the duplicate left to stewards) |
| Locked since #41: "Join the map", "Find your people" | What to design 8 |
