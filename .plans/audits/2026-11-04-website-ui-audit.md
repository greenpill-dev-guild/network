# Greenpill Network website UI audit, 4 November 2026

Point-in-time, read-only audit of the public website (`packages/website`) against committed `main` at `5449e66`, with a Linear work outline for project P-PRD-19 (Greenpill Network Website Polish & Steward Onboarding). No product code was changed.

This pass builds on two September audits that never reached `main`: the UI/UX pass 2 (`claude/ui-ux-audit-pass-2`, 2026-09-24) and the website + CMS research pass (PR #20, 2026-09-24). Only six files under `packages/website/src` changed between their baseline (`b1ead9d`) and today, all in layout, image copying and content loading, so their page-level findings were re-checked rather than re-derived. What is new here is rendered proof: a fresh build, the repo harness with axe-core installed for the first time, a DOM audit of all 47 routes at 375 and 1440, keyboard and interaction checks, and page-weight measurements.

## 1. Method and evidence

| Step | What was done | Result |
| --- | --- | --- |
| Install + build | `bun install --frozen-lockfile`, then `bun run build:website` | 47 pages in 14 s. Build used the committed fallback snapshot (`generatedAt` 2026-08-10) and a local agent origin, so the home map ran in its no-agent fallback. |
| Repo harness | `scripts/ui-verify.ts` over 46 routes × 375 / 1024 / 1440, Chromium via a `--no-sandbox` wrapper | **0 HARD, 7 WARN** (6 `NO_NAV_LANDMARK` on the two standalone map pages, 1 `TOUCH_TARGET` on `/design-system`). axe-core ran for the first time: **0 violations** at wcag2a / wcag2aa / best-practice across all routes. |
| axe at every impact | Playwright + axe-core on 12 representative routes × 375 / 1440, including minor and moderate | 0 violations. 20 to 111 `color-contrast` nodes per page are *incomplete*, not failures: text sits over the textured background, which axe cannot evaluate. Token math is in §3.1. |
| DOM audit | Headings, landmarks, images, links, labels, names, touch targets, overflow, colours, requests and bytes on all 47 routes at 375 and 1440 | No horizontal overflow on any route. Every image has `alt`, every input a label, every control a name, no duplicate ids. Findings below are what the harness does not measure. |
| Interaction | Mobile menu, join-the-map dialog, Escape and backdrop behaviour, chapters filters, breadcrumb at 375, keyboard focus on primary and ghost buttons, nav states, a 1366 × 641 laptop viewport | Quoted inline with *(verified)*. |
| Screens | Full-page captures of every route at 375 / 1024 / 1440, read page by page | Quoted inline with *(seen)*. Blank image tiles in full-page captures are lazy-loaded images that never entered the viewport, not broken assets. |
| Source | Shell, layout, primitives, every page template, tokens, baseline file | Cited as `file:line`. |
| Source review (delegated) | A second reader checked every page template, primitive and script against the 18 rules in `packages/website/CLAUDE.md`, HomeMap excluded | 15 HARD, 61 WARN, 61 NOTE; the items that survived verification are in §3.7 |

Not covered: the live site (unreachable from the audit container), the live Directus admin (needs the authenticated Brave path, which this environment does not have), and content stewards may have edited in Directus since 2026-08-10. Production builds pull the live snapshot, so re-check the copy findings in §4 against greenpill.network before rewriting rows.

## 2. Headline

1. **The system is sound and the harness is green.** Tokens, primitives, landmarks, labels, alt text, no overflow at any width, and a clean axe run. The problems are above the harness: wayfinding, copy, hierarchy, decisions made in July that were never built, and page weight.
2. **Two mobile and keyboard defects slipped under the harness.** The primary button's focus ring is invisible on every page (its glow shadow overrides the global ring), and the breadcrumb separator collides with the title on narrow story pages.
3. **Nothing on PRD-739 has landed.** The `128dvh` map sizing rule, the inverted "Find your people" entry, the un-closable join dialog, the clipped legend at 375 and the zero counts in static HTML are all still on `main`. A branch with four P0 commits has sat unmerged since 5 October.
4. **Half the public pages carry internal notes.** 21 of 47 built pages contain phrases like "needs steward backfill before launch" or "research artifact"; "source-backed" appears 188 times. In the fallback snapshot this is the single biggest trust cost; it must be checked against the live snapshot.
5. **Pages are heavy for a static site.** Every page ships about 2 MB of images before content (the background set alone), the Library ships 12 MB, the Stories index 9 MB, and one story ships a 4.9 MB, 4096-pixel hero rendered at 325 px. There is no image pipeline, no `width`/`height`, and fonts come from Google in 15 cuts.

## 3. Findings

Severity: **HARD** breaks the house standard or accessibility on a primary path; **P1** costs comprehension or trust and compounds; **P2** polish. "Linear" names the proposed home in §6.

### 3.1 Verified defects (new or newly proven)

| # | Sev | Finding | Evidence | Linear |
| --- | --- | --- | --- | --- |
| D1 | HARD | **Primary button focus ring is invisible.** On `:focus-visible` the primary button's computed `box-shadow` is the lime glow, not the 3 px ring; the ghost button gets the ring. The global ring lives in `@layer gp-base` as a `box-shadow`; `Button.astro:54` sets an unlayered `box-shadow: var(--gp-shadow-pill)` that wins. Keyboard users cannot see focus on the most important control on every page (WCAG 2.4.7). | *(verified)* Tab to "Go home" on `/404`: `fv:true`, shadow `rgba(184,232,53,.35) 0 0 32px…`; ghost: `0 0 0 3px rgba(184,232,53,.4)`. | L1 |
| D2 | HARD | **Breadcrumb separator collides with the title at narrow widths.** On story pages at 375 the category crumb and the title render as "chapter ⁄Greenpill Cote d'Ivoire — La …" with the slash drawn over the first letter. `Breadcrumb.astro:112-121` hides middle crumbs for three or more, but with two crumbs the first `li` (`min-width: 0`) shrinks below its content and its separator overflows into the last crumb. | *(seen)* `story-breadcrumb@375`. | L2 |
| D3 | HARD | **Map legend clips at 375.** The hero legend's third chip ("Members") has its right edge at 447 px in a 375 px viewport; only its dot is visible. | *(verified)* legend chip rects at 375. | PRD-739 |
| D4 | HARD | **Join dialog cannot be dismissed the usual ways.** Escape and backdrop click are swallowed (`HomeMap.astro:3701`); the × is the only exit, and at 375 the × overlaps the dialog title. The step progress indicator has styles and script but no markup, so it never renders. | *(verified)* dialog still open after Escape and after backdrop click; *(seen)* `join-dialog@375`. | PRD-739 |
| D5 | HARD | **Story "related" chips are 30 px tall on touch devices** and print slugs: "Chapter · c te d ivoire", "Chapter · koh pha ngan", "Guild · dev guild". No `pointer: coarse` bump exists for `.gp-story-related-chip` (`stories/[slug].astro:178-185, 400`). | *(verified)* 30 px in a touch context on 14 story pages. | L4 |
| D6 | P1 | **Laptop viewport letterboxes the map.** At 1366 × 641 the map is 820 × 361 px, centred with empty margins, and the hero CTAs fall below the fold. Cause is `width: min(100%, 128dvh)` (`index.astro:386`). | *(verified, seen)* `home@1366x641`. | PRD-739 |
| D7 | P1 | **Static zero counts.** The hero legend renders "CHAPTERS 12 · STEWARDS 0 · MEMBERS 0" in HTML; counts only update if `/map/state` answers. | *(seen)* 375 and 1440 captures. | PRD-739 |
| D8 | P1 | **Dead anchors.** The footer's "Add yourself to the map" is `/#join-map` on every page (`SiteFooter.astro:17`); no element has that id, it works only through a hash listener (`HomeMap.astro:3651`). Home's ramp "Subscribe" is `#step-1` (`content/garden.json:18,119,131`), which exists only on `/garden`. One proof card on `/chapters/dominican-republic` is `href="#"`. | *(verified)* cross-page link check. | L4 |
| D9 | P1 | **Hero entry is a JS-only button.** The primary CTA "Find your people" is a `<button>` with no `href` that opens the add-yourself walkthrough (`index.astro:68, 94`); the content record's `href: /garden` is ignored. The July decision renamed the trigger "Join the map". | *(verified)* `tag: BUTTON href=`. | PRD-739 |
| D10 | P1 | **Region filter is not exposed to assistive tech.** `role="radiogroup"` wraps plain buttons with no `role`, `aria-checked` or `aria-pressed`; the selection is a class toggle (`chapters/index.astro:120-125`). | *(verified)* all five buttons `null/null/null`. | L8 |
| D11 | P1 | **Mobile menu panel is translucent**, so the gold hero headline shows through the menu labels; Escape does not close it. Tap targets are fine (64 px rows, PRD-1115 is fixed). | *(seen)* `home-menu-open@375`. | L4 |
| D12 | P1 | **Contrast on elevated cards.** By token math `--gp-fg-dim` on `--gp-card` is 4.50:1 and on `--gp-card-elev` 3.63:1; `--gp-error` text on `--gp-card` is 3.23:1; `--gp-info` on card 3.42:1. axe could not confirm because of the textured background; the dim-on-elevated case is the one `packages/website/CLAUDE.md` rule 6 warns about. | computed from `gp-tokens.css`. | L7 |
| D13 | P2 | **Standalone map pages have no site chrome.** `/map/edit` renders in Georgia and Helvetica (`map/edit.astro:400`), references `--gp-fg-muted`, `--gp-card`, `--gp-error` without defining them (`:462, :537, :568, :572`), and has no header, nav landmark, skip link or way home; `/map/moderate` draws the global focus ring around its `<h1 tabindex="-1">`. `robots.txt` disallows `/map/edit/` but not `/map/moderate/`. | *(seen)* both at 375; harness `NO_NAV_LANDMARK` ×6. | L6 |
| D14 | P2 | **Hover motion the standard forbids.** Cards translate or scale on hover at `library/index.astro:483, 568, 851`, `chapters/index.astro:446`, `index.astro:708`. | source. | L7 |
| D15 | P2 | **Section headings are not headings.** Chapter, guild and chapters-index pages have an h1 and then a single h2 in the closing CTA; every section label is an `Overline` div. Screen-reader and agent outlines read "Greenpill Nigeria → Bring this work into your city." | DOM outline, 1440. | L8 |

### 3.2 July decisions still not built

From `docs/design/claude-design-wireframe-prompts.md` (16 July call) and PRD-739. All re-verified on `main` today.

| Decision | Status | Evidence |
| --- | --- | --- |
| Map fills its container; height is a cap | Open | D6 |
| "Join the map" replaces "Find your people" | Open | D9 |
| Filter reset chip + empty state; cross-type clustering; clear stale hover | Open on `main`; partly on `fix/home-map-sizing-clustering-filters` (4 commits, no PR, paused 5 Oct) | branch diff |
| Hide "Knowledge map · In design" and "Regen toolkit" tiles | Open; "Open the toolkit" is still plain text styled as a link | *(seen)* home 1440 |
| Guilds in primary nav, `/guilds` page, one parent | Open; nav has four items, breadcrumb parent is Garden, footer says Network, nothing lights up on guild pages | *(verified)* nav states |
| Garden: assessment removed, three steps, friction labels reframed | Open; four steps, "Lowest friction … Highest friction" on home, three primaries in one view | *(seen)* garden 375 and 1440 |
| Footer: Farcaster rename, LinkedIn, YouTube, Luma, Code of Conduct, Guilds | Partial; "Warpcast" remains, no CoC / YouTube / Luma | `SiteFooter.astro:2-38` |
| Library: two shelves, podcast by season, guilds tile removed | Open | *(seen)* library |
| Guild template: key links in hero, active projects only, media replaces "Public proof", hats as list | Open | *(seen)* dev-guild |

### 3.3 Copy and content (check against the live snapshot first)

- **Internal notes as public copy.** 21 of 47 built pages contain "needs steward backfill", "before launch", "research artifact", "needs steward review", "Needs source review", "legacy chapter record" or "being backfilled". On the chapters index this is 5 of the 12 cards a visitor scrolls *(seen)*: Cape Town, Kenya, Côte d'Ivoire, Germany, Ottawa. The Water Cup story body says "This story should render as a proof-backed field note, not as a claim…". Fix is structural: a private notes field in Directus plus a `content:snapshot` check that refuses rows with this vocabulary, then rewrite the rows.
- **House jargon.** "source-backed" ×188; "Learn > Podcast" as a tile title; "GREENPILL GARDEN · BRIDGE" and "GARDEN · RAMP" overlines; "Workspace" + "Read" hero buttons that both point at the same URL (`chapters/[slug].astro:127-128`); proof cards led by research ids "S016", "S046", "S013 CRYPTO ALTRUISTS"; a Sources list of raw URLs including a 150-character hypercert URL that wraps seven lines at 375 *(seen)*.
- **Unformatted data.** "17 storyies" (`stories/index.astro:131`); raw dates "2026-03-28" and "2025-08" beside "2025"; category slugs "field-report" in crumbs and kickers; theme chips print slugs ("opensrc", "public") while the status chip is uppercase, and both are the same lime pill.
- **Duplicate blocks.** "Public links" and "Connect" on chapter pages list the same links; the dek and summary on guild pages say the same sentence.
- **Imagery.** The Germany chapter card is an illustrated cartoon pickle that reads as generated art; `DESIGN.md` forbids AI-generated imagery. Confirm its provenance with the steward or use the placeholder.
- **Library.** "Latest episode" is a VDAO episode from the shared feed; "Feed updated Apr 27, 2026" is shown as a stale badge; stat row reads "13 BOOKS · 296 episodes PODCAST ARCHIVE · 3 GUILDS · 3 GARDEN GUIDES" with one unit inline and the fourth tile orphaned on its own line at 375 *(seen)*. Books link straight to PDFs of 30 to 60 MB with no size hint.

### 3.4 Performance and delivery

| Measure | Value | Note |
| --- | --- | --- |
| Image bytes on an empty page (`/404`) | 1.8 MB | `greenpill-bg.png` 1.19 MB + `hifi/topo-bg.png` 0.66 MB load on every page |
| `/library` | 12.2 MB images, 25 requests | 13 book covers at source size (`greenpill-cover.png` is 1956 px wide for a 215 px slot) |
| `/stories` | 9.3 MB images | 1800 px story images in 357 px slots |
| `/` | 4.0 MB images | 4 eager images below the fold |
| `/stories/greenpill-garden-season-one` | 6.7 MB | `hifi/garden-overlay.jpg` 4.9 MB, 4096 px, rendered at 325 px |
| Content images with `width`/`height` | 0 on 35 routes | layout reserve missing; harness CLS stays low only because images sit below the fold |
| Oversized images (> 2.2 × rendered) | 31 routes | `astro.config.mjs` uses `passthroughImageService`; no `srcset` |
| Fonts | 1 Google stylesheet, 15 cuts, 2 external hosts | `GpLayout.astro:56-61`; render-blocking and a third-party dependency for the entire type system |
| Podcast art | 4 hot-linked `static.libsyn.com` images on `/library`, no dimensions | the only remote images left on the site |
| `dist` | 945 MB, of which ~900 MB is `/pdf` | 60 MB per translation PDF; PR #32 trimmed the Pages artifact but the PDFs still ship with every deploy |

### 3.5 Mobile (375) notes

- Home: h1, a 250 px map with three visible pins and a clipped legend, an instruction paragraph and two stacked CTAs fill the first two screens before any content *(seen)*. The ecosystem block is eight stacked tiles.
- Chapters: stat row plus six filter pills take a full screen before the first card *(seen)*; the status pill is the only option in its group.
- Story: Sources list with multi-line raw URLs; byline "GN · Greenpill Network research · Source-backed seed copy · 3 MIN READ".
- Garden: assessment legends straddle the card's top edge (`GardenAssessment.astro:167, 487`) at both widths *(seen)*; 35 radio inputs are 16 px (labels are the targets, so acceptable).
- Everything reflows; no route overflows horizontally at 375, 1024 or 1440.

### 3.6 What is healthy (do not re-fix)

Landmarks, skip link, one `<main>`, named navs and `aria-current` on 44 of 47 routes; every image has `alt`; every input a visible label; every button and link a name; no `target="_blank"` without `rel`; no duplicate ids; no horizontal overflow at any width; the 404 page; the Garden subscribe form (label, status line, honest states); the mobile menu after PRD-1115; chapter images now served from the site (PRD-1218); axe clean at every impact level. The token system holds: 231 grandfathered exceptions in `scripts/data/ui-source-baseline.tsv`, none new.

### 3.7 Source review

A delegated read-only review of every page template, primitive and script against the 18 rules in `packages/website/CLAUDE.md` (HomeMap excluded) returned 15 HARD, 61 WARN and 61 NOTE items. `bun run ui:check` is 0/0 because none of them fall inside its regex set. The ones verified here and worth their own line:

| # | Sev | Finding |
| --- | --- | --- |
| S1 | HARD, latent | `Text.astro:8, 28` drops every attribute it is not told about, so the chapter impact feed's `data-impact-loading`, `-empty` and `-error` hooks (`chapters/[slug].astro:258-264`) never reach the DOM (0 matches in the built Nigeria page), and `.gp-chapter-impact .is-hidden` is a page-scoped rule that can never match a `Card`. Behind `CHAPTER_IMPACT_UI_ENABLED = false` today; the day the flag flips, four state blocks render at once. Four chapters carry Green Goods bindings. |
| S2 | HARD | Story body links are gold (`stories/[slug].astro:321-325`); rule 4 says gold is never interactive. |
| S3 | P1 | Garden subscribe success keeps the form on screen with a status line (`garden/index.astro:197-198`); the standard replaces the form with a success card and changes the button verb. `EmailInput` has no error, success or disabled state, so no page can meet the input-state table with it. |
| S4 | P1 | Overline slot text such as "Stories · From the field" is one text node in 12 call sites on home and library, so segments can break mid-phrase; `Meta` already splits correctly. `Overline` and `.gp-overline` are set in the body font while DESIGN.md says overlines are mono. |
| S5 | P1 | Seven `href="#"` fallbacks with an unconditional `rel="noopener"`: chapter proof, library books and guilds, story proof, guild outputs, projects and proof. |
| S6 | P1 | Avatar initials are live text read aloud before the person's name; `AvatarStack` ships four fictional default names. |
| S7 | P2 | Five legacy scripts (`parallax`, `image-sequence`, `dropdown`, `modal`, `mobile-menu`) are imported by nothing; `gsap` in `packages/website/package.json` exists only for the dead parallax script; two image-sequence asset folders still ship. |
| S8 | P2 | DESIGN.md's per-page reflow matrix describes surfaces that do not exist (chapters hero map and sister grid, stories filters and select pills, story share rail, guild events and diagram, garden calendar tiles). `GpLayout.astro:84` enables cross-document view transitions although the Motion section says none by default, and `GardenAssessment.astro:661` sets a focus outline the digest says never to override (a deliberate fix in `a95395e`). Reconcile the document with the pages before using it as an acceptance contract. |

Cross-cutting: hover transforms at six sites; primitives that do not spread props (`Text`, `Card`, `Overline`, `Avatar`) force `:global()` workarounds in some pages and leave dead rules in others; detail-page outlines are an h1 plus one h2; off-token spacing and 8 px radii recur one step away from the tokens.

## 4. Since the September audits

Fixed and verified: mobile menu taps (PRD-1115), chapter image alt and credit (PRD-1202, PRD-1220), chapter images from the admin VM (PRD-1218, now copied at build), admin cold boots (PRD-1219), deploy alerting (PRD-1118), the CMS plan (PRD-807 with 808, 809, 810).

Not fixed: every page-level item in pass 2 §1 (F1 to F15, F20, F21) and every PRD-739 P0 item. Two of pass 2's "verify in a browser" items are now confirmed (D1 focus ring, D4 dialog dismissal).

## 5. Linear today

Project **P-PRD-19 Greenpill Network Website Polish & Steward Onboarding**: In Progress, target date 2026-10-31 (passed), summary still says "Map redesign and broader content work remain deferred".

| Issue | State | Note |
| --- | --- | --- |
| PRD-739 HomeMap polish | Backlog, High, assigned | P0 list untouched on `main`; branch `fix/home-map-sizing-clustering-filters` holds sizing, filter reset, join entry and pin-stacking commits, paused 5 Oct, no PR |
| PRD-625 Populate chapter pages with steward content | Backlog, Medium, no labels | Content half of chapter depth; needs `network` + `editorial` labels |
| PRD-621 Manual person-to-person connections | Backlog, Medium | Product and privacy call before scoping |
| PRD-1119 Operator dashboard, PRD-1120 pt-BR/es labels | Backlog, Low | CMS, not website UI |
| PRD-619, PRD-620 | Canceled, Duplicate | Folded into 739, done |
| PR #20 audit research pass; branch `claude/ui-ux-audit-pass-2` | Open draft since 24 Sep; no PR | The two September audits live only on branches |

There is no Linear issue for the focus ring, the breadcrumb, the public-copy problem, the standalone map pages, image or font weight, or any of the July page decisions.

## 6. Proposed work outline

One parent issue per lane under P-PRD-19, label `network` plus the activity label shown; create children only when a lane starts, per the plan-hub mirror policy. Sizes: S ≤ 1 day, M 2 to 4 days, L a week or more.

| ID | Issue to create or update | Labels | Size | Contains |
| --- | --- | --- | --- | --- |
| L1 | **Make the primary button's keyboard focus visible** | bug, build | S | D1. Combine the ring with the glow on `:focus-visible` in `Button.astro`, or move the ring to `outline`. Verify on every page with a primary and on the map pills. |
| L2 | **Stop the breadcrumb separator colliding with the title on narrow pages** | bug, build | S | D2. `flex: none` on non-last crumbs, ellipsis on the last; cover story and chapter titles at 375. |
| PRD-739 | **Move to Todo and land the P0 list** | build | M | D3, D4, D6, D7, D9 plus the existing P0 checklist. Rebase and finish `fix/home-map-sizing-clustering-filters`; add Escape and backdrop close, render the progress indicator, fix the × overlap, hide zero counts until `/map/state` resolves, pass chapter themes to the map. Prove at 375 / 1024 / 1440 and 1366 × 641. |
| L4 | **Fix the visible dead ends and copy bugs** | editorial, build | S to M | D5 label and height, D8 anchors, D11 menu panel, "storyies", "Learn > Podcast", "bridge" and "ramp" overlines, "Workspace"/"Read" labels, proof-card ids, raw dates and slugs through one label map, remove the Knowledge-map and toolkit tiles, merge "Public links" and "Connect", recolour story body links from gold to lime (S2), remove the seven `href="#"` fallbacks (S5), hide avatar initials from assistive tech (S6). The "editorial updates, little stuff" the Build Sync queued. |
| L5 | **Keep internal notes out of public copy** | editorial, build | M | §3.3 first bullet. Private notes field in Directus, a `content:snapshot` vocabulary gate, then the steward rewrite of the flagged chapter rows and story bylines. Check live first. |
| L6 | **Give the standalone map pages the site chrome** | build | S | D13. A minimal-chrome `GpLayout` variant for `/map/edit` and `/map/moderate`; delete the forked token block; add `/map/moderate/` to `robots.txt`; no ring on programmatic heading focus. |
| L7 | **Cut page weight and finish the standard** | build, maintenance | M | §3.4 and D12, D14. `width`/`height` everywhere, responsive images (enable `astro:assets` or pre-generate sizes), lazy policy, resize `hifi/garden-overlay.jpg` and the book covers, self-host the three families with subsets, PDF size hints and a decision on serving PDFs outside the Pages artifact, `--gp-fg-muted` for small text on elevated cards, remove hover translate and scale, delete the five dead scripts and the `gsap` dependency (S7). Touches `package.json` and the lockfile; call that out in the PR. |
| L8 | **Chapter pages as the landing surface** | build | M | D10, D15 and the code half of PRD-625: stories with `relatedChapter` on chapter pages, steward bios from `people`, a "Join this chapter" block, real headings for sections, `aria-pressed` region filter, search on the index, a dormant or forming template instead of building noindex pages with internal copy. Fix `Text` and `Card` prop spreading (S1) before the impact-feed flag flips. PRD-625 stays the content half. |
| L9 | **Guilds get one parent** | design, build | S to M | §3.2 rows 5 and 7. Nav item, breadcrumb back, `activeNav`, footer columns read from `content/social-links.json`, stronger active-nav state. Blocked on the hub amendment in L11 if the `/guilds` index page is included. |
| L10 | **Garden: apply the July decisions** | design, build | M | §3.2 row 6 and the legend straddle. Three steps, one primary per view, labels reframed; keep `GardenAssessment` as a component; replace the subscribe form with the success card and give `EmailInput` an error state (S3). |
| L11 | **Reconcile the plan hub, audit records and project dates** | ops | S | Merge PR #20 and the pass-2 document into `.plans/audits` on `main`; amend `public-website-design-implementation` guardrails ("no root guild directory route", "Garden is the onboarding surface") to match the July decisions; give P-PRD-19 a new target date and summary; label PRD-625; reconcile the DESIGN.md reflow matrix and the documented motion and focus exceptions with the pages (S8). |
| Later | **HomeMap P1 information layout** (PRD-739 P1 block) and the **Home / Library / Guild template restructures** from the wireframe prompts | design | L each | Design-first, one Linear child per page when started. |

Sequence that keeps every PR small and proves itself:

1. **This cycle:** L1, L2, L6, L4, L11, and PRD-739 P0. Four of these are a day each and all are verifiable with `bun run ui:verify` plus a keyboard pass.
2. **Next cycle:** L5 (with stewards), L8, L7.
3. **After the hub amendment:** L9, L10, then the design-first restructures.

## 7. Evidence paths

Local to the audit container; regenerate with the commands shown.

- `packages/website/.ui-verify/report.json` and `<route>@<width>.png` from `CHROME_BIN=<chromium wrapper> UI_VERIFY_REQUIRED=1 bun --no-env-file scripts/ui-verify.ts`. Chromium needs `--no-sandbox` when run as root; the harness does not pass it, so a two-line wrapper was used.
- DOM audit, interaction checks and axe run: throwaway Playwright scripts over a static server on `packages/website/dist`; outputs were `dom-report.json`, full-page captures at three widths, and the interaction captures named in §3.
- Contrast ratios computed from the hex values in `src/styles/gp-tokens.css` with the WCAG 2 formula.
