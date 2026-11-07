# Handoff: qa-map-data (PRD-1409)

Findings 1 and 2 (decision D2). Branch `claude/qa-map-data-5361dc`, pull request https://github.com/greenpill-dev-guild/network/pull/35 (merged as `1358466` on 2026-11-07, deployed as `network-agent` v79; the approved repair ran right after). Evidence files are in `../artifacts/qa-map-data/`.

## Changed

- **Bad coordinates are refused wherever a location is written.** A shared rule in `packages/shared/src/map-locations.ts` refuses blank or non-numeric values (an empty field no longer reads as 0), latitude beyond ±90, longitude beyond ±180, and exactly 0,0. An exact edge point (latitude ±90 or longitude ±180) is a real place when a geocoder confirmed it (Fiji spans the 180th meridian), and indistinguishable from a pin clamped to the map edge when it arrives as raw coordinates. So the agent accepts edge points from confirmed places and refuses them from raw coordinates with "A point on the edge of the map needs a confirmed place. Find and confirm your place." The rules apply to legacy submissions, confirmed places, owner edits (checking the pair the node would end up with, so changing one half cannot keep a bad stored other half), place-search results and reverse lookups. A reverse lookup refuses blank, out-of-range and 0,0 pins before asking the geocoder, and sends edge pins to the geocoder, which confirms a real place there and finds nothing near a clamped pin. Errors are explicit (`invalid_coordinates`, or `invalid_location_confirmation` for a confirmation at 0,0). Nothing is clamped and nothing is written.
- **The public map leaves 0,0 and out-of-range points off.** The public projection and chapter anchors (in `/map/state`, the server-rendered home map and `/locations.json`) skip them, the `/map/state` payload guard refuses them, and the agent logs `map_node_hidden_invalid_coordinates` with public node ids and the problem only. Edge points stay, because they may be real. **Once this deploys, the two nodes at 0,0 drop off the map until the repair runs; the three at the map's edge stay where they are until the repair moves them.**
- **Old browser state.** Pending nodes that the June client left in browser storage at 0,0 are dropped on load.
- **D2: the ecoregion layer and its credit are gone.** Deleted `packages/shared/src/public-ecoregions.ts` and `.json`, the `./public-ecoregions` export in `packages/shared/package.json`, the re-export in `packages/shared/src/index.ts`, and the generator `scripts/generate-public-ecoregions.ts`. In `HomeMap.astro`, removed only the ecoregion parts: the lazy dataset import, the client lookup, the boundary drawing and its CSS, and the build-time chapter lookup. In `SiteFooter.astro`, removed only the "Ecoregion boundaries: RESOLVE Ecoregions 2017, CC-BY 4.0." line, in the same change as the CC BY data it credited (orchestrator instruction). The agent no longer stores an ecoregion name at intake. The public contract keeps its shape: `bioregion` is always empty, and `bioregionId` and `bioregionSource` are never set, on nodes and threads. Region names already stored on rows are no longer published.
- **Review follow-ups (`a5fdc36`, the four Codex threads on #35).**
  - *Stored precision.* Coordinates live in `numeric(9, 6)` columns, and PostgreSQL rounds anything finer, so `(89.9999999, 10)` passed the checks and would be saved as `(90, 10)`, and `(0, 0.0000001)` as 0,0. The shared rule now judges the six-decimal stored value (`toStoredMapCoordinate`), and the agent rounds raw coordinates and geocoder results before it judges and saves them, so the database receives exactly the value that was checked.
  - *Approving from a moderation link.* `moderateMapNode` refuses to approve a pending node saved at a missing, out-of-range or 0,0 point, with `moderation_invalid_location` (422): "This node's saved location is missing, out of range, or 0,0, so the map can't show it. Decline it, or correct the location in Directus before approving." The moderation page already shows the agent's message. Declining still works, and edge points still approve.
  - *Chapter pins.* The home map's server-rendered chapter anchors and `/locations.json` use the shared rule, so a chapter at 0,0 or out of range is left off. The live refresh never redraws chapters, so the build is the only place that can drop one. The `/locations.json` projection also stops reading a null coordinate as 0. All 18 chapters in the current snapshot have valid points, so nothing changes on the page today.
  - *Directus approvals are not covered by code here.* A steward who approves a pending submission or an owner update request in Directus never reaches the agent. See open item 4.
- **Tests.** Fourteen regression tests in `scripts/map-node-contract.test.ts` (including a place on the 180th meridian that must still save, and the rounding cases above) and one in `scripts/map-node-moderation.test.ts`; existing projection tests there updated for D2 and the stricter payload guard; in `scripts/agent-contract.test.ts` the open-ocean reverse-lookup case moves from 0,0 to 1,1 because 0,0 is now refused before any lookup.
- **History.** The first commit refused every edge point. The hub then clarified that a real location on the 180th meridian must save, and `d0d9676` narrowed the rule as described above. `a5fdc36` answers the Codex review.
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

**What could still write a bad point before this change.** The website has sent only confirmed places since July. On the agent: (a) the legacy raw-location path, open when `MAP_LOCATION_CONFIRMATION_REQUIRED=false`, accepted 90, -180 and 0,0 (reproduced locally, below); (b) a confirmation or provider result at 0,0 (no known case); (c) a Directus admin edit (steward moderators cannot edit coordinates). The current picker still clamps a dragged pin to the edge (`pointFromLocationPointer`), which Brave QA reproduced below. That pin was never stored, because the reverse lookup only confirms a geocoder place within 25 km, and the confirmation then carries the geocoder's point, not the pin.

A country check was considered and left out: after D2 the repository holds no country boundaries, and adding them would mean a new dataset or dependency. The confirmed-place flow is what ties a point to its label.

## Evidence

- **Agent boundary on the local stack** (agent on 3303 in rollout mode, local Postgres on 3304; the script posts only to that local agent and deletes its rows). Before: latitude 90, longitude -180 and 0,0 each returned 201 and were stored (`agent-boundary-before.out`). After (`agent-boundary-after.out`): the two edge points returned `400 invalid_coordinates` with "A point on the edge of the map needs a confirmed place. Find and confirm your place.", 0,0 returned "Latitude 0, longitude 0 is a placeholder, not a place. Find and confirm the place again.", latitude 90.5 returned "Latitude must be between -90 and 90.", and a real point just inside the meridian (-16.8, 179.99) saved with 201. Nothing else was written, and the one test row was deleted.
- **Pre-PR gate** (`AGENTS.md`, inside the dev machine, on `a5fdc36`): `bun run typecheck` exit 0; `bun run test:map-nodes` 57 pass, 0 fail (43 before this work); `bun run test:agent` 80 and 15 pass; `bun run test:content` 33 pass (run because `public-content.ts` changed); `bun run agentic:check` exit 0 (guidance, browser-verification policy check passed, 11 plan hubs valid, `ui:check` 0 hard, 0 warn); `bun run build` 47 pages. The same gate passed on `d0d9676`, and earlier `astro check` reported 0 errors and 0 warnings. No built JavaScript mentions ecoregions; the largest chunk is HomeMap at 63 KB, and the roughly 950 KB lazy dataset chunk is gone.
- **The review tests fail without the fixes.** With the source of `f88bc31` (and the shared rule reading unrounded values), the five new tests fail and the 67 older ones pass (map nodes 53 pass, 4 fail; moderation 14 pass, 1 fail). The fixes were restored from the commit and the gate above ran on it.
- **Brave was not re-run for `a5fdc36`.** With current data nothing renders differently: every chapter has a valid point, and the new moderation message appears only for a pending node at a bad point.
- **`bun run ui:verify`: not run.** It cannot render inside the dev machine (no Chrome there). The rendered proof is the Brave check below.
- **Brave QA** (Afo's Brave profile through Claude in Chrome; build served on `127.0.0.1:3301` because another session held `::1:3301`; local agent with 12 rehearsal members plus two seeded rows at 90 and 0,0, removed afterwards). The first pass ran on the first commit; the footer and picker were checked again on `d0d9676`.
  - `/map/state` from the page: 200, the two seeded rows absent, no node or thread with a region, no ecoregion request, no outline layer in the DOM. (With the narrowed rule, the seeded edge row would now stay visible, as intended.)
  - 1440: `brave-1440-home-map.jpg`, `brave-1440-selected-member.jpg` (inspector shows the member and connections, no region line, no boundary).
  - 1024 and 375: the window would not resize, so both widths ran as same-origin frames of exactly 1024 and 375 px in the same tab (`brave-1024-and-375-home-map.jpg`, `brave-375-selected-member.jpg`). 12 people and 12 chapters render, no horizontal overflow, and the 375 sheet has no region line. The map chrome covering much of the map at 375 is the existing PRD-739 item.
  - Footer on `d0d9676` at 1014 and 375: the bottom row reads "greenpill.network" and "2026 Greenpill Network" only, with no horizontal overflow (`brave-1014-footer-without-credit.jpg`, `brave-375-footer-without-credit.jpg`).
  - Add-node picker on `d0d9676`: dragging the pin past the top edge put 90.000000 in the latitude field and the reverse lookup went to the geocoder. The dev machine cannot reach the geocoder, so the dialog showed "Place search is unavailable. Please try again shortly." with no confirmation and Review disabled (`brave-1014-picker-edge-pin-not-confirmed.jpg`). In production the geocoder finds nothing near such a pin and the agent answers "That pin is too far from a confirmed place."; the stubbed-provider test covers that path.
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

**Status: applied on 2026-11-07 at about 07:01 UTC, run id `0f27b0a7-439b-494b-bbbb-201c5a01f930`.** Afo approved it in the `qa-map-data` session on 2026-11-06 ("Approve all nine"), to run right after #35 deployed `network-agent`.

- #35 merged as `1358466` at 06:54:38 UTC. Release v79 finished at 07:00:31, and `/ready` and the Fly health check passed. Live `/map/state` then left out the two 0,0 nodes and every region label, so the new code was serving.
- The dry run found 9 of 9 rows still at the reviewed place text and coordinates. `--apply` changed 9 of 9 in one transaction and wrote nine audit rows. A second dry run found none left at the old values.
- Live `/map/state` at 07:02:16 UTC: 29 nodes (12 chapters, 17 people), all nine at the proposed points, none at 0,0 or on an edge, no region labels.
- Output: `../artifacts/qa-map-data/prod-repair-2026-11-07.out`. To undo, run the same runner with `--revert 0f27b0a7-439b-494b-bbbb-201c5a01f930`. The revert restores only rows still at the repaired point, but it does not compare place text: before running it, check each row's current place against the place in that output, and leave out any row whose owner has corrected the place since, or the old point returns beside the new place.

Only latitude and longitude changed; place text, names and private fields stayed as they were. Values are rounded to the column's six decimals.

| Node id | Public name | Place (unchanged) | Before repair | After repair (2026-11-07) | Moves | Derived from |
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

1. **Change set (input I5): done.** Applied on 2026-11-07 with run id `0f27b0a7-439b-494b-bbbb-201c5a01f930` and checked on live `/map/state` (see Production change set). One side effect: the repair changed these nine nodes, so a pending owner update request for any of them would now fail as stale when approved. The steward declines it and then tells the owner to send it again: declining does not notify the owner (the agent sends owners no decline notice), so without that message the update stays unapplied. The blocked count in item 5 would show whether any exist.
2. **Duplicates: settled by that approval.** Both Victor Porton rows and the kitblake Rotterdam row move; none are archived. Archiving a duplicate later stays possible in Directus.
3. **Production flag.** Please confirm `MAP_LOCATION_CONFIRMATION_REQUIRED` on `network-agent` is `true` or unset. Its value is a secret (Fly shows only a digest), and a validation-only production probe was blocked by the permission classifier, so I could not check it. After this change the raw path refuses 0,0, out-of-range and edge points either way, but while it is open it still accepts any free-text place with any plausible point, which is how the Eve, Victor Porton and Dida rows happened.
4. **Decision needed: a database guard for approvals made in Directus.** Stewards approve pending submissions and owner update requests in Directus, which writes straight to the database, so none of the agent's checks run. Migration 007's trigger copies an update request's proposed point into the node as it is. Stewards cannot edit coordinates there (they may change `status`, notes and review fields only), so the exposure is approving a row saved with a bad point before this change deploys. Proposed, not in this PR: one trigger on `intake.map_node_submissions` that refuses any write leaving an approved node at a missing, out-of-range or 0,0 point. Approving such a pending node then fails, and so does approving an update request that would move a node there, because the apply function updates the node inside the same statement and the whole approval rolls back. Declining, archiving and the approved repair still work. It replaces the earlier idea of a not-0,0 `NOT VALID` check, which would also have blocked declining a 0,0 row. Limits:
   - Directus shows a trigger's error to non-admin stewards only as "An unexpected error occurred." A Data Studio condition that locks `status` with a short note would explain it; that is a Directus metadata change, also a production write.
   - The database cannot tell a confirmed place on an edge from a clamped pin, so edge points stay allowed there. Any old pending request at an edge is reviewed by hand.
   - It needs its own migration, a local rehearsal, and a production apply with your approval. How much it matters depends on the count in item 5.

   ```sql
   create or replace function intake.refuse_hidden_approved_map_node()
   returns trigger language plpgsql as $$
   begin
     if new.status = 'approved'::intake.map_node_status
        and (new.latitude is null or new.longitude is null
             or abs(new.latitude) > 90 or abs(new.longitude) > 180
             or (new.latitude = 0 and new.longitude = 0)) then
       raise exception 'map_node_invalid_coordinates'
         using errcode = '23514',
               hint = 'Decline the node, or correct its location before approving.';
     end if;
     return new;
   end;
   $$;

   create trigger map_node_submissions_refuse_hidden_approved
     before insert or update of status, latitude, longitude on intake.map_node_submissions
     for each row execute function intake.refuse_hidden_approved_map_node();
   ```
5. **Read-only production count: blocked in this session.** `../artifacts/qa-map-data/prod-coordinate-exposure.cjs` counts pending submissions and pending owner update requests by the point they would leave on the map (missing, out of range, 0,0, edge), approved rows that are hidden or on an edge, and pending update requests for the nine repair rows. Those requests matter for the repair: it changes the node, so such a request goes stale and can no longer be approved, and the owner would need to send it again. Every query runs in a read-only transaction and the output is counts only. The permission classifier blocked running it from here ("Production Reads"), so it needs Afo's OK or Afo's own run; the one-line command is in the file header.
6. **Optional:** clear the ecoregion names stored in `intake.map_node_submissions.bioregion`. They are no longer published, so this is tidiness only.
7. **Requests to other sessions:**
   - `qa-brand-shell`: this PR removes the footer's ecoregion credit line (orchestrator instruction, so the credit leaves with the licensed data). Please leave that line out of your footer changes to avoid a conflict.
   - `qa-map-polish` (owns `HomeMap.astro` next): the selected card, hover card and thread tooltip still read `bioregion`, which is now always empty, so those paths can go. The location picker still clamps a dragged pin to the map edge (`pointFromLocationPointer`); ignoring points dragged off the map, rather than pinning them to the edge, would spare the user a geocoder round trip that cannot confirm anything.
8. **Local environment.** Everything this session started is stopped again: `dm-ports`, the preview on `127.0.0.1:3301`, the local agent on 3303, and the Postgres container (stopped, volume kept). The local database holds no rows from this session. Two traps for the next session: the dev-machine shim drops env vars, so `NETWORK_WEBSITE_PORT=… bun run dev:website` binds 3301, and stopping a background task on the Mac leaves its process running inside the machine.
