# Handoff: qa-map-data (PRD-1409)

Findings 1 and 2 (decision D2). Branch `claude/qa-map-data-5361dc`, pull request https://github.com/greenpill-dev-guild/network/pull/35 (not merged; merging deploys `network-agent`). Evidence files are in `../artifacts/qa-map-data/`.

## Changed

- **Impossible coordinates are refused wherever a location is written.** A shared rule, `getMapCoordinateProblem` in `packages/shared/src/map-locations.ts`, rejects latitude at or beyond ±90, longitude at or beyond ±180, exactly 0,0, and blank or non-numeric values (an empty field no longer reads as 0). The agent applies it to legacy submissions, confirmed places, owner edits, place-search results and reverse lookups. For an owner edit it checks the pair the node would end up with, so changing one half cannot keep a bad stored other half. Errors are explicit: `invalid_coordinates` with a message that names the problem, or `invalid_location_confirmation` when a confirmation points at an impossible place. Nothing is clamped and nothing is written.
- **The public map leaves impossible points off.** The public projection and chapter anchors skip them, the `/map/state` payload guard refuses them, and the agent logs `map_node_hidden_invalid_coordinates` with public node ids and the problem only. The rows stay in the database for the repair below or an owner edit. **Once this deploys, the five impossible nodes (two stewards, three members) drop off the map until the repair runs.**
- **Old browser state.** Pending nodes that the June client left in browser storage at 0,0 or a pole are dropped on load.
- **D2: the ecoregion layer is gone.** Deleted `packages/shared/src/public-ecoregions.ts` and `.json`, the `./public-ecoregions` export in `packages/shared/package.json`, the re-export in `packages/shared/src/index.ts`, and the generator `scripts/generate-public-ecoregions.ts`. In `HomeMap.astro`, removed only the ecoregion parts: the lazy dataset import, the client lookup, the boundary drawing and its CSS, and the build-time chapter lookup. The agent no longer stores an ecoregion name at intake. The public contract keeps its shape: `bioregion` is always empty, and `bioregionId` and `bioregionSource` are never set, on nodes and threads. Region names already stored on rows are no longer published.
- **Tests.** Ten regression tests in `scripts/map-node-contract.test.ts`; existing projection tests there updated for D2 and the stricter payload guard; in `scripts/agent-contract.test.ts` the open-ocean reverse-lookup case moves from 0,0 to 1,1 because 0,0 is now refused before any lookup.
- **Security-sensitive file:** `packages/shared/package.json` (one export removed, no dependency change).

## Root cause

Live `/map/state` on 2026-11-06 at 22:58 UTC: 29 nodes, 12 chapters and 17 people. Every person node is a row in `intake.map_node_submissions`.

| Node id | Public name | Place (as stored) | Stored lat, long | Problem |
| --- | --- | --- | --- | --- |
| `f52473d0-4d12-4e4e-a726-0dbb62d870d2` | Ash | Florida | 90, 97.76261 | latitude at the pole |
| `79b7119a-6d6f-4680-9d6d-30fc7b509f43` | Swift Evo (steward) | Taiwan | 90, 176.912492 | latitude at the pole |
| `8804877c-508e-446d-bf27-bbb23b76598a` | Amio (steward) | Awka | 56.462976, -180 | longitude at the map edge |
| `21cb7662-1a87-4922-8373-4376f07a9c7c` | Emmanuel Jacobson | Port Harcourt | 0, 0 | 0,0 |
| `fc0cb8bd-7be9-4c48-a1d1-5ed013834e07` | kitblake | Rotterdam, Netherlands | 0, 0 | 0,0 |
| `10c4c9cb-baea-4e0b-983c-179c3eb88b1f` | Eve | Brooklyn, new york | -22.9068, -43.1729 | in Rio de Janeiro, wrong country |
| `0a76afe9-f1c1-4032-acf8-cd89f5329209` | Victor Porton | Ashkelon, Israel | -22.9068, -43.1729 | in Rio de Janeiro, wrong country |
| `1cc9c540-9678-4a62-9418-f0bc9431f378` | Victor Porton (second row) | Ashkelon, Israel | -22.9068, -43.1729 | same; duplicate |
| `20bb327b-e9ca-4b1d-a1c5-999c57c5ec49` | Guilherme Lopes Ferreira (Dida) | Campinas | -20.157804, -48.541667 | 342 km from Campinas |
| `1f4be540-91f6-4dcb-b68b-7cf828224bee` | Nansel | Lagos | 9.045151, 9.049479 | 686 km from Lagos; the label may be the error |
| `9d2ddbea-d2ae-4e9e-93a6-32bb151e2aed` | Los Higuerones | Cooperativa Los Higuerones | 8.090131, -75 | cannot verify |

