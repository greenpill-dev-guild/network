# Handoff: qa-map-polish (PRD-739)

HomeMap P0 polish. Branch `claude/qa-map-polish-38efc7`, pull request https://github.com/greenpill-dev-guild/network/pull/41 (not merged). Evidence is in `../artifacts/qa-map-polish/`.

## Changed

Five commits on `main` at `ad466a2`. The first two are the paused October work, carried as they were; the last three finish it.

| Commit | What |
| --- | --- |
| `d5cc4ab` (Oct 5) | The map takes its width from its container; the viewport only caps its height (`max(56.25svh, 100svh - 22.5rem, 25rem)` times the 200/88 aspect). `128dvh` is gone from `pages/index.astro`, and only a narrow container can switch the map to its compact layout. |
| `11cc0b8` (Oct 5) | "Show all" chip and on-map note for filters; "Join the map" pill opens the walkthrough; the hero's "Find your people" links to `#network-map` and opens the node list; hover is dropped when the pointer leaves, the page scrolls, a panel opens or a filter changes. Its footer edit was dropped: PR #39 owns the footer and already says "Join the map". |
| `48d2faf` | Carried items: the selected card, hover card and thread tooltip no longer read `bioregion` (always empty after D2), with the dead attributes, types and styles; the location picker ignores a pin dragged off the mini map instead of clamping it to the edge; the "Map list" heading is an h2. |
| `25a5c25` | Stacking across node types, finished from the October WIP (`ff72c82`), plus hover from geometry only and stale-state clearing. Details below. |
| `f504581` | The compact map keeps its legend and controls in a band below the drawing instead of over it. |

