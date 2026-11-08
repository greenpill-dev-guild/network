# HomeMap Polish Audit — call extraction + independent audit

**Date:** 2026-07-17 · **Sources:** Jul 16 audit call (Afo × Matt), code audit of `packages/website/src/components/page-sections/HomeMap.astro` (+ `index.astro` hero wrapper), and a live-browser session on greenpill.network at 1366×641 (ThinkPad-class), with a 375×812 mobile pass. Live production currently shows 12 chapters / 2 stewards / 11 members (25 nodes); local main has 18 chapters, so production is at least one content build behind.

**Goal:** take the map to its next iteration — fix the first-impression sizing, make dense regions legible (clustering), rework how information is laid out around the map, and tighten the filter/entry model.

---

## 1. What the call said (extracted)

| # | Call point | Where in transcript | Status |
|---|---|---|---|
| C1 | Map doesn't fill the screen on a ThinkPad; "skewed" even at 100% zoom; browser-zoom-out was the workaround | 00:02:24, 00:09:31, 00:12:04 | Root cause found (§2.1) |
| C2 | Matt: drop Members (maybe Stewards) from the map; Afo: filters help find connections → **decision: keep all three** | 00:13:11 | Kept — but filter UX needs the fixes in §2.4 |
| C3 | "Is there a way to see everything again? …you just have to click it again" — no visible reset | 00:14:05 | Confirmed live (§2.4) |
| C4 | Theme filters only apply to people; chapters aren't theme-tagged ("all these chapters have DI or is it just not filtering?"); filtering by theme makes members vanish while chapters all stay | 00:15:18 | Confirmed in code — hard-coded exemption (§2.4) |
| C5 | "Submit yourself" reads as browsing, not self-submission → rename (locked later as **"Join the map"**) | 00:15:18 | Bigger than a label — the *primary hero CTA* has the same identity problem (§2.5) |
| C6 | "There's really not that many people in here" — the people layer feels sparse | 00:14:05 | Partly a rendering artifact: people are hidden **under** chapter dots (§2.2) |

---

## 2. Independent audit findings

### 2.1 Sizing & first impression — the ThinkPad bug, explained

**P0 · The map's width is driven by viewport *height*.** `index.astro:385-388` sets the hero map wrapper to `width: min(100%, 128dvh)`. On 1366×641 (measured live): wrapper = **820px in a 1366px viewport** — 40% of the width sits empty beside the flagship element. Worse, the canvas flips to a **4/3 mobile aspect at ≤720px container width** (`HomeMap.astro:6743-6747`), and `128dvh` crosses that threshold whenever the viewport is shorter than ~563px — a ThinkPad at 125% OS scaling lands there. Then `preserveAspectRatio="xMidYMid meet"` letterboxes the 200×88 world inside the 4/3 canvas: **~100px of empty green above and below the map**. That is Matt's "skew." Side effects of the accidental mobile flip on a desktop machine: zoom controls hidden (`6890`), hover card disabled (`6825`), wheel/scroll captured by `touch-action:none` (`6749`).

**P0 · Fix direction:** make the map's size a function of **container width** (with a height *cap*, not a height *driver*), and key the mobile flip off container width only — e.g. `width: min(100%, 1280px)`, `max-block-size: min(72svh, …)`, keep 200/88 aspect at all desktop widths. Opening devtools or a bookmarks bar should never change the map's layout mode.

**P1 · Hero doesn't fit short viewports.** At 641px height the dek is visible but both CTAs sit half-clipped below the fold. The hero stack (H1 → map → dek → 2 CTAs) needs a short-viewport budget (smaller H1 margin, map height cap) so the full stack fits ~600px-tall laptops.

### 2.2 Node clustering & legibility (the core "next level" problem)

Measured live at 820px canvas width: **35 node pairs within 18px of each other; four pairs at exactly 0px.**

