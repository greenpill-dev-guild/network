# Plan - Homepage Live Map UX Honing, Round 2

Use this as the implementation prompt for the next agent. This is a polish pass
on the public homepage live map. It is not a schema/API redesign, not a deploy,
and not a broad homepage rewrite.

## Start Here

Repo:

```sh
cd "$(git rev-parse --show-toplevel)"
```

Read these first, in this order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `packages/website/CLAUDE.md`
4. `packages/website/DESIGN.md`
5. `packages/website/src/styles/gp-tokens.css`
6. `docs/agentic-mcp-tooling-runbook.md`
7. `.plans/active/public-website-design-implementation/status.json`

Before UI/CSS/accessibility work, run:

```sh
bun run agentic:guidance
```

Important current-WIP note: the checkout may already contain map-related work.
Preserve unrelated WIP. Do not revert files you did not intentionally change.
The current WIP already appears to include icon-only map zoom/reset controls and
bounded desktop drag-pan when zoomed; preserve and test those instead of
re-solving them.

## Context

Round 1 shipped person-to-person edges, theme-colored connections, zoom/pan, and
a mobile connection sheet. Tests can pass while the map still feels awkward. The
goal of this round is to improve the actual user flow:

1. Desktop selection should not open an in-flow panel below the map.
2. Selection should read on the map: selected node, adjacent edges, edge
   tooltip, and a small pinned node card.
3. Mobile selection should not obscure the map or require closing a sheet before
   choosing another node.
4. No looping animation should remain anywhere in the map.
5. The world land silhouette should be geographically credible, including
   Central Asia and southern Russia.
6. Theme colors should become distinct and semantic, not a cluster of similar
   gold/orange hues.

## Locked Decisions

- Desktop selected state: use an on-map pinned card near the selected node.
  Reuse the existing focus-card visual language, but make the selected version
  persistent and interactive.
- Desktop must not reveal the bottom selected panel, must not call
  `scrollIntoView`, and must not scroll the page away from the map.
- Mobile selected state: use a compact bar over the lower edge of the map canvas.
  It shows node identity plus horizontally scrollable connection chips. Tapping
  another node swaps the bar immediately.
- Owner edit affordance moves into the selected card/bar for approved submitted
  nodes only. Keep the existing neutral edit-link contract.
- World map accuracy matters more than rushing the easiest polygon patch.
- No fake nodes, fake density, coordinate nudging, private data exposure, public
  payload shape changes, schema changes, API-route changes, dependency installs,
  deploys, or commits unless the user explicitly approves them.

## Current Code Reality To Verify

These are the current surfaces this plan expects:

- `packages/website/src/components/page-sections/HomeMap.astro` contains the
  hand-simplified `CONTINENTS` polygons, dot-grid generation, focus card,
  selected panel/bar markup, zoom/pan logic, edge tooltip, owner edit-link UI,
  and map interaction script.
- The hand-drawn world map is still defined by `CONTINENTS`; the code comment
  says it is not geodetic accuracy.
- `.gp-home-map-selected` is still an in-flow selected-node surface.
- `openSelected` still reveals `.gp-home-map-selected` and calls
  `selectedEl.scrollIntoView(...)`.
- `.gp-home-map-focus` is still primarily hover/focus UI with
  `pointer-events: none` and is hidden on mobile.
- `gpMapNodeRipple` and `.gp-home-map-node-ripple` still exist and loop on
  hover/focus.
- Theme colors live in `PUBLIC_MAP_THEMES` in `packages/shared/src/map-state.ts`
  and in `THEME_INFO` in `HomeMap.astro`.
- `scripts/home-map-browser-smoke.ts` still expects a desktop selected panel in
  at least one assertion.

If any of these have changed before implementation starts, adapt the plan to the
new source instead of restoring stale behavior.

## Non-Goals

- Do not add generated decorative density nodes.
- Do not invent relationships that are not in the public map state.
- Do not expose emails, raw notes, IP addresses, user agents, spam metadata,
  steward review notes, pending submissions, edit tokens, or private Directus
  state.
- Do not change the public `/map/state` payload shape.
- Do not change agent routes, migrations, or Directus permissions.
- Do not install new dependencies or upgrade package manager/runtime tooling.
- Do not deploy or commit.
- Do not replace the homepage or the whole HomeMap component.

## Implementation Plan

### 1. Desktop Selection: Persistent On-Map Card, No Panel

Change selected member/steward behavior on desktop (`!isTouchMap()`):