The other six people (Kaz, kitblake in Amsterdam, Matty Compost, Metafortune77, Pin-Dorama, Rebecca) sit where their places say.

**How they were written.** All of them match the add-node client that ran from `228168e` (2026-06-17, the live mapping rehearsal, the session PRD-617 quotes) until `ec740e9` replaced it with confirmed places on 2026-07-12. Running that client's own code against the inputs (`../artifacts/qa-map-data/legacy-picker-repro.ts`, output in `legacy-picker-repro.out`) reproduces every stored value exactly:

1. **A drag clamped to the map edge** (Ash, Swift Evo, Amio). `placeFromPointer` mapped the pointer into the mini-map box and clamped it to the edges under pointer capture, then saved `toFixed(6)`. Dragging past the top edge saved latitude exactly 90; past the left edge, longitude exactly -180. The other coordinate is wherever the pointer was. A typed place that is not in the bundled list stays as the label, so "Florida", "Taiwan" and "Awka" survived.
2. **An empty field read as 0** (Emmanuel Jacobson, kitblake in Rotterdam). With no pin, the hidden latitude and longitude fields were empty and `toFiniteNumber('')` returned 0, because `Number('') === 0`. A place pasted or autofilled in one input event ran `setLocation(0, 0, place)`. Typed one key at a time, the same text lands on Singapore or Rome instead, so these two were pasted or autofilled.
3. **A substring auto-match** (Eve, both Victor Porton rows). The place box matched each keystroke against the bundled list with `includes()`. "Br" and "As" both match "Greenpill Brasil" at -22.9068, -43.1729. Later keystrokes matched nothing, so the pin stayed in Rio while the label became the typed text.
4. **A nearest-city auto-label** (Nansel). A dragged pin took the name of the nearest bundled city unless a custom place was typed, and a pin at 9.045, 9.049 in central Nigeria labels itself "Lagos". The pin may be right and the label wrong.
5. **Mini-map precision** (Dida). "Campinas" was typed (a custom label) and the pin landed about 3 px away on a 320 px mini-map, which is 342 km.

The agent accepted all of these. Its range checks were inclusive (90 and -180 passed), it had no 0,0 rule, and the database checks from migration 018 are also inclusive and `NOT VALID`. The PRD-617 repair runner only moves rows whose stored city, region or country confirm the match; these rows have none, so they were never eligible.

**What could still write a bad point before this change.** The website has sent only confirmed places since July. On the agent: (a) the legacy raw-location path, open when `MAP_LOCATION_CONFIRMATION_REQUIRED=false`, accepted 90, -180 and 0,0 (reproduced locally, below); (b) a confirmation or provider result at an impossible point (no known case); (c) a Directus admin edit (steward moderators cannot edit coordinates). The current picker still clamps a dragged pin to the edge (`pointFromLocationPointer`), which Brave QA reproduced below; the agent now refuses that pin with a clear message instead of asking the geocoder about it.

A country check was considered and left out: after D2 the repository holds no country boundaries, and adding them would mean a new dataset or dependency. The confirmed-place flow is what ties a point to its label.

## Evidence