- `Greenpill NYC (chapter) ↔ Matty Compost (member): 0px` — **Matt's own node is invisible under the NYC chapter dot.** This is C6: the people layer isn't sparse, it's occluded.
- `Toronto ↔ Kaz: 0px`, `London Ontario ↔ Metafortune77: 0px`, `Brasil ↔ Eve: 0px`, plus `Emmanuel Jacobson ↔ kitblake: 0px` (two members stacked).
- The Great Lakes corridor is one blob: Ottawa/Toronto/London-Ontario/NYC are 4–17px apart *as chapters alone*, before members land on top.

**Why, in code:**
- The overlap-stack mechanism only groups **people**, and only at **bit-identical coordinates** (`groupPins` keys on `toFixed(2)` — `HomeMap.astro:2782, 2796-2803`). Two members 0.5px apart never cluster. Chapters are excluded entirely (different SVG group, `visiblePeoplePins` queries members only, `2784-2793`).
- Chapters are also excluded from the density-shrink pass (`1015-1022`) — they never shrink, never move, and members paint **after** chapters in DOM order (`218-250`), so members visually cover chapters while chapters' larger hit circles lose the pointer contest: clicking the center of the NA cluster selected **Metafortune77**, not any of the four chapters. Chapters are effectively unclickable in dense regions.
- **P0 · Fix direction — cluster across types, by radius:** grid/radius grouping (~2.5 SVG units) over *all* node types; render a cluster pin (chapter-anchored, count badge, blended theme ring) that fans out satellites on click/tap (the satellite mechanics already exist for exact-overlap people stacks, `2767-2949` — generalize them). When ≥2 nodes fall within the 44px pointer radius, open the fan or a small chooser instead of nearest-center-wins (`nodeAtPointer`, `1621-1633`).