- Selecting a submitted member/steward node should:
  - add persistent selected state to the node;
  - call `setFocus` so adjacent edges light up and non-adjacent edges dim;
  - keep the focus card pinned near the node;
  - keep edge hover tooltips available for adjacent edges;
  - not reveal `.gp-home-map-selected`;
  - not call `scrollIntoView`;
  - not move the page scroll position.
- Chapter nodes continue to navigate as links.
- Hover/focus on an unselected node keeps the existing ephemeral card behavior.
- Selecting another submitted node swaps selection immediately.
- Deselect on:
  - close button in the selected card;
  - Escape;
  - click on empty map/canvas;
  - active filters hiding the selected node.

Accessibility requirements:

- Once the pinned card contains interactive controls, do not leave the whole
  interactive card as only `role="status"`.
- Preferred pattern: make the persistent selected card a named interactive
  region, such as `role="region" aria-label="Selected map node"`, and keep any
  live text updates in a small child with `aria-live="polite"` if needed.
- All controls must be native `button` or `a` elements with clear accessible
  names.
- Escape must dismiss selection without trapping focus.
- If focus is inside the card and the selected node changes or closes, return
  focus predictably to the selected node or the map control that triggered the
  change.

Owner edit affordance:

- Approved submitted nodes only show the owner edit affordance.
- Use "Edit this node" or similarly clear visible copy.
- Reuse the existing `requestEditLink` flow and
  `/map-nodes/{sourceId}/edit-link` contract.
- Preserve neutral copy and behavior: the UI must not reveal whether an email
  matches a node owner.
- Clear the email input after submit so private email does not linger in the DOM.

### 2. Mobile Selection: Compact Bar Over The Map

Change selected member/steward behavior on mobile/touch maps:

- Reuse or adapt `.gp-home-map-selected` as a compact bar on mobile only.
- Position it inside `.gp-home-map-canvas`, over the lower edge of the map.
- The map must remain visible above it.
- The bar should contain:
  - node name;
  - node role/type;
  - compact place/bioregion if public and available;
  - horizontally scrollable connection chips;
  - close button;
  - minimal owner edit affordance for approved submitted nodes only.
- Connection chips should be buttons with:
  - theme dot/color;
  - connected node name;
  - short meta such as role plus shared theme;
  - `aria-pressed` or equivalent active state when selected.
- Tapping a chip should:
  - call `applyEdgeHighlight`;
  - set exactly one active chip;
  - frame the connected node into the visible area above the bar.
- Tapping another node should swap the bar content without requiring close.
- Opening the bar must not call `scrollIntoView` and must not change page scroll.

Mobile layout requirements:

- Do not let the compact bar collide with existing bottom map controls.
- Either raise/reposition the controls above the bar when the bar is open or
  reserve enough inset for both surfaces.
- Use logical properties and safe-area handling where needed.
- Standalone close/edit/chip controls must satisfy 44px touch target guidance.
- Keep text from overflowing at 375px.
- Use `dvh`/`svh`/`lvh` for viewport-dependent heights; do not use `vh`.

Framing requirement:

- `frameNodeNeighbourhood` and `frameConnectedNode` need bottom padding when the
  mobile bar is open. The selected node and connected endpoint should land in
  the visible map area above the bar, not underneath it.

### 3. Remove All Looping Animation

Remove all looping map animation:

- Remove ripple circles from the SSR chapter node template.
- Remove ripple circles from client-created submitted nodes.
- Delete `.gp-home-map-node-ripple` CSS.
- Delete `@keyframes gpMapNodeRipple`.
- Remove any `animation: ... infinite` introduced for the map.
- Keep one-shot `gpMapThreadGrow` for entering/live-added edges.
- Keep one-shot `gpMapAdjacentThread` for reveal-on-focus if it still feels
  useful.
- Existing connections should render when the map opens.
- Live-mode new connections may grow in once.
- Hover/focus/selection should be static or one-shot only. No perpetual pulse.

Docs to update:

- `packages/website/CLAUDE.md` rule 16 currently allows the map node pulse.
  Update it so no looping map pulse is sanctioned.
- `packages/website/DESIGN.md` motion tokens and "Where motion is allowed" /
  "Where motion is forbidden" currently allow the mycelial map pulse. Update
  them so no idle/infinite map animation is allowed.

### 4. Accurate World Land Dataset

Replace the hand-drawn `CONTINENTS` polygons with a compact checked-in land data
module derived from a real simplified land dataset.

Preferred source:

- Natural Earth 110m Land, public domain.
- Source page: `https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/`
- Terms: `https://www.naturalearthdata.com/about/terms-of-use/`

Implementation shape:

- Add a compact derived data module under `packages/website/src/data/`, for
  example `world-land-rings.ts`.
- Store only the simplified rings needed to generate the dot silhouette.
- Include a short provenance comment: source, version/date if available, and
  transform summary.
- Consume the data at Astro build time only. Do not ship raw land polygons to
  the browser. The browser output should still be SVG dots.
- Support Polygon and MultiPolygon structures. Lake holes may be ignored at this
  grid resolution unless visual proof shows they read badly.
- Keep the dot-map aesthetic.
- Consider a grid bump from 120x60 to around 160x80 only if build/render
  performance stays reasonable.

Sourcing/fallback:

- Prefer a reachable Natural Earth GeoJSON source or official mirror so the
  transform can be simple and dependency-free.
- If the fetch/source path is blocked, stop and record the blocker before
  hand-authoring anything large.
- A fallback hand-authored outline is acceptable only if it is accurate enough
  to fix Central Asia, southern Russia, and the major landmass gaps. Do not
  regress into decorative approximations.

Acceptance checks:

- Central Asia is visibly land: Kazakhstan, Uzbekistan, and Afghanistan should
  no longer sit in an ocean hole.
- Southern Russia around roughly 55N and 60E-100E should render as land.
- Europe/Asia should read as one continuous Eurasian landmass where appropriate.
- Coastlines remain recognizable at homepage scale.
- No meaningful build or browser performance regression.

### 5. Distinct Semantic Theme Palette

Replace the current clustered theme colors with a distinct semantic palette.

Reduce duplication if feasible:

- Prefer deriving HomeMap `THEME_INFO` from `PUBLIC_MAP_THEMES` at build time,
  then adding alias entries for legacy IDs.
- If keeping two explicit lists, add a test guard that verifies IDs and colors
  stay in sync.

Candidate palette:

| Theme | Color | Intent |
| --- | --- | --- |
| `water` | `#2BA7FF` | blue water |
| `opensrc` | `#00D5E8` | cyan open systems |
| `impact` | `#34D399` | emerald proof/impact |
| `trees` | `#75D063` | green biodiversity |
| `food` | `#C6D84F` | yellow-green agriculture |
| `energy` | `#FFD84D` | yellow energy |
| `education` | `#12C7B4` | teal learning |
| `events` | `#FF9F1C` | orange gatherings |
| `funding` | `#FF6B35` | orange-red grants |
| `currency` | `#EF476F` | red/coral exchange |
| `mutual` | `#F472B6` | rose care/mutual aid |
| `stories` | `#D946EF` | magenta storytelling |
| `ai` | `#B067FF` | purple automation |
| `desci` | `#536DFE` | indigo research |
| `gov` | `#7C9CFF` | slate-blue governance |
| `public` | `#B9A6C9` | muted violet-gray public goods |

Alias handling in HomeMap:

- `public-goods` -> `public`
- `local-regeneration` -> `trees`
- `knowledge-commons` -> `education`
- `coordination-tools` -> `opensrc` or `gov`, whichever reads better in the
  final visual proof

Visual requirements:

- Colors must be legible as thin strokes on the deep forest canvas.
- Adjacent semantic pairs must still be distinguishable, especially:
  - water vs opensrc;
  - opensrc vs education;
  - events vs funding;
  - funding vs currency;
  - ai vs desci;
  - gov vs public.
- The steward node fill test for `rgb(240, 220, 160)` is node identity color,
  not a theme color. Keep that test intact.

### 6. Test Updates

Update `scripts/home-map-browser-smoke.ts`.

Desktop assertions:

- Replace "selected panel opens" assertions with persistent focus-card
  assertions.
- After clicking a submitted steward/member node on desktop:
  - `.gp-home-map-focus` or the new selected-card region is visible;
  - it contains node name, role/type, themes, and connection summary;
  - `.gp-home-map-selected` remains hidden or desktop-inactive;
  - page scroll position is unchanged;
  - adjacent edges remain locked;
  - edge hover tooltip still names who connects to whom and the shared theme;
  - no private fields appear in DOM/card/localStorage.
- Add Escape and empty-map click close assertions if practical.

Mobile assertions:

- Tapping a submitted node opens the compact bar over the map, not an in-flow
  sheet below it.
- Opening the bar does not call page scroll and does not require closing before
  selecting another node.
- Connection chips render with `data-selected-edge-row`.
- Tapping a chip sets exactly one active row and frames the connected node.
- Tapping another node swaps bar content instantly.
- Bar and controls do not overlap at 375px.
- Private-field leak checks include:
  - map canvas DOM;
  - persistent desktop card;
  - mobile compact bar;
  - localStorage.