Review follow-up `b2da3fe` (Codex on #41): a click landing directly on a fan satellite or stack marker no longer bubbles on to the touch fallback that opens the nearest pin within 44 px, and closing the node list gives focus back to whatever opened it (the hero link or the List toggle). Both were checked in Brave; the contract tests pass (60). The two review threads have replies; resolving them was refused by this session's permission check, so they stay open for Afo.

Not carried: `63e5316` (a test fix that `main` already has as `e8810f3`/`6eee884`). Checked against PR #35 on `main`: the coordinate rules, the chapter-anchor guard (`isPublicMapCoordinate`) and the ecoregion removal are untouched, and nothing in `HomeMap.astro` mentions a region any more.

### P0 items

1. **Sizing.** 1366x641: the map is 909 px wide (820 on `main`) and fully on screen, in the desktop layout. 1366x540 (below 563): still the desktop layout at 909 px, no compact flip. 1440x900: 1227 px. 1024x768: 922 px.
2. **Clustering.** Pins that sit on top of each other (within 1.4 map units, about one pin, at every zoom) stack, chapters and people together. Chapters are never hidden: people on a chapter become a badge placed beside it where it covers no other pin. A marker shows how many people it holds, in their colour (member, steward, or member with a steward ring); the October glyph always painted a gold "steward" dot. Hover or keyboard focus on a marker previews who is in it. Activating it opens a fan with each name beside its satellite, kept inside the map. Clicks resolve from geometry: a mouse opens the nearest pin (the hover card names it first) and gets a chooser only for pins on the same spot (3 px); a touch gets a chooser whenever two or more pins fall inside its 44 px target.
3. **Reset and empty states.** Any narrowing filter shows "Show all". Wide map: chip at the start of the legend, plus a note under it when three or fewer nodes remain ("2 of 29 nodes shown."). Compact map: chip at the end of the legend row; the note appears only when nothing matches, centred on the empty drawing. Show all restores every node, releases the filters and moves focus to the legend.
4. **Stale state.** Hover clears when the pointer leaves the map, the page scrolls, a panel opens or a filter changes. Opening the theme panel, the list or the join dialog also closes the selected card, its coloured threads and strands, and any open fan; closing a card (×, Escape) clears them too. Per-pin `mouseenter` handlers, which could name a pin other than the one a click opens, are gone.
5. **Entries.** "Join the map" opens the walkthrough; "Find your people" scrolls to the map and opens its list.

### Bugs found and fixed during QA

- A pin hidden behind a marker kept taking hover: its hit circle sets `pointer-events: all`, which overrode the hidden parent.
- Pressing a satellite's name collapsed the fan before the pick (the outside-press check used the DOM target, the pick used geometry).
- Picking from a fan with the mouse closed the card it had just opened: rebuilding the stacks during the click detached the picked satellite, so the outside-click handler saw it as outside. The rebuild now runs right after the click, and that handler checks the event's path.
- At 375 the legend and control rows covered everything south of about 10°N, so those pins could not be tapped, and the legend clipped its third pill.

## Evidence

**Gate** (`AGENTS.md`, in the dev machine, on `f504581`, the last behavior change): `bun run typecheck` exit 0; `bun run test:map-nodes` 60 pass, 0 fail; `bun run agentic:check` exit 0 (guidance, browser-verification policy check passed for 3 guidance files, 11 plan hubs valid, `ui:check` 0 hard, 0 warn); `bun run build` exit 0, 46 pages (736 s: the machine ran at load 18 to 21 on 10 cores while other sessions built). A rerun on `19c01b1`, which only removes an em dash from a CSS comment, passed the same four steps (60 pass, `ui:check` 0 hard, 0 warn, 46 pages in 47 s), and `bun run plans:validate` passes on the handoff commit. `ui:check` reported one stale HomeMap baseline row (the removed region style) before it was pruned.

**Merge checks** (`git merge-tree --write-tree`, 2026-11-07): clean against `main` (`ad466a2`), PR #34 (`d5d978e`), PR #39 (`7a3fdc4`), and this branch merged with #34 and then #39. This branch edits the hero CTA region of `pages/index.astro` and the hero `primaryCta.href` in `content/home-page.json` (from `/garden` to `#network-map`), which #34 owns; #34 does not touch those lines. Whichever merges second rebases.

**Brave QA** (Afo's authenticated Brave profile through Claude in Chrome, confirmed by `navigator.brave.isBrave()`). The build was served from `127.0.0.1:3301`. Map data came from a local stand-in for `GET /map/state` on port 3303 that served a copy of the live public payload: the 2026-10-05 snapshot with the approved nine-row repair applied, compared in Brave with live `https://agent.greenpill.network/map/state` at 2026-11-07 07:19 UTC (same 17 people, ids, roles, coordinates, themes and 31 connections). Sizes other than the window's 1460x780 ran in same-origin iframes of exactly that size.

| Size | Result | Screenshot |
| --- | --- | --- |
| 1440x900 | Map 1227x540, hero buttons on screen, 7 markers, no horizontal overflow | `brave-1440-home-map.jpg` |
| 1440x900 | Hover on the London Ontario / Toronto marker: "3 people / Kaz, Metafortune77 and Rebecca / At Greenpill London Ontario and Greenpill Toronto. Click to choose one." | `brave-1440-stack-hover-preview.jpg` |
| 1440x900 | Click opens a fan with the three names; clicking "Metafortune77" opens that card | `brave-1440-fan-with-names.jpg`, `brave-1440-picked-from-fan.jpg` |
| 1366x641 | Map 909x400 (820 on `main`), desktop layout with zoom controls, map bottom at 598 px; hero buttons start at 674 px, below the fold | `brave-1366x641-home-map.jpg` |
| 1366x540 | Still the desktop layout at 909 px; the control row needs a scroll (map bottom 594 px) | `brave-1366x540-home-map.jpg` |
| 1024x768 | Map 922x406, desktop layout, both hero buttons on screen | `brave-1024-home-map.jpg` |
| 1024x768 | Stewards filter: Show all chip, pressed pill, the two stewards, "2 of 29 nodes shown." note | `brave-1024-stewards-filter.jpg` |
| 375x812 | Drawing 325x143 uncovered; legend row (dots and counts) and control row below it; no horizontal overflow | `brave-375-home-map.jpg` |
| 375x812 | Touch on the NA marker opens a 7-way chooser (4 chapters, 3 people), names inside the map, none overlapping | `brave-375-touch-chooser.jpg` |
| 375x812 | Picking Kaz: the bar takes the control row, the canvas grows from 284 to 348 px, the drawing does not move or get covered | `brave-375-selected-bar.jpg` |
| 375x812 | Stewards plus one unmatched theme: "No nodes match these filters." centred on the drawing; Show all restores 29 nodes and 16 themes | `brave-375-empty-filter.jpg` |

Also checked in Brave, without screenshots: hover clears on scroll and when the pointer leaves the map; a selected member's card and coloured threads close when Themes, List or Join opens; "Find your people" scrolls to the map and opens the list (29 rows, focus on its close button); "Join the map" opens the walkthrough; dragging the picker pin from the map to above its top edge leaves it at 36.31, 0 instead of 90 (the reverse lookup then reached the local stand-in, which answers 503); at 375 the seven visible map controls are all at least 44x44 px.

- Touch at 375 used synthetic `pointerType: 'touch'` events dispatched in the page, because Claude in Chrome sends mouse input only. Mouse interactions used real clicks.
- axe-core 4.11.4 run in Brave: 0 violations on `/` at 1460x780, again with a fan open, and in a 375 frame.
- `bun run ui:verify`: not run. It cannot render in the dev machine (no Chrome there).
- `bun run test:home-map:browser`: not run, for the same reason; CI does not run it either. Its one region assertion was updated for the removed element. Its other flows click nodes with `detail: 0` events, which the new geometry handler leaves to the existing handlers.
- `astro check`: started as an extra check and interrupted; not part of the gate.

## Sources

No factual copy was written. Map names and places in this handoff come from the public `/map/state` payload.

## Production change set

None. Nothing was written to production, Directus or a database.

## Open items and decisions needed

1. **Sizing trade-off (decision).** At 1366x641 the map is 909 px wide and fully visible, but both hero buttons sit below the fold (on `main` they are half-clipped there). Below about 600 px of height the map's control row needs a scroll. A taller cap (for example 68svh, about 991 px wide at 641) would push the buttons below the fold on 768-tall screens. The current budget keeps them on screen at 1280x768 and 1024x768.
2. **Stack rule and markers (decision).** Only overlapping pins stack, as the June "no broad clusters" decision wanted, but markers now show a count, as the July audit asked. Chapters never hide.
3. **Mouse and touch choosers (decision).** A mouse gets a chooser only for pins on the same spot; a touch whenever its 44 px target holds two or more pins. In the NA corridor at 375 that is a 7-way chooser.
4. **Compact layout (decision).** DESIGN.md asks for "a single horizontal pill row anchored at the bottom of the stage". The compact map now has two rows (legend, then controls) in a band below the drawing; one row would need the P1 control redesign. Selecting a node grows the band by about 64 px at 375, so the content below moves down on that tap.
5. **One surface at a time (decision).** Opening Themes, List or Join closes the selected card. A filter change keeps a selection that is still visible, and scrolling keeps a selection (it only drops hover).
6. **Left for P1 (PRD-739).** The desktop selected card is large and can cover the control row (at 1440 a member's card covered "Join the map" until closed); docked inspector, compact hover tooltip, theme chip strip, list drawer, chapter labels at rest; passing chapter themes so theme filters apply to chapters (P2).
7. **Data.** "kitblake" appears twice (Amsterdam, Rotterdam) and "Victor Porton" twice at one point; both pairs now show as "2 people" markers.
8. **Smoke script.** `scripts/home-map-browser-smoke.ts` still needs stack and fan-pick checks, written where it can run (clean-room Chrome).
9. **Em dashes (for `qa-system-pass`).** `HomeMap.astro` still has 44, almost all in code comments. Two are user-facing and predate this PR: the live-mode walkthrough copy ("Live onboarding is on — your node appears…") and the review step's empty-place placeholder (`Member · —`). This PR added none.
10. **Small things.** The join dialog ignores Escape on purpose (its `cancel` handler protects an in-progress walkthrough). The picker shows `-0.000000` for a pin exactly on the prime meridian. The compact empty state shows two Show all buttons (note and legend), both working.
11. **Local environment.** This session started only Mac-side servers: the preview on `127.0.0.1:3301` and the map-state stand-in on 3303, both stopped at the end, and its fixture files were deleted. No database rows or Directus changes. The Postgres and Directus containers were already running (another session's) and were left alone.
