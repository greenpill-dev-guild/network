# Website QA Pass, November 2026: Plan

## Final state, 2026-11-07

Every session's pull request is merged into `main`, and each change was checked live on greenpill.network. The last one, `qa-system-pass` (#44), merged on 11-07 at 22:23 UTC, and the orchestrating session checked it live after the deploy (see the `qa-system-pass` checklist). The hub moved to `.plans/archive/` the same day. PRD-739 and PRD-1417 stay open as their own P-PRD-19 issues.

| Session | Pull request | Merged (UTC) | Linear | Left open |
| --- | --- | --- | --- | --- |
| Hub | #33 | 11-07 06:53 | PRD-1408 (parent): Done | |
| `qa-map-data` | #35; repair run `0f27b0a7` applied 11-07 07:01 (record cherry-picked in #44) | 11-07 06:54 | PRD-1409: Done | Directus approvals can still publish nodes at bad points: PRD-1417 |
| `qa-guilds` | #36; change set applied, recorded in #43 | 11-07 06:53; #43 19:54 | PRD-1411: Done | |
| `qa-stories` | #37 | 11-07 06:53 | PRD-1412: Done | |
| `qa-library` | #38 | 11-07 06:53 | PRD-1413: Done | |
| `qa-chapters` | #40; change set applied 11-07 03:24 | 11-07 07:05 | PRD-625: Done | |
| `qa-home-garden` | #34 | 11-07 19:41 | PRD-1410: Done | No real Paragraph signup tested yet; Afo revokes the old Telegram invites |
| `qa-brand-shell` | #39 | 11-07 19:42 | PRD-1415: Done | |
| `qa-map-polish` | #41 | 11-07 19:42 | PRD-739: Backlog (P0 shipped) | P1 and P2 below |
| `qa-assessment` | #42 | 11-07 19:54 | PRD-1414: Done | |
| `qa-system-pass` | #44 | 11-07 22:23 | PRD-1418: Done | The pull-request workflow for the em-dash check waits on Afo's OK |

Open follow-ups:

- **PRD-1417 (Todo):** Directus approvals write straight to the database, so a pending submission or update request saved at 0,0 or an edge point can still reach the map. Run the read-only exposure count, decide on the guard (a not-0,0 check plus a trigger that refuses approvals at bad points; one migration, rehearsed locally, applied with Afo's approval), and confirm `MAP_LOCATION_CONFIRMATION_REQUIRED` on `network-agent`.
- **PRD-739 P1, information layout** (one redesign, best designed together first): hover as a compact tooltip with rich content in a docked side inspector on desktop and a bottom sheet on mobile; themes as a chip strip with Clear and All, the panel only for editing; the list as a non-modal drawer with compact grouped rows, map highlight on hover and search; a single-row compact chrome with the map at 60svh or more, and the 520 versus 720/480 breakpoint reconciled with DESIGN.md; chapter labels at rest, 44px targets, and deduplicated node data.
- **PRD-739 P2, polish and live trust:** theme tags on chapters so theme filters apply to them; a live status line, a fetch error state and polling backoff; thread clipping; the walkthrough title and close button at 375; roles on overlay wrappers; pressed versus focus styling on pills; the two walkthrough buttons that lift 1px on hover (found by `qa-system-pass`).
- **From `qa-system-pass`:** the em-dash pull-request workflow (Afo's OK); the CTA strips on `/chapters`, chapter and guild pages, which keep their own panels (a design call, since `ui/CtaStrip.astro` looks different); `/map/edit` and `/map/moderate`, which sit outside the site shell with their own card styles; the steward booking link kept in four places.
- **Optional tidiness:** clear the ecoregion names stored in `intake.map_node_submissions.bioregion`, which are no longer published.

## Session roster

Each session runs Opus 5.5 at extra-high effort in its own worktree, cut from the branch that carries this hub. "Writes" is the complete list of files a session may change, plus, for every session, its own handoff (`handoffs/<session-name>.md`) and its evidence under `artifacts/<session-name>*` in this hub; anything else goes in its handoff as a request to the owning session.

| Session | Focus | Writes | Port | Wave |
| --- | --- | --- | --- | --- |
| `qa-map-data` | Bad node coordinates; ecoregion layer (D2) | `packages/agent/src/map-nodes.ts` and the intake and edit validation it calls, `packages/shared` map contracts, `packages/website/src/pages/map/edit.astro` (location handling only), `HomeMap.astro` (ecoregion removal only), `packages/shared/src/public-ecoregions.*`, `scripts/map-node-contract.test.ts`, `scripts/agent-contract.test.ts`, `scripts/generate-public-ecoregions.ts`, the `./public-ecoregions` export in `packages/shared/package.json` (security-sensitive; named in PR #35), and the ecoregion credit line in `components/shell/SiteFooter.astro` (that line only, removed in the same PR as the layer) | 3301 (only this session; it is the origin the agent allows) | 1A |
| `qa-home-garden` | Subscribe, Telegram, home tiles, ecosystem, ramp labels | `pages/index.astro`, `content/home-page.json`, `pages/garden/index.astro`, `content/garden.json`, and only the `telegram` value in `content/social-links.json` | 3321 | 1A |
| `qa-guilds` | Dev Guild July feedback, breadcrumb, Writers Guild research and links | `pages/guilds/[slug].astro`, `src/data/operational-content-seed/guilds/*` and `projects/*` (kept in step with approved values), the Data Studio notes for guild fields in `scripts/directus-studio-setup.ts` (they take effect only when `directus:studio:setup` runs against production, which needs Afo's OK with the change set), Directus change set for guilds and projects; with Afo's OK only, the guild parts of `packages/shared/src/public-content.ts` and the agent's guild projection if a new field is unavoidable | 3324 | 1A |
| `qa-stories` | Story accuracy, missing 2026 stories, typo, byline and category | `content/stories/*`, `content/stories-index.json`, `pages/stories/*`, story images under `public/images/` | 3325 | 1A |
| `qa-assessment` | Assessment overflow and multi-select (D1: keep) | `components/page-sections/GardenAssessment.astro` | 3322 | 1B |
| `qa-library` | Book dialog, podcast freshness, Knowledge Garden and protocol removal | `pages/library/index.astro`, `content/library.json`, `content/books/*`, `content/resources/*`, `content/podcast.json`, `src/data/podcast-feed-snapshot.json`, `scripts/podcast-feed-snapshot.ts`, `scripts/public-content-contract.test.ts` (podcast and library tests), `.github/workflows/github-pages.yml` (podcast refresh step only), new `components/page-sections/BookDialog.astro` | 3323 | 1B |
| `qa-brand-shell` | Brand kit and logo, background, external links, footer | `layouts/GpLayout.astro`, `styles/gp-tokens.css` (background and brand tokens only), `components/shell/*` (except the ecoregion credit line), `content/social-links.json` (after `qa-home-garden` merges), `content/site-settings.json`, brand assets under `public/` (logo, favicon, touch icon, share image), `src/middleware.ts` and `src/lib/external-links.ts` (the external-link rule), `scripts/external-links.test.ts`, `scripts/public-content-contract.test.ts` (shell tests) | 3326 | 1B |
| `qa-chapters` | PRD-625: chapter copy accuracy and locations | Directus change set for chapters, initiatives and locations; no code unless a template bug blocks the content | 3327 | 1B |
| `qa-map-polish` | PRD-739 P0: sizing, clustering, reset and empty states, stale state, "Join the map" | `HomeMap.astro`, home hero CTA in `content/home-page.json` and `pages/index.astro` | 3301 | 2, after `qa-map-data` and `qa-home-garden` merge |
| `qa-system-pass` | One card treatment, em-dash check and sweep, fallback snapshot refresh, full-site QA | card CSS, card markup and the imports it needs on every page, `components/ui/Card.astro`, a copy check in `scripts/` with its `package.json` script, a new pull-request workflow under `.github/workflows/` that runs it (both security-sensitive: Afo's OK first, named in the PR), `src/data/operational-content-snapshot.json`, and, for the em-dash sweep only, any website file that still has one (for example `pages/chapters/index.astro`, `components/ui/Text.astro`, `content/resources/*`) | 3321 | 2, last: after wave 1 and `qa-map-polish` merge, so no other session holds those files |

Ports are for each session's Mac-side preview server (spec rule 7); nothing runs a dev server inside the dev machine except on 3301, which only `qa-map-data` and later `qa-map-polish` use.

Batch A starts first because it covers the broken interactions and the accuracy risks Afo named. Batch B starts as batch A sessions open their pull requests.

## Merge order

1. This hub (plans only).
2. Website-only pull requests in any order: `qa-stories`, `qa-guilds`, `qa-home-garden`, `qa-library`, `qa-assessment`, `qa-brand-shell`. Two pairs have an order: `qa-home-garden` before `qa-brand-shell` (both touch `social-links.json`), and the ecoregion credit leaves the footer only in the `qa-map-data` PR, together with the licensed layer, so the site never shows the layer without its CC BY 4.0 attribution. A merge check on 2026-11-07 (rerun after the latest pushes) finds one conflict among the open PRs, none with `main`: #35 and #39 both edit the footer's bottom row in `SiteFooter.astro`. Either may merge first, because #39 leaves the credit line alone: whichever merges second rebases on `main`, and the credit line still leaves only with #35's layer removal. (#36 and #40 briefly conflicted on one import line in the contract test; #36 moved its import in f8a5a31.)

Readiness on 2026-11-07: all PRs pass their checks and are mergeable. Ready now: #33, #35 (its four Codex findings fixed at a5fdc36, head 8f3be55: stored-precision rounding, agent approvals refused at bad points, chapter pins guarded), #36, #37, #38 (its three Codex findings fixed at 1ec2b47: only `https:` feed URLs, refreshes under 8 playable episodes refused, Library SEO copy), #40. Every review thread on these is answered; open threads stay open only because sessions cannot resolve them. Held: #34 only until Afo's approval-gated Telegram invite is in `social-links.json` (the missing or empty `steps` fix landed at 88afb94); #39 until #34 merges, because its footer reads Telegram from `social-links.json`, which still holds the plain-join invite, and after #34 it rebases and moves its footer links into that file without breaking the Regen Hub link.

Open with Afo for the map: confirm `MAP_LOCATION_CONFIRMATION_REQUIRED` is `true` or unset on `network-agent`; run, or approve in `qa-map-data`, the read-only production exposure count (`artifacts/qa-map-data/prod-coordinate-exposure.cjs`), which the session's permission check blocked, before the repair runs; and decide on the database trigger that would refuse Directus approvals at bad points (written up in the `qa-map-data` handoff, open item 4; it needs its own migration and production apply).
3. `qa-map-data`: it changes `network-agent`, so merging it deploys the agent. Watch the deploy, then apply the approved data repair.
4. Directus change sets from `qa-guilds` and `qa-chapters`, applied after Afo approves them. They reach the site on the next hourly build.
5. Wave 2: `qa-map-polish`, then `qa-system-pass` last.

## Checklists

### `qa-map-data` (findings 1, 2)

- [x] Pull live `/map/state` and list every node whose coordinates are suspect (exactly 0,0, latitude ±90 or longitude ±180) or fall outside the country its `place` names.
- [x] Find how each got there: intake submission, edit link (`/map/edit`), click-to-place, geocoder fallback or seed. Reproduce on the local stack.
- [x] At the agent boundary and in the shared contract, reject out-of-range and non-finite coordinates, and stop 0,0 or a clamped edge value from being stored in place of a real location. Rejection is explicit, never a silent clamp. A real location on the 180th meridian (Fiji) must still save, so longitude ±180 on its own is not an error. Tests in `scripts/map-node-contract.test.ts`.
- [x] Write a repair change set for the affected rows (node id, place, current and proposed coordinates, how the new value was derived) and stop for approval.
- [x] D2 (decided: remove): drop the ecoregion layer and dataset from the map and the shared package, and remove the footer's ecoregion credit line in the same PR, so the attribution never leaves before the licensed data does.

### `qa-home-garden` (findings 2, 3, 5, 6, 20)

- [ ] Subscribe follows D3 (decided 2026-11-06: Paragraph). Step 1 on home and `/garden` links to `https://paragraph.com/@greenpill` and says what subscribers get; the Resend route stays in the agent, unused. Describe the Paragraph flow accurately (email, wallet or both) after opening it without submitting; a real signup is tested by Afo or with an address he names. (Done in #34 except the real signup, which has not been tested.)
- [x] Read the Telegram link from `content/social-links.json` everywhere you own; remove hard-coded copies.
- [x] Remove the "Knowledge map · In design" and "Open the toolkit" tiles from the home commons bento.
- [x] Ecosystem: verify each listed organization is a current, real relationship with a public source; find missing ones; group into partners and tools rows as decided in July. Move the list into `home-page.json` so it is editable.
- [x] Replace the "Lowest friction" to "Highest friction" ramp labels.
- [x] D1 (decided: keep): keep the assessment card and its `/garden` step; reword card 03 only. `qa-assessment` owns the component.

### `qa-guilds` (findings 13, 14, 15, 16)

- [x] Dev Guild template changes from the July call: key links in the hero, active projects only, a media and appearances section in place of "Public proof", Hats as a structured list, contributor credits, 17 to 18px body text.
- [x] Breadcrumb parent becomes Library, linking to `/library#guilds`.
- [x] Writers Guild: research what the guild has published (books, translations, newsletters, the Carbon Copy Web3 tooling series and other writing) with sources; remove the podcast attribution; add a section for its written work with contributor credits.
- [x] Replace the unmaintained website link with LinkedIn once Afo names it (I2). (The unmaintained link was `hub.greenpill.network`, a footer link rather than a guild one; the Dev Guild's Connect links gained LinkedIn, and the footer's Hub link moved in #44.)
- [x] Directus change set for guild and project rows; stop for approval. Keep the seed files in step with the approved values.

### `qa-stories` (finding 4)

- [x] Review all 18 stories section by section against their sources. Remove or correct anything unsupported; list what needs a steward.
- [x] Find stories from roughly the last 12 months (Greenpill Paragraph, chapter posts, Regen Coordination Hub, Luma, X) and draft new story files only from verifiable sources. Give exact dates.
- [x] Fix the "storyies" caption, the "Source-backed seed copy" byline and raw category slugs in breadcrumbs and meta.

### `qa-assessment` (finding 19; D1 decided: keep and fix)

- [x] Fix the legend overflow with the standard fieldset reset.
- [x] Decide with Afo which questions take several answers; convert those to checkbox groups and adjust scoring and the result copy.
- [x] Keep answers on the device as today; keyboard and screen reader behavior verified. (Keyboard checked with real key presses; screen-reader names checked with axe's accessible-name code, not with a running screen reader.)
- [x] Carried from `qa-home-garden`: the option label "Understanding the ideas … regen, public goods, coordination" uses an em dash.

### `qa-library` (findings 10, 11, 12)

- [x] Book detail dialog on native `<dialog>`: larger cover, description, read or download the English PDF, every translation, and every store or edition link from `formats`. The cover stays a working link without JavaScript.
- [x] Podcast: run the feed snapshot in the scheduled build so episodes stay current; check that players work; take the episode count from the feed.
- [x] Remove the Knowledge Garden block and guides for protocols that are not active; ask Afo about GreenSci (I4). Keep the guild cards with `id="guilds"`.
- [x] Carried from `qa-home-garden`: `podcast.json` `title` reads "Learn > Podcast" on the home tile (July copy: "The Greenpill Podcast"), and `secondaryDescription` has an em dash. Expose the feed's episode count (300 items on 2026-11-06). Done without sequencing: PR #34 (commit c69c8c3) switched the home tile to `podcastFeed.episodeCount` from `src/data/podcast-feed-snapshot.json`, which already holds that field on `main`, and PR #38 refreshes the snapshot in every Pages build.

### `qa-brand-shell` (findings 6, 7, 8, 16, 17, 20)

- [x] Background (D4, changed on 2026-11-07): Afo kept the illustrated background, so remove what causes the seams (glows painted in boxes narrower than the screen, and the tiled texture) instead of going plain. The seam showed at wide widths, so check 1920 as well as 375, 1024 and 1440 (Brave's window is about 1460 wide, so load 1920 in a same-origin iframe of that width scaled down to fit).
- [x] One rule for external links: new tab, `rel="noopener"`, and an accessible "opens in a new tab" hint. Prefer a build-time step over client script.
- [x] Footer: Farcaster instead of Warpcast, LinkedIn, YouTube, Luma, Code of Conduct; Telegram from `social-links.json`; friendlier bottom row. Leave the ecoregion credit line to `qa-map-data` (it goes with the layer); rebase on `main` before editing the bottom row if that PR has merged. Edit `social-links.json` only after the `qa-home-garden` PR has merged, rebased on `main`.
- [x] Brand kit (I3): current logo in the header, favicon, touch icon and default share image; book art only where a book is the subject.
- [ ] Carried from `qa-home-garden`: `SiteFooter.astro:34` still hard-codes `t.me/+e-aa2Ed3LWVlYjNh`, which now opens a generic page (likely revoked); read `social-links.json` `telegram`. The ecosystem tiles (`index.astro`) and Garden step buttons (`garden/index.astro`) keep hand-set `target` and `rel` that the site-wide rule should replace. (Telegram done in #39; the ecosystem tiles' own `target` and `rel` went in #44. The Garden step buttons and the home book links still set `target` themselves, which the site-wide rule keeps.)

### `qa-chapters` (PRD-625)

- [x] For each of the 18 chapters, check the public copy, links and location against public sources. Remove internal-note copy (the September audit lists 10 affected rows).
- [x] Decide with Afo how dormant and forming chapters should read.
- [x] Directus change set; stop for approval.
- [x] Carried from `qa-home-garden`: `checker.gitcoin.co` no longer resolves (DNS failure on 2026-11-06); the Kenya and Brasil chapter rows link it.
- [x] Carried from `qa-stories`: the Uncommons chapter row (`featuredStorySlugs`) and the `uncommons-publications-learning-series` initiative (`relatedStorySlugs`) point at `greenpill-2025-year-in-review`, which PR #37 makes a draft. Neither field renders today; drop the reference in your change set.

### `qa-map-polish` (PRD-739)

- [x] P0 items from `docs/design/map-polish-audit.md`: container sizing, clustering across node types, filter reset and empty state, stale hover and selection state, "Join the map" trigger with "Find your people" browsing instead.
- [x] Carried from `qa-home-garden`: at 375 the legend items are wider than the viewport, and the "Map list" heading is an h3 directly under the page h1.
- [x] Carried from `qa-map-data`: the selected card, hover card and thread tooltip still read `bioregion`, which is always empty after D2, so those paths can go. The location picker still clamps a dragged pin to the map edge (`pointFromLocationPointer`); ignore points dragged off the map instead of pinning them to the edge.

## Follow-ups outside the sessions

- After the approved coordinate repair: a migration that adds a not-0,0 check on map nodes as `NOT VALID`, then `VALIDATE`, together with the trigger that refuses Directus approvals of submissions or owner update requests at bad points (both cover paths that skip the agent; one migration, a local rehearsal and a production apply with Afo's approval). Proposed by `qa-map-data`; tracked as PRD-1417.
- Optional tidiness: clear the ecoregion names stored in `intake.map_node_submissions.bioregion`, which are no longer published.

### `qa-system-pass`

- [x] Move page cards onto `Card` with the home treatment, markup and imports included; remove page-local card classes. (#44; also fixes the `/chapters` region filter, which is broken live.)
- [x] Carried from `qa-chapters`: two "source-backed" captions remain in `pages/chapters/[slug].astro`. After the fallback snapshot refresh, Denver and the Dominican Republic (inactive in production) stop building pages too. (Both captions removed; the fallback build makes 12 chapter pages.)
- [x] Add a check that fails on em dashes in website copy (as PRD-1303 does for Green Goods) and sweep what is left, including a Directus change set for content rows. (`bun run check:em-dashes`, also inside `agentic:check`; four em dashes left in copy, fixed; production Directus holds none, so no change set.)
- [ ] Wire it into CI: no workflow runs on ordinary website pull requests today (`github-pages.yml` builds only on `main` pushes and its schedule; `supply-chain-guardrails.yml` triggers only on package, lockfile and workflow paths). With Afo's OK, add a pull-request workflow for website paths that runs the check with read-only permissions. Do not fail the hourly publish on steward-edited Directus copy; clean that through the change set. (Proposed in the `qa-system-pass` handoff; waits on Afo's OK.)
- [x] Refresh the fallback snapshot with `bun run content:snapshot:from-agent` after the Directus change sets are applied. (From the live snapshot of 2026-11-07 20:51 UTC, through the same script.)
- [x] Full-site QA in Brave at 375, 1024 and 1440, plus 1920 for the background; `bun run ui:verify` counts as not run in the dev machine. Update this hub and Linear.
- [x] After deploy: repeat the background check at 1920 and the card checks on greenpill.network (orchestrating session). (11-07 22:26 UTC, after Pages run 42420430610 deployed merge `8075333`: every card on home, `/chapters`, a chapter, both guilds, `/stories`, a story, `/library` and `/garden` is a `.gp-card`; the `/chapters` region filter hides the right cards (Africa shows 4 of 12, Americas 5, Asia 2, Europe 1); no em dash left in page copy apart from one podcast episode title from the RSS feed on `/library`; no "source-backed" caption; the 18 footer links match `social-links.json`; no page overflows at 375, where the Library book rail scrolls inside itself; the background at 1920 shows no seams; `network-agent` `/ready` is ok after its redeploy.)

## Linear mirror

One parent issue in P-PRD-19 for this hub, and one child per session, created when that session starts. Sessions are the actionable units inside the hub's `ui`, `content` and `platform` lanes (the plan validator accepts only the five standard lane names), so a child per session follows the mirror policy's "only what is actionable now" rule at the granularity Afo approved on 2026-11-06. PRD-739 and PRD-625 are reused as the children for `qa-map-polish` and `qa-chapters`.

| Linear | Session |
| --- | --- |
| PRD-1408 | Parent: QA session 2026-11-06 |
| PRD-1409 | `qa-map-data` |
| PRD-1410 | `qa-home-garden` |
| PRD-1411 | `qa-guilds` |
| PRD-1412 | `qa-stories` |
| PRD-1413 | `qa-library` |
| PRD-1414 | `qa-assessment` |
| PRD-1415 | `qa-brand-shell` |
| PRD-625 | `qa-chapters` (reused) |
| PRD-739 | `qa-map-polish` (reused) |
| PRD-1417 | Follow-up from `qa-map-data`: Directus approvals at bad coordinates |
| PRD-1418 | `qa-system-pass` |

States on 2026-11-07 are in the Final state table at the top. When the hub closed, PRD-739 and PRD-1417 were moved out from under PRD-1408 and linked to it as related issues, so the parent could close while they stay open.

Pull requests: #33 this hub; #34 `qa-home-garden`; #35 `qa-map-data` (its nine-row coordinate repair ran right after it deployed); #36 `qa-guilds` (its 42-row Directus change set, approved by Afo on 2026-11-06, is applied and recorded in #43); #37 `qa-stories`; #38 `qa-library` (also updates `scripts/public-content-contract.test.ts`, which pinned the old episode count); #39 `qa-brand-shell` (seam-free background, the build-time external-link rule in `src/middleware.ts`, footer links and the brand kit, approved by Afo on screenshots); #40 `qa-chapters` (153 approved fields live in production Directus; no pages for inactive chapters); #41 `qa-map-polish` (PRD-739 P0); #42 `qa-assessment`; #43 the guild change set record; #44 `qa-system-pass` (one card treatment, the em-dash check, the fresh fallback snapshot, and the footer's outside links moved into `social-links.json` with `hub` set to the working `https://hub.regencoordination.xyz`).

## Shared files

Some files hold pieces several sessions own. Edit only your piece, add rather than rewrite, and name the file in your PR description.

| File | Rule |
| --- | --- |
| `scripts/data/ui-source-baseline.tsv` | Rows are keyed by file, code and value. When your change removes a baselined value, prune that row (`bun run ui:check` hard-fails on stale rows). Prune only rows for files you own; never add rows and never run `--write-source-baseline`. |
| `packages/website/keystatic.config.ts` | Split by schema block: homePage and garden to `qa-home-garden`; stories and storiesIndex to `qa-stories`; books, library, podcast and resources to `qa-library`; siteSettings and socialLinks to `qa-brand-shell`. |
| `packages/website/src/content.config.ts` | Astro defines three collections here: stories to `qa-stories`; resources and books to `qa-library`. The JSON singletons such as `home-page.json` are not collections and need no change in this file. |
| `packages/website/src/content/social-links.json` | Its keys sit on adjacent lines, so two open PRs editing it would conflict. `qa-home-garden` changes the `telegram` value first; `qa-brand-shell` edits the file only after that PR merges, rebased on `main`. |
| `packages/website/src/components/shell/SiteFooter.astro` | `qa-brand-shell` owns the footer, except the ecoregion credit line, which `qa-map-data` removes together with the licensed layer. |
| `scripts/public-content-contract.test.ts` | Each session edits only the tests for its own surface: `qa-library` the podcast and library tests (PR #38), `qa-brand-shell` the shell tests (PR #39), `qa-guilds` the guild date tests (PR #36), `qa-chapters` the chapter page tests (PR #40). Keep new imports beside the shared imports rather than after the last one, so parallel PRs do not insert on the same line. |