- **Agent boundary on the local stack** (agent on 3303 in rollout mode, local Postgres on 3304; the script posts only to that local agent and deletes its rows). Before: latitude 90, longitude -180 and 0,0 each returned 201 and were stored (`agent-boundary-before.out`). After: each returned `400 invalid_coordinates` with "Latitude must be between -90 and 90, not at a pole.", "Longitude must be between -180 and 180, not on the edge of the map." and "Latitude 0, longitude 0 is a placeholder, not a place. Find and confirm the place again.", and nothing was written (`agent-boundary-after.out`).
- **Tests and checks** (in the worktree, inside the dev machine): `bun run test:map-nodes` 53 pass, 0 fail (43 before); `bun run test:agent` 80 and 14 pass; `bun run typecheck` clean; `bun run check` in `packages/website` (astro check) 0 errors, 0 warnings; `bun run build:website` built 47 pages; `bun run ui:check` 0 hard, 0 warn. No built JavaScript mentions ecoregions; the largest chunk is HomeMap at 63 KB, and the roughly 950 KB lazy dataset chunk is gone.
- **Brave QA** (Afo's Brave profile through Claude in Chrome; build served on `127.0.0.1:3301`, local agent with 12 rehearsal members plus two seeded rows at 90 and 0,0, removed afterwards):
  - `/map/state` from the page: 200, the two seeded rows absent, no node or thread with a region, no node at an impossible point, no ecoregion request, no outline layer in the DOM.
  - 1440: `brave-1440-home-map.jpg`, `brave-1440-selected-member.jpg` (inspector shows the member and connections, no region line, no boundary).
  - 1024 and 375: the window would not resize, so both widths ran as same-origin frames of exactly 1024 and 375 px in the same tab (`brave-1024-and-375-home-map.jpg`, `brave-375-selected-member.jpg`). 12 people and 12 chapters render, no horizontal overflow, and the 375 sheet has no region line. The map chrome covering much of the map at 375 is the existing PRD-739 item.
  - Add-node picker: dragging the pin past the top edge put 90.000000 in the latitude field; the reverse lookup returned 400 and the dialog showed "Latitude must be between -90 and 90, not at a pole." with Review disabled (`brave-1440-picker-edge-refused.jpg`).
- **Repair rehearsal on local Postgres** (`repair-rehearsal.out`): nine throwaway rows with the change set's ids and stored values; dry run 9 of 9 ready, apply changed 9 and wrote 9 audit rows, a second apply was refused with nothing changed, revert restored all 9, rows deleted.

## Sources

Proposed points come from OpenStreetMap through Nominatim, the geocoder the map's place search uses, so a repaired pin matches what a fresh confirmation of the same place returns. Each search was opened in Brave on 2026-11-06 (`https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=en&q=...`):

- `q=Florida, United States`: relation 162050, "Florida, United States" (state), 27.7567667, -81.4639835.
- `q=Taiwan`: relation 449220, "Taiwan" (country), 23.9739374, 120.9820179.
- `q=Awka, Nigeria`: node 501540935, "Awka, Awka South, Anambra State, 420108, Nigeria" (city), 6.2189470, 7.0774372.
- `q=Port Harcourt, Nigeria`: relation 3720765, "Port-Harcourt, Rivers State, Nigeria" (city), 4.7676576, 7.0188527.
- `q=Rotterdam, Netherlands`: relation 1411101, "Rotterdam, South Holland, Netherlands" (city), 51.9244424, 4.4777500.
- `q=Brooklyn, New York`: relation 9691750, "Brooklyn, Kings County, New York, United States", 40.6526006, -73.9497211.
- `q=Ashkelon, Israel`: relation 1376782, "Ashkelon, Ashkelon Subdistrict, South District, Israel" (town), 31.6653191, 34.5650440.
- `q=Campinas, Brazil`: relation 5684860, "Campinas, São Paulo, Southeast Region, Brazil" (city), -22.9056391, -47.0595640.
- `q=Lagos, Nigeria`: node 27565124, "Lagos, Lagos Island, Lagos State, 100242, Nigeria" (city), 6.4550575, 3.3941795. Used only for the distance above; no change proposed.
- `q=Los Higuerones, Colombia`: two unrelated localities (Ábrego, Norte de Santander; Enciso, Santander). Neither is shown to be the cooperative, so no change is proposed.

## Production change set

**Status: proposed, not approved.** Nothing has been written to production. Only latitude and longitude change; place text, names and private fields stay as they are. Values are rounded to the column's six decimals.

| Node id | Public name | Place (unchanged) | Current | Proposed | Moves | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `f52473d0-4d12-4e4e-a726-0dbb62d870d2` | Ash | Florida | 90, 97.76261 | 27.756767, -81.463984 | 6,921 km | OSM relation 162050 (state) |
| `79b7119a-6d6f-4680-9d6d-30fc7b509f43` | Swift Evo | Taiwan | 90, 176.912492 | 23.973937, 120.982018 | 7,342 km | OSM relation 449220 (country) |
| `8804877c-508e-446d-bf27-bbb23b76598a` | Amio | Awka | 56.462976, -180 | 6.218947, 7.077437 | 13,015 km | OSM node 501540935 (city) |
| `21cb7662-1a87-4922-8373-4376f07a9c7c` | Emmanuel Jacobson | Port Harcourt | 0, 0 | 4.767658, 7.018853 | 943 km | OSM relation 3720765 (city) |
| `fc0cb8bd-7be9-4c48-a1d1-5ed013834e07` | kitblake | Rotterdam, Netherlands | 0, 0 | 51.924442, 4.477750 | 5,789 km | OSM relation 1411101 (city) |
| `10c4c9cb-baea-4e0b-983c-179c3eb88b1f` | Eve | Brooklyn, new york | -22.9068, -43.1729 | 40.652601, -73.949721 | 7,751 km | OSM relation 9691750 (borough) |
| `0a76afe9-f1c1-4032-acf8-cd89f5329209` | Victor Porton | Ashkelon, Israel | -22.9068, -43.1729 | 31.665319, 34.565044 | 10,249 km | OSM relation 1376782 (town) |
| `1cc9c540-9678-4a62-9418-f0bc9431f378` | Victor Porton (second row) | Ashkelon, Israel | -22.9068, -43.1729 | 31.665319, 34.565044 | 10,249 km | same; see duplicates below |
| `20bb327b-e9ca-4b1d-a1c5-999c57c5ec49` | Guilherme Lopes Ferreira (Dida) | Campinas | -20.157804, -48.541667 | -22.905639, -47.059564 | 342 km | OSM relation 5684860 (city) |

Not in the change set:

- **Nansel** (`1f4be540-…`, "Lagos", 9.045151, 9.049479). The pin is in Nigeria; the June client probably wrote "Lagos" as an automatic nearest-city label. Moving the pin to Lagos could make it less accurate. Ask Nansel or a Nigeria steward, or Nansel can fix it with an edit link.
- **Cooperativa Los Higuerones** (`9d2ddbea-…`, 8.090131, -75). No public source places the cooperative. Leave it for a steward to confirm.

**How to apply, after approval and after the PR deploys `network-agent`:** run `../artifacts/qa-map-data/repair-map-node-coordinates.cjs` inside the agent machine (commands are in its header). A dry run reports whether each row still holds the reviewed values. `--apply` is all or nothing, only touches rows that still match, records every change in `intake.map_node_location_repairs`, and prints a run id. `--revert <run-id>` undoes it. Then check live `/map/state` for the nine points.

## Open items and decisions needed

1. **Approve the change set (input I5).** If approved as is, the nine rows move. Say which rows to drop if not.
2. **Duplicates.** Victor Porton has two identical rows, and kitblake has a correct Amsterdam row plus the Rotterdam row at 0,0. The change set moves all of them. If you would rather archive one Victor Porton row, or the kitblake Rotterdam row, a moderator can set its status to archived in Directus and I will drop it from the runner.
3. **Production flag.** Please confirm `MAP_LOCATION_CONFIRMATION_REQUIRED` on `network-agent` is `true` or unset. Its value is a secret (Fly shows only a digest), and a validation-only production probe was blocked by the permission classifier, so I could not check it. After this change the raw path refuses impossible points either way, but while it is open it still accepts any free-text place with any plausible point, which is how the Eve, Victor Porton and Dida rows happened.
4. **Follow-up (not done here): tighten the database checks.** A migration that adds exclusive latitude and longitude bounds and a not-0,0 check as `NOT VALID`, then `VALIDATE` after the repair, would also cover Directus admin edits. It needs its own production apply.
5. **Optional:** clear the ecoregion names stored in `intake.map_node_submissions.bioregion`. They are no longer published, so this is tidiness only.
6. **Requests to other sessions:**
   - `qa-brand-shell`: drop the footer credit "Ecoregion boundaries: RESOLVE Ecoregions 2017, CC-BY 4.0." (D2). The dataset is gone once this merges.
   - `qa-map-polish` (owns `HomeMap.astro` next): the selected card, hover card and thread tooltip still read `bioregion`, which is now always empty, so those paths can go. The location picker still clamps a dragged pin to the map edge and the coordinate fields accept ±90 and ±180; ignoring off-map points in the browser would spare the user a round trip, although the agent now refuses them with a clear message.
7. **Local environment.** I started the shared Postgres container and `dm-ports`; I am leaving both running for other sessions. My local agent process (`bun --watch src/server.ts`, port 3303, local database only, rollout mode) could not be stopped from this session because the permission classifier blocked stopping it by pid. It is harmless, but stop it before the next `bun run dev`.