Motion assertions:

- Idle threads have no prominent looping animation.
- No node ripple animation is present.

Update `scripts/map-node-contract.test.ts`.

Add or adjust guards:

- `gpMapNodeRipple` is absent.
- `.gp-home-map-node-ripple` is absent.
- no `animation: ... infinite` exists in `HomeMap.astro`.
- `openSelected` or its replacement does not call `scrollIntoView`.
- desktop selected behavior uses the focus-card/selected-card path, not a
  bottom in-flow panel.
- mobile compact bar remains container-query controlled.
- theme IDs/colors stay in sync between shared map themes and HomeMap theme
  info, or HomeMap derives from shared themes.
- world land data is imported from the new data module, not from the old
  hand-drawn `CONTINENTS` list.

Preserve existing guards that still matter:

- `frameConnectedNode`
- `renderSelectedEdgeList`
- `data-selected-edge-row`
- edit-link contract
- one-shot thread motion
- private-field contract

### 7. Verification

Run source and contract validation:

```sh
bun run agentic:check
bun run typecheck
bun run build:website
bun run test:map-nodes
HOME_MAP_BROWSER_SMOKE_REQUIRED=1 bun run test:home-map:browser:required
```

Run full local stack proof only after the repo-native stack is running:

```sh
bun run dev
```

Then, in another terminal:

```sh
bun run test:home-map:live-e2e --keep-live --expanded
```

Important QA policy:

- `test:home-map:browser` and `ui:verify` are clean-room/script evidence.
- Local layout, interaction, motion, and public-route QA must use the
  authenticated Brave QA profile via the live authenticated-browser path
  described in `AGENTS.md` and `packages/website/CLAUDE.md`.
- Do not report isolated Browser, Playwright, or DevTools MCP as authenticated
  Brave QA.
- If authenticated Brave is unavailable, report authenticated QA as blocked
  instead of substituting another browser profile.

Authenticated Brave walkthrough checklist:

Desktop:

- Select a submitted member/steward node.
- No in-flow panel appears below the map.
- Page does not scroll.
- Node plus adjacent edges light up.
- Non-adjacent edges dim.
- Small selected card pins near the node.
- Card close button works.
- Approved submitted node exposes neutral "Edit this node" flow.
- Hover an adjacent edge and verify tooltip names both endpoints plus shared
  theme.
- Zoomed map still supports bounded desktop drag-pan.
- Reset/full-map icon still works.
- No perpetual pulse or looping animation appears.
- Theme colors are visibly distinct.
- Central Asia and southern Russia are present in the world silhouette.

Mobile:

- Tap a submitted node.
- Compact bar appears over the map lower edge.
- Map remains visible above the bar.
- Bar does not overlap controls.
- Tap a connection chip.
- Exactly one chip becomes active.
- Connected node frames into visible map area above the bar.
- Tap another node.
- Bar swaps without closing first.
- Close button dismisses the bar.
- Reset restores the full map.
- No private fields appear in DOM or storage.

Visual proof:

- Run or capture the affected homepage route at 375, 1024, and 1440 widths.
- Inspect the 375px view first.
- Confirm no text overflow, incoherent overlap, or clipped controls.

## Critical Files

- `packages/website/src/components/page-sections/HomeMap.astro`
- `packages/shared/src/map-state.ts`
- `packages/website/src/data/<new-world-land-data>.ts`
- `scripts/home-map-browser-smoke.ts`
- `scripts/map-node-contract.test.ts`
- `packages/website/CLAUDE.md`
- `packages/website/DESIGN.md`
- `scripts/data/ui-source-baseline.tsv`, only if `ui:check` legitimately
  requires a source-baseline update

## Done Criteria

This round is complete only when:

- Desktop selection is on-map and persistent.
- Desktop selection does not open the in-flow selected panel.
- Desktop selection does not scroll the page.
- Mobile selection is a compact over-map bar, not a page-flow sheet.
- Mobile node switching is instant.
- Owner edit-link request remains neutral and public-safe.
- All ripple markup, CSS, keyframes, and looping map animations are gone.
- Natural Earth or equivalent accurate land data replaces the hand-drawn
  continent hole.
- Central Asia and southern Russia render as land.
- Theme colors are distinct, semantic, and synced across shared/HomeMap usage.
- Public map payload shape is unchanged.
- No fake nodes, fake density, coordinate nudging, private data, schema change,
  API-route change, dependency install, deploy, or commit was introduced.
- All listed validation passes, or any blocker is documented with exact command
  output and the safest next step.