**P1 · Edge cases found live:**
- **Clipped node:** member "Amio" renders half outside the canvas edge (far-west longitude). Clamp x into the drawable inset or wrap threads/nodes; never clip a pin.
- **Duplicate identity:** "kitblake" appears at two locations (Amsterdam ~Germany, and at Emmanuel Jacobson's exact coords in West Africa). Dedup by identity at injection (`3302-3308` exists but missed this) and flag same-name/same-source nodes.
- **Threads run off-canvas** (streams exiting the top-right corner) and through dense mid-Atlantic bundles; clip threads to the map inset and consider light curve-bundling to reduce crossings.
- **Hit targets:** every node is a uniform 39px circle at 820px canvas (measured); at 375px it's ~16.5px. Pointer search compensates (44px radius) but native focus/hover doesn't. Scale hit circles to guarantee ≥44px rendered at every size.
- **No labels at rest:** zero `<text>` on the map — nothing is identifiable without hovering. With ≤20 chapters, desktop can afford always-on chapter labels (priority by `featuredWeight`, hide on collision); people stay hover/tap-only.

### 2.3 Information layout & overlays

- **P1 · Hover card is oversized and occluding:** hovering kitblake produced a ~320×190px card covering ~40% of the map (name, bioregion, role, 4 theme chips). Browsing = repeatedly blinding yourself. Make hover a **compact tooltip** (name + `TYPE · PLACE`), and move the rich content (bioregion, themes, connections) to the selected state.
- **P0 · Hover card gets stuck:** the kitblake card persisted through clicks, filter changes, opening the Themes panel, opening the List modal, and page scroll — stale UI layered over everything (canvas held `is-focused`). Clear focus state on pointer-leave, scroll, filter change, and any overlay opening. Same for **selection threads**: the teal/orange strands from a previous selection survived closing the inspector and even viewport changes.
- **P1 · Selected inspector is a center modal:** selecting a node opens a large card over the middle of the map — you lose the geography (where is this node?), it covers the legend, and its connections list clips mid-row with chips overflowing the card edge. Dock it to a side rail (desktop) so the selected node + its highlighted threads stay visible; fix the internal overflow. (Mobile's bottom-sheet pattern is the right idea — desktop should get the equivalent side dock.) Also: the closed inspector leaves 0×0 but still-`aria-pressed` connection buttons in the DOM — remove or `inert` them.
- **P1 · Themes panel is a wall:** it opens as a ~70%-of-map translucent panel (16 rows), unusable as a *legend* and it z-fights with any stuck hover card. Replace with a compact single-row chip strip (+`+N` overflow) for glancing, expanding to the full panel only for editing — with **Clear / All** actions (§2.4).
- **P1 · List is a blocking modal:** `showModal()` means you can't use the list and the map together. Make it a non-modal side drawer: compact rows (currently ~90px tall — 25 nodes ≈ 10 screens of scrolling), grouped by type/region, hover-row → highlight node on map, and a search field.
- **P1 · Overlays don't coordinate:** legend pills + hover card + theme panel + list modal can all render at once (observed). One "open surface" at a time: opening any overlay closes the others and clears hover.
- **P1 · Mobile chrome eats the map:** at 375px the legend row + Themes/List row stack inside the card's bottom and cover roughly 40% of it; the MEMBERS pill is clipped by the horizontal scroll strip with no scroll affordance (fade/snap hint needed). Collapse to a single row (counts as dots+numbers, per the DESIGN.md compact-mode contract) and give the map ≥60svh. Note: implementation reflows at 720/480px while `DESIGN.md:403` specifies ≤520px with labels hidden — reconcile the contract and the code.
- **P2 · Walkthrough dialog at 375:** the title overlaps the close button visually (title renders under the ✕). Reserve space for the close control. (Escape-to-close also appeared unreliable in testing but wasn't conclusively reproduced — verify it.)

### 2.4 Filter model

- **P0 · Zero-result states are blank, and reset is invisible (C3):** clicking **Stewards (2)** rendered an *empty world* — one steward is the clipped Amio node, the other wasn't visible — with no message and no way back except knowing to re-click the pill. Add (a) an on-canvas empty/sparse state ("2 stewards match — clear filters"), and (b) a persistent **"Show all"** reset chip whenever any filter is active.
- **P0 · Theme filters exempt chapters (C4):** `HomeMap.astro:2177-2182` hard-returns `true` for chapters — necessarily, because chapter nodes ship `themes: []` (`120`, `231`). Result observed on the call: filter by theme → members vanish, every chapter stays, counts don't move. Either (short-term) *dim* non-applicable chapters and label the legend "themes filter people," or (right fix) theme-tag chapters in content so the filter applies to everything. Chapter theme data is a content task, not a code task.
- **P1 · Filter semantics are opaque:** type pills are exclusive-isolate ("show only X", self-toggle to clear) — you can't view Stewards+Members together, and nothing on screen says "only." Either support multi-select or label the state explicitly ("Only stewards · Show all").
- **P1 · Active vs. hover/focus styling is confusable:** after interacting, a pill can *look* active (lime emphasis) while `aria-pressed="false"` (verified in DOM). Differentiate pressed (filled) from hover/focus (ring only).
- **P2 · 16 default-on theme chips** with no Clear/All control (all 16 verified pressed) — add both, plus the `.is-filtering` dot is too subtle as the only "you are filtering" signal.

### 2.5 Entry points, naming, and live state

- **P0 · The primary CTA misleads (C5 inverted):** the hero's lime **"Find your people"** button opens the **add-your-node walkthrough** ("What are you here to grow?… *Already added yourself?*"). Discovery label → submission flow: the exact confusion Matt hit, now on the page's main action. With the locked rename: the walkthrough's trigger should be **"Join the map"** (on-map pill + footer), while "Find your people" should do what it says — scroll to/focus the map, or open the List/browse surface.
- **P2 · No on-map join affordance:** the only walkthrough trigger sits below the map (off-screen while the map is in view on mobile). Add the "Join the map" pill to the map surface itself.
- **P2 · Live layer is silent:** `/map/state` failure is a silent no-op (`3317-3320` — `DESIGN.md:642` says it should error the map); Stewards/Members read "0" indistinguishably from "down"; there's no loading state; a hard-down agent is re-polled every 5s forever. Add a quiet status line ("live · updated 2m ago" / "showing chapters only — live layer unavailable") and backoff.
- **P2 · A11y hygiene:** legend/controls wrappers are bare `<div aria-label>` without roles (dropped by AT) — use `role="toolbar"`/`group`; chapter anchors `preventDefault` primary click (inspector) while modified clicks navigate — intentional but should be documented; keep the one-shot thread animation (no idle motion) as is.

---

## 3. Prioritized plan

**P0 — correctness & first impression (do first)**
1. Width-driven sizing: kill the `128dvh` width rule + height-keyed mobile flip (`index.astro:385`, `HomeMap.astro:6743`); container-width breakpoints, height as a cap.
2. Cross-type radius clustering with fan-out expansion + pointer disambiguation (generalize `2767-2949`).
3. Filter reset ("Show all" chip) + on-canvas empty state.
4. Clear stuck hover/selection state on scroll, filter, overlay-open, pointer-leave.
5. Rename/rewire entries: walkthrough trigger = "Join the map"; "Find your people" = browse behavior.

**P1 — information layout**
6. Hover → compact tooltip; rich content moves to a **docked side inspector** (desktop) / bottom sheet (mobile); fix connections overflow + ghost buttons.
7. Themes → compact chip strip with Clear/All; panel = edit mode only. One open surface at a time.
8. List → non-modal drawer with compact grouped rows, map-highlight on hover, search.
9. Mobile: single-row overlay chrome, map ≥60svh, scroll affordance on the pill strip; reconcile the 520 vs 720/480 breakpoint contract with DESIGN.md.
10. Chapter labels at rest on desktop; ≥44px effective hit targets everywhere; clamp/dedup/jitter node data (Amio clip, kitblake duplicate, same-coord people).

**P2 — polish & live trust**
11. Theme-tag chapters (content) so theme filters apply universally; until then dim + label.
12. Live status line + fetch error state + polling backoff; thread clipping/bundling; walkthrough title/close overlap at 375; a11y roles on overlay wrappers; pressed-vs-focus pill styling.

**Sequencing note:** items 1–5 are each small-to-medium isolated changes and remove every complaint raised on the call; items 6–9 are one coherent "information layout" redesign — worth designing together (a Claude Design prompt for the map organism in the same three-variant format as the page prompts would slot in here) before implementation.

---

## 4. Evidence index

- Live measurements (1366×641): wrapper 820×361 in 1366px viewport; 25 nodes; 35 collision pairs <18px, four at 0px; uniform 39px hit circles; "Amio" clipped; "kitblake" at two locations; Stewards filter → blank canvas; 16/16 theme chips pressed; stuck `is-focused` hover card + persistent selection strands; list modal + hover card + legend rendered simultaneously; "Find your people" → add-node walkthrough; mobile overlay chrome ≈40% of card; MEMBERS pill clipped.
- Code refs: sizing `index.astro:385-388`, `HomeMap.astro:41-45, 4118-4123, 6743-6747`; projection `44-45`; radii/hit `109, 234-237, 2740-2744`; density-shrink `990-1032`; overlap stacks `2767-2949` (`toFixed(2)` key at `2782`); theme exemption `2177-2182` (+ empty chapter themes `120, 231`); filter defaults `947-949`, exclusive isolate `2280-2283`; zero-state gap `4291-4293`; map-state lifecycle `3255-3325`; a11y wrappers `257, 334`; DESIGN.md contract `403, 422, 642`.

---

## 5. P1 decisions (2026-11-07)

Afo chose to see the P1 layout designed before any P1 code was written (PRD-1424, a child of PRD-739). The prompt is [homemap-p1-prompt.md](homemap-p1-prompt.md). Its three variants were drawn from live public map data (`/map/state` of 2026-11-07 and the committed chapter snapshot) on a private Claude Design canvas in Afo's account: <https://claude.ai/artifact/5Q6JNPPZDp5PbjydrM8QYQ>. With screenshots of all three in front of him, he answered four questions and took the recommended option each time:

| Question | Afo's answer | What it means |
|---|---|---|
| Which variant should the build follow? | "V1 Field Guide" | Today's stage, type legend and control row stay. Added: a theme strip, one right-hand dock that holds either the list or the selected node, chapter labels at rest. It is the closest to the rest of the live site. |
| Where do a selected node's details open? | "Docked" | A dock inside the stage's right edge on desktop, a bottom sheet on phones (and, as proposed below, on containers up to 860px). June's floating card goes. |
| Phone layout at 375 | "60svh map, one row" | A map stage of at least 60svh that opens on the Atlantic, with a pill that pans to the nodes off-screen, and every control in one scrolling row behind an edge fade (DESIGN.md:403). The intro and both hero buttons move below the first screen; Afo accepted that cost. |
| How the type pills filter | "Narrow, then add" | The first press shows only that type, as today; pressing another type adds it; Show all resets. Theme chips follow the same rule. |

V2 (a map plate beside a permanent, region-grouped index) and V3 (a full-bleed band with floating panels and a thread web) stay on the canvas for reference and are not part of the build.

### What the build changes

**Desktop, containers wider than 860px**

1. **Hover and keyboard focus** show a compact tooltip: the name, then `TYPE · PLACE` in mono. No note and no theme chips. It flips below the node when there is no room above.
2. **Selecting a node** opens it in a dock inside the stage: inset 12px, the stage's full height, about 340px wide. From the top: `TYPE · PLACE`, the name in Spectral, the public note, themes as tags, connections as rows of at least 44px (mark, name, place, shared-theme tag) that select that node, the node's public link (`Visit chapter →` for a chapter), and, for an approved steward or member submission only, `Edit this node`, exactly as today (`updateWrap.hidden = isChapter || !member.approved`). Chapters get no edit action here: a selected chapter has no `sourceId`, and chapter content is edited in Directus. The map never resizes. When the node would sit under the dock, the map pans it into the open area. Closing returns focus to the node, and a closed dock leaves no focusable or pressed controls behind (the audit's ghost buttons). The dock's head (kicker, name and close) stays put while its body scrolls (`overflow-y: auto`), so a long note or many connection rows stay reachable on a short stage, such as the 400px one on the audit's 1366 by 641 ThinkPad. The list scrolls the same way under its search field, and so do the sheets.
3. **The list** opens in the same dock: the kicker "Visible nodes", the heading "Map list" (an h2, as today), a count, and a search field labelled "Search the map" with the placeholder "Name or place". Search matches names and places, and one polite live region announces the count once typing pauses. Rows are at least 44px tall (mark, name, place cut with an ellipsis), grouped by type with counts; the design frames draw them at 40px, but the build uses 44px, which also serves the sheet on touch screens. Hovering or focusing a row rings its pin and shows its tooltip. Picking a row swaps the dock to that node, with a way back to the list. The list is non-modal on desktop: the map stays usable, and a click on empty map no longer closes it.
4. **Bars inside the stage.** Top left: the theme strip (`role="toolbar"`) with "All" (pressed while no theme narrows the map), the most-used themes (picked ones first, as many as fit) and "+N", which opens the theme editor. Top right: the type legend as today, with "Show all" while any filter narrows the map. Bottom left: "List" with the visible count (`aria-expanded`). Bottom right: the live status, zoom and "Join the map". While the dock is open, both bars end at its edge.
5. **The theme editor**, opened from "+N", is the only place that lists all 16 themes: toggles with counts in four columns, plus "Clear" and "Done". One open surface at a time: the dock, the editor and the join walkthrough each close the others and clear hover.
6. **Chapter labels at rest**: Manrope 600 at 12px in `--gp-fg-muted` with a dark halo, without the leading "Greenpill " (the tooltip and the dock keep the full name). The highest `featuredWeight` goes first. Each label tries right, left, above and below its dot, and hides when it would touch another label, a pin, a badge, a bar or the dock. People never get labels at rest. Labels dim while a node is selected.

**Containers from 521 to 860px:** the same bars, with fewer theme chips before "+N". The inspector and the list open as a bottom sheet inside the stage, because a 340px dock would cover most of the map.

**Phones, containers of 520px and narrower**

- The stage is at least 60svh. The default view frames on height, as Afo's phone frame did: the map's full height (the desktop crop, 90°N to about 68°S) fills the stage, centred on the Atlantic, and the width shows whatever longitude that leaves. On a 375 by 812 phone that is about 88°W to 23°E, the Great Lakes to Cape Town; a 375 by 667 phone shows about 135° of longitude. A stage too narrow for that span shows less of it, never a letterbox, and the edge pills reach the rest.
- A pill on each edge that has nodes beyond it pans that way ("5 more east" with today's data). After a pan, the pill on the other edge leads back, so the pills work in both directions.
- One row of controls along the bottom of the stage, in this order: the type counts as dots and numbers (the labels stay for assistive technology); while any type or theme filter narrows the map, a "Show all" chip that clears both, placed after the counts so they never move under the finger that just pressed one; Themes, which opens the theme editor as a sheet; List; a reset button (an icon with the accessible name "Reset the map view", which returns to the default view and leaves the filters alone); and Join the map. Each is 44px tall, and the row scrolls behind a `mask-image` edge fade. With the reset button and the pills, keyboard and switch users always have a way back without dragging.
- A selected node opens a bottom sheet with a handle, close, `TYPE · PLACE`, the name, the note, a scrolling row of theme tags and the connections; the map pans the node above the sheet. The list opens as a full-height sheet, modal on touch as today. No labels at rest.

**Everywhere**

- Filters narrow, then add: the first press on a type or a theme shows only that one, more presses add to it (Stewards and Members together), pressing a pressed pill removes it, "All" resets the themes and "Show all" resets both. Each pill's accessible name says what pressing it will do, with `aria-pressed` carrying the state, because today's names ("Show only Members", "Show all map nodes; Members currently isolated", `HomeMap.astro:2250-2251`) become wrong under this rule. While no type is picked: "Show only Stewards; 2 match current filters". While another type is picked and this one is not: "Add Stewards; 2 match current filters". While this one is picked with others: "Remove Stewards". While it is the only one picked: "Show all map nodes". Theme chips follow the same pattern ("Show only Water", "Add Water", "Remove Water", and "All" named "Show every theme").
- Hit targets: pins and badges stay at least 44px at every map size (their hit circles scale with the map), and list rows and connection rows are at least 44px tall. Only chips may be smaller: 30 to 36px under a fine pointer (DESIGN.md:436). Buttons keep their minimums: 48px for the Button primitive, and at least 44px for the map's own control pills such as List and Join the map, as today. Icon-only map controls (zoom, close, reset) and every chip reach 44px under `(pointer: coarse)` and in the phone row.
- Node data: the map does not merge nodes by name and point. Two people can share a display name and a city-level point, and the public payload carries no identity that links separate submissions (`sourceId` names one submission), so the client keeps de-duplicating only the same `sourceId` (one submission arriving twice, for example as local pending and as approved). The live map's one exact pair (two approved submissions with the same name at the same point) is for stewards to settle in Directus, by archiving the extra submission if it is one person; the map shows both until then. The design frames show 14 members, as if that had been done.
- Edge pins: #35 refuses impossible points (the longitude of -180 that half-clipped Amio in July), and #41 stacks people who share a spot. A valid point on the map's edge, such as a confirmed place on the 180th meridian, still draws half outside the drawing. The build keeps the audit's clamp: the rendered pin and its hover and focus target sit inside the drawable inset, and the data keeps the true coordinate.
- Unchanged since #41: "Join the map" opens the walkthrough, and "Find your people" opens the list.

### Breakpoints

DESIGN.md:403 wins. The map's compact layout starts at a 520px container instead of 720px. A second threshold at 860px moves the inspector and the list from the dock to a sheet; that number is this design pass's proposal rather than one of Afo's answers, so the build may tune it after checking 768 and 1024 in Brave.

Layout follows the container's width only; the kind of pointer never picks it. Today `isTouchMap()` (`HomeMap.astro:997`) returns true for any coarse pointer as well as for a container of 520px or less, and it decides both layout matters (whether the list opens modal, whether picking a row closes it) and input matters (the 44px tap fallback, pinch, "Tap" or "Click" in the stack hint, no hover tooltips on touch). The build splits it: a width check picks the layout (the phone row at 520px or less, the sheet at 860px or less, the dock above that), and `(pointer: coarse)` keeps choosing only the input behaviour. A 1024px iPad therefore gets the desktop dock and the non-modal list, driven by taps. The 500, 640, 860 and 480px container queries in HomeMap.astro style the join walkthrough and do not change. When the build lands, the Home row of DESIGN.md's reflow matrix should add "map at least 60svh" at 375.

### Contract tests the build reverses on purpose

In `scripts/map-node-contract.test.ts` at `origin/main` 31b18cb. Line numbers will move once map-p2 (PRD-1423) lands; the test names hold.

- `home map intake requires a valid email and stores local pending only after server accept`, line 903: `resetMapFilters` turning every theme back on (`activeThemes.add(theme)`). Under narrow-then-add, a reset empties the picked set.
- `home map grows live: reconciles, polls visibly, and redraws after submit`, lines 1104 to 1110: one active type at a time (`let activeTypeFilter: '' | 'chapter' | ...`, `if (activeTypeFilter && type !== activeTypeFilter)`, `activeTypeFilter = activeTypeFilter === type ? '' : type`). The type filter becomes a set. The counts, `aria-pressed` and `is-type-filter-match` assertions stay.
- `home map focus cards are anchored near nodes, not bottom-left panels`, line 1175: `data-focus-themes`. The tooltip carries no themes; its anchoring assertions stay.
- `home map selected nodes stay on the map without scroll jumps` (the June floating card): `positionSelectedCard` (1206), the card clamping (`clampNumber` and `rootRect` minus `cardRect`, 1214 to 1216), `--gp-selected-transform` (1217 and 1227), `inset-inline-start: var(--gp-selected-x` (1225), the card width `min(var(--gp-map-card-width), calc(100% - 24px))` (1226) and the ban on `--gp-map-inspector-width` (1228). These stay: the dock lives inside the canvas with its region role (1203 and 1204), there is no `scrollIntoView`, focus moves without scrolling, and the map keeps its full width (1229 to 1231, no `--gp-map-pane-end`).
- `home map mobile touch mode supports bounded zoom and compact connection rows`: the 720px compact query and the band under the drawing (`44cqw`, `--gp-map-lower`, the controls hidden while a node is selected; 1257 and 1263 to 1268), the theme panel's fixed position inside that query (1287), the control row's markup order (1282: on desktop the strip's "+N" opens the theme editor, so the "Themes" toggle leaves the desktop bars, but the phone row keeps a "Themes" button that opens it; update the assertion to the new order rather than deleting the toggle), the theme panel's clearance for a selected node (1288; the editor and a selection can no longer be open together), and the list rows' two theme chips with `+N` (1297 to 1304) and their wrapping rules (1306 to 1311), since compact rows show the name and place on one line. These stay: the 520px label rule (1272), the zoom bounds, the theme panel's four-column grid (1283 to 1286), the control row's `nowrap` (1290) and the one-surface helpers (1291 to 1296), except that the outside click (1294) keeps closing the theme editor but no longer closes the list.
- `home map selected surface carries public links and no connection summary`: the shared floating footprint, that is `--gp-map-card-width` with `.gp-home-map-focus` and `.gp-home-map-selected` both at that width, and the shared `--gp-map-card-offset` (1502 to 1506). Replace them with separate assertions: a compact tooltip offset from its node, and a dock of fixed width inside the stage. The public links, the safe `rel` and the ban on connection-summary text stay.

Coordinate with map-p2, which edits the same file: `home map chapters open an inspect card and carry one link` pins `themes: []` and the chapters' exemption from theme filters (1541 and 1542), which map-p2 changes when chapters get their Directus themes. P1 then shows a chapter's themes and its `TYPE · PLACE` kicker in the dock, reversing `selectedKicker.hidden = isChapter` and `selectedThemesEl.hidden = isChapter` (1545 and 1546).

### Build order

From the plan: the map-p1 session starts after map-p2 merges, and one writer lands P1 in this order: the chrome (bars, theme strip, the phone's one row), the list (dock, search, grouping, row highlight), labels and hit targets, then the inspector (dock, sheet, tooltip). The a11y roles on the overlay wrappers and the pressed-versus-focus pill styling come with the chrome. Each step updates the assertions above as it reverses them, quoting this section. The wording of the live status line belongs to map-p2.
