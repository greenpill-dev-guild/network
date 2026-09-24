# Network website + Directus CMS research pass

**Date:** 2026-09-24 · **Kind:** read-only research and implementation outline · **Scope:** the Linear "Greenpill Network Website Polish & Steward Onboarding" project, the public website core pages, and the Directus admin used by chapter/guild stewards.

No product code was changed. Evidence is `file:line` against `main` at `b1ead9d`, the Linear workspace, the two open PRs, and the Aug–Sep Build Sync / Stewards Sync notes in Drive. Nothing in this document creates Linear issues; per the plan-hub mirror policy, child issues are created only when a lane starts.

---

## 0. Headline

1. **The Linear backlog for the site is one page-level issue plus one CMS plan.** PRD-739 (HomeMap polish, High) carries a verified P0/P1/P2 checklist from the Jul 16 audit call; nothing on it has landed (the `128dvh` sizing rule, the inverted "Find your people" CTA, the chapter theme exemption and the missing filter reset are all still in `main`). PRD-807 (Directus CMS advancement) is ~85% shipped; its two open lanes are the publish-health watchdog (PRD-808, draft PR #19) and the studio follow-ups (PRD-809). Four map follow-ups from the Jun 17 live session (PRD-619/620/621/625) sit unlabelled in Backlog and are all subsumed by PRD-739 or by content work.
2. **The Jul 16 page decisions are documented but not in Linear.** `docs/design/claude-design-wireframe-prompts.md` locks a restructure of Home, Library, Guild pages and Garden, plus a new Guilds & Working Groups page and a new footer. Two of those decisions contradict the still-active `.plans/active/public-website-design-implementation` guardrails ("no root guild directory route", "Garden is the onboarding surface"). The hub has to be amended before that work is scheduled.
3. **The core pages are structurally complete but content-thin and inconsistent.** Chapter pages do not show the 10 stories that reference them, the Library renders 2 of 20 published resources, the stories index has no filters, guild pages are orphaned from the nav, and there are several visible copy bugs ("Learn > Podcast" on the homepage, "bridge" as a Garden overline, "Workspace" on every chapter's external link, raw theme slugs everywhere). The repo's own `ui:check` passes only because 231 source violations are baselined.
4. **The CMS has one silent data-loss trap and a steward surface that still reads like the pre-August model.** Uploading a chapter image without hand-editing `media.reviewStatus` JSON quarantines the whole chapter from the public snapshot with no steward-facing signal. Stewards can also write network-editorial fields (`seo.noindex`, `featured_weight`, `featured_story`), `region` accepts free text that breaks the directory filter, `pending_review` on a chapter goes nowhere, and the guide, invitation email and in-studio notes still describe "trusted publisher applies your change".
5. **Stewards have not asked for CMS changes.** No Build Sync or Stewards Sync note since Aug 10 mentions Directus. What stewards did decide (Aug 17/24/31) is content: an active-chapter list that disagrees with the site (site shows 12 active, stewards confirmed 9, Ukraine is missing), onboarding "front and center" with chapter/steward application paths, and chapter minimum standards (published charter, accounting, impact reporting).

---

## 1. What Linear asks for today

### 1.1 Project P-PRD-19 · Greenpill Network Website Polish & Steward Onboarding (Planned, target 2026-10-31)

| Issue | State | Priority | What it asks | Where it stands in `main` |
| --- | --- | --- | --- | --- |
| [PRD-739](https://linear.app/greenpill-dev-guild/issue/PRD-739) HomeMap polish: sizing, clustering & information layout | Backlog | High | P0: kill `128dvh`, cross-type clustering, "Show all" reset + empty state, clear stale hover/selection, rename entries ("Join the map"). P1: tooltip + docked inspector, chip-strip themes, drawer list, mobile chrome, labels at rest. P2: theme-tag chapters, live status line, a11y roles. | Untouched. `packages/website/src/pages/index.astro:386` still `width: min(100%, 128dvh)`; hero primary still opens the add-node dialog (`index.astro:94`); chapters still ship `themes: []` to the map (`HomeMap.astro:120`) and are exempt from theme filters (`HomeMap.astro:2178`). |
| [PRD-807](https://linear.app/greenpill-dev-guild/issue/PRD-807) plan: Directus CMS advancement | Todo (was In Progress) | High | Parent mirror of `.plans/active/directus-cms-advancement`. Remaining: watchdog (808), dashboard (809), one human magic-link click. | Hub `qa_pass_2` blocked; `ui` and `platform` lanes in progress. |
| [PRD-808](https://linear.app/greenpill-dev-guild/issue/PRD-808) CMS platform lane | Todo | – | Publish-health watchdog: public build-metadata artifact, persisted freshness state, Pages-failure alerts, PAT with Actions:read. | Draft [PR #19](https://github.com/greenpill-dev-guild/network/pull/19) (2026-08-11, 943+/41−, clean) implements it; not merged, not activated. |
| [PRD-809](https://linear.app/greenpill-dev-guild/issue/PRD-809) CMS ui lane | Todo | – | First-class chapter image alt/credit columns, operator Insights dashboard, pt-BR/es labels. Blocked by 808 for the dashboard. | Not started. PR #19 notes four typecheck errors in `scripts/directus-studio-setup.ts` belong to this lane. |
| [PRD-810](https://linear.app/greenpill-dev-guild/issue/PRD-810) CMS content lane | Done | – | Docs truth, runbook row, steward guide refresh. | Done, but the guide has drifted again (see §6.3). |
| [PRD-625](https://linear.app/greenpill-dev-guild/issue/PRD-625) Populate chapter pages/cards with steward content | Backlog | Medium | Content population, not code. | Snapshot: 18 chapters, 0 have a long description, 6 have no image, 14 of 21 people have no bio, 1 has `founded`. |
| [PRD-621](https://linear.app/greenpill-dev-guild/issue/PRD-621) Manual person-to-person connections | Backlog | Medium | Feature request from the live session. | Not in PRD-739; needs a product call (see §8). |
| [PRD-620](https://linear.app/greenpill-dev-guild/issue/PRD-620) Clustered node selection | Backlog | Medium | Duplicate of PRD-739 P0 item 2. | Fold into 739. |
| [PRD-619](https://linear.app/greenpill-dev-guild/issue/PRD-619) Over-connection bug | Backlog | Medium | One node connects to everyone. | Cause is theme-based edges with 1–4 themes each; PRD-739 P1 edge bundling/clipping covers it. Fold into 739. |

Done since the June launch (for context): PRD-616/617/618/622/623/624 (click-to-place, geocoding, steward detection, moderation mode, garden link, contributor posting).

### 1.2 Open PRs on the repo

- [PR #19](https://github.com/greenpill-dev-guild/network/pull/19) `feat(agent): add publish-health watchdog` — draft, clean, closes PRD-808. Blocked on a review and an explicit activation step (migration 028, Fly secret, PAT scope).
- [PR #9](https://github.com/greenpill-dev-guild/network/pull/9) `fix(website): remove global z-index override for header` — external contributor, one-line CSS change in `packages/website/src/layouts/GpLayout.astro:142`, pinged again on Aug 3 with no reply. The override is still present in `main`. Needs a 375px check of the mobile menu, then merge or close with a reason.

### 1.3 Decisions recorded outside Linear

- **Jul 16 audit call → `docs/design/claude-design-wireframe-prompts.md`** (attached to PRD-739): locked page structures for Home, Library, Guild (Dev + Writers), Garden, and a new Guilds & Working Groups page; footer columns (Guilds & Working Groups, Code of Conduct, Events calendar (Luma), Join the map, LinkedIn, YouTube, Farcaster rename); "Join the map" replaces "Submit yourself"; Knowledge Map and Toolkit tiles removed from Home; Regen Assessment removed from Garden (3 steps); "Public Proof" sections replaced by media/appearances; only active projects on guild pages; hats as a list. None of this is mirrored to Linear.
- **Build Sync 2026-09-16 / 09-23:** "editorial updates, the public website … little stuff" queued for the next release; website issues mislabelled `client` should be `editorial`.
- **Stewards Sync 2026-08-17:** onboarding "plain on the website", a steward + chapter intake funnel "front and center", chapter minimum standards (published charter, basic accounting, impact reporting).
- **Stewards Sync 2026-08-24:** active-chapter review. Confirmed active: London Ontario, Nigeria, Cape Town, Toronto, GreenSofa (Taiwan), Brasil, NYC, Côte d'Ivoire, Kenya. Tentative ("just a name" until onboarded): Ukraine, Uganda. Explicitly not chapters: Green Goods, TDF, Sun & Tech, Agroforest, Solidarity, Living Village, Common Grounds, Network Society Lab, Coconut Network, Green Fun, Green Side, Plastic Fish, Cargo Scope, ReFi Colombia, Vida, Koh Phangan trip organiser. Brasil is in a governance transition with shared stewardship.
- **Stewards Sync 2026-09-07:** public role terminology is unresolved ("ambassadors" rejected; "local builders" / "energizers" proposed; "stewards" not to be conflated with partners). Do not rename public labels until this settles.

---

## 2. Current-state verification

| Claim from the Jul 17 audit / plan hubs | Status on `main` |
| --- | --- |
| Hero map width keyed to viewport height | Still true: `index.astro:386`. |
| "Find your people" opens the add-node walkthrough | Still true: `index.astro:94` `data-home-map-open`; `home-page.json.hero.primaryCta.href="/garden"` is ignored. |
| Theme filters exempt chapters because chapters ship no themes | Half true: 17 of 18 chapters *do* have `themeSlugs` in the snapshot, but `HomeMap.astro:120` hard-codes `themes: []` for chapter nodes. This is now a code fix, not the content task PRD-739 P2 assumes. |
| No Guilds nav item / no guilds index | True: `SiteHeader.astro:8-13` has Chapters · Library · Stories · Garden; `guilds/[slug].astro:48` sets `activeNav="Guilds"` which matches nothing; breadcrumb back is "Garden" (`:55`). |
| Chapter impact feed gated off | True: `packages/shared/src/chapter-impact.ts:3` `CHAPTER_IMPACT_UI_ENABLED = false` although 4 chapters carry Green Goods bindings and the agent runs the scheduled sync. |
| `ui:check` green | True, via baseline: `scripts/data/ui-source-baseline.tsv` carries 231 entries (139 raw design values, 77 hard-coded font sizes, 10 physical side properties, 5 `vh`). Top files: HomeMap 55, library 30, map/edit 26, home 13, chapter detail 12. |
| Committed fallback snapshot freshness | `operational-content-snapshot.json.generatedAt = 2026-08-10`. Production builds pull the live agent snapshot, so this only affects local dev and build fallback. |
| Podcast feed snapshot | `lastBuildDate 2026-04-27`; the "Latest episode" the Library shows is a VDAO episode from the shared Libsyn feed, not a Greenpill episode. |

---

## 3. Website: core-page findings

Content reality first, because most page thinness is data, not layout.

| Collection | Count | Sparseness |
| --- | --- | --- |
| Chapters | 18 (12 indexable, 6 `seo.noindex`) | 0/18 long description (summary only); 6/18 no image; 12/18 have steward records (name + role + location only); `introQuote` 0/18; `founded` 1/18; `featuredStorySlugs` 2/18 (never rendered); GreenSofa's image is a Google Drive URL. |
| Chapter initiatives | 16 | Complete text and links; 0/16 images; no `kind` or date model; link out to external URLs even when 9 have `relatedStorySlugs`. |
| Guilds | 3 | Only Dev and Writers have pages; GreenSci has no image, stewards or members; `cadence` is an internal note on all three. |
| Projects | 9 | 0/9 images; 4/9 repo URLs. |
| People | 21 | 13 chapter stewards have empty bios; 0/21 avatars; **never rendered by any page**. |
| Themes | 20 | 0/20 descriptions; two slugs both labelled "Public Goods"; **labels never used** (pages print slugs). |
| Stories (Keystatic) | 18 published | All bylined "Greenpill Network research"; bodies 240–1,832 chars; 0 translations. |
| Resources (Keystatic) | 20 published | **2 rendered.** |
| Books | 13 | `author`/`publishYear` empty on 13/13, so the caption never renders; `formats` never shown. |

### 3.1 Per page

**Home** (`pages/index.astro`, `components/page-sections/HomeMap.astro`)
- Hero primary is a JS-only button; without JS it is dead. Secondary → `/chapters` is fine.
- Podcast tile prints `podcast.title` = "Learn > Podcast" (`index.astro:223` ← `content/podcast.json:2`).
- "Knowledge map · In design" coming-soon tile (`index.astro:273-280`) and a "Regen toolkit" tile promising content the Library does not list (`:266-271`). The Jul 16 decision removes both.
- Ecosystem row is hard-coded in the page (`:51-60`), two entries link to raw Libsyn URLs.
- Garden ramp step 1 CTA is `#step-1`, an anchor that only exists on `/garden` (`:332` ← `garden.json:18`).
- No proof strip (chapter count, stories, books, episodes); `featuredChapterSlugs` and two of three `proofSignals` in `home-page.json` are unused.
- HomeMap: 4,257 build-time land `<circle>`s (~200 KB) duplicated in the add-node mini-map (`:484-486`); polls `/map/state` every 5 s while visible; add-node dialog swallows Escape and backdrop click (`:3701-3709`); hover card is `aria-live` and rewritten on every hover (`:281`, `:1468-1508`); keyboard model is otherwise strong (focus moves into and out of the inspector, satellites are focusable).

**Chapters index** (`pages/chapters/index.astro`)
- DESIGN matrix calls for hero map + stats, featured 3-up, directory, sister chapters; only the directory and a stat strip exist. No search.
- Forming filter never shows anything because both forming chapters are `noindex`; visitors cannot see that Denver and Dominican Republic are forming.
- Region filter is a `role="radiogroup"` of plain buttons with the active state expressed only by class (`:120-125`, `:238`).
- `AvatarStack` puts `aria-label` on a `<div>` and ships sample names as defaults (`components/ui/AvatarStack.astro:13,24`).

**Chapter detail** (`pages/chapters/[slug].astro`)
- Hero ghost button is labelled **"Workspace"** for the chapter's external link (`:127`), which is Luma/X/Hub/Giveth for every chapter; primary is `links[0].action` → "Read" / "Open" / "Follow" with no object (`:128`); for noindex records it reads "Review · Needs steward backfill".
- **Stories never appear**, although 10 stories set `relatedChapter`; initiatives link out to the first external URL instead of on-site stories (`:177`, `:209-217`).
- `links` and `connectLinks` render as two near-duplicate lists.
- Proof cards print research citation IDs on the public page ("S031", "S054 research gap") (`:158`; same on guilds `:181`).
- Steward cards ignore `people` bios/links; no events, no cadence, no "how to join this chapter".
- `StatusChip` has no `inactive` tone, so India/Uganda/Uncommons show a lime "Inactive" (`:117`).
- Headings: h1 → h2 only in the closing CTA; section labels are `Overline` divs (the primitive supports `as="h2"`).
- Noindex chapter pages are still built with internal steward copy ("Held as a steward-review chapter record…", "Dormant public account") reachable by URL.

**Guild detail** (`pages/guilds/[slug].astro`)
- Orphaned: no nav item, breadcrumb back is "Garden", `activeNav="Guilds"` is bogus, no parent in the sitemap. Reached only via footer, Library cards and story chips.
- The approved guild image is never rendered; stewards (`stewardSlugs` → `people`) are never joined; project cards expose `liveUrl || repoUrl`, never both; 6 stories and 12 resources reference guilds and are not listed; `cadence.summary` is an internal note.
- The Jul 16 decision replaces "Public proof" with media/appearances, puts key links in the hero, shows only active projects, and adds hats + contributors.

**Garden** (`pages/garden/index.astro`, `GardenAssessment.astro`)
- Overline renders the enum value "bridge" (`:72` ← `garden.json:4`).
- Four steps including the Regen Assessment; the Jul 16 decision is three steps without it. The assessment component is the best-built a11y surface on the site, so keep the component even if the step goes.
- `afterCards` (chapters / Dev Guild / Library) and `proofSignals` are never rendered, so the page ends after step 4.
- Multiple lime primaries in one view; Subscribe success is a status line rather than the DESIGN replacement card; no privacy note beside the email field.

**Library** (`pages/library/index.astro`)
- 2 of 20 published resources rendered; the Dev Guild Paragraph articles, Green Goods docs, Regen Protocols, Hub threads never appear despite `library.json.featuredResourceSlugs` (10) and the Home "Regen toolkit" promise.
- Book cards link straight to PDFs in a new tab with no type/size hint; author/year caption never renders; translations shown only as a count.
- "Latest episode" is not a Greenpill episode (shared feed); "Feed updated Apr 27, 2026" is shown as stale.
- Forbidden hover translate on three card types; four `<audio>` elements with no accessible name; external Libsyn images without dimensions; no `RailArrows` on the mobile rail.
- The Jul 16 decision restructures this page into two book shelves, podcast by season/series with collaborators, a Garden hand-off band, and a quiet archive strip; the Guilds tile goes.

**Stories index and detail** (`pages/stories/*.astro`)
- No filters, sort, or pagination; `stories-index.json` supplies `topicTags` (13) and `chapterTags` (6) that are unused.
- Meta prints raw `publishDate` strings in three formats and raw category slugs ("FIELD-REPORT"); no `<time>`.
- "Submit a story" scrolls to a card whose CTA is "Open the Hub" while the copy claims "Submission data flows into a private moderation queue" (`stories/index.astro:164-165`). There is no such queue.
- Detail body is a hand-rolled mini-markdown (`[slug].astro:38-64`) that renders `[text](url)` and `**bold**` literally; related chip prints "c te d ivoire" (`:179`); no share rail, no Article JSON-LD, no "more from this chapter".

**Map edit / moderate** (`pages/map/edit.astro`, `moderate.astro`)
- Token handling, neutral responses and CSP (moderate) are correct. `edit.astro` references `--gp-fg-muted`, `--gp-card`, `--gp-error` without defining them in its own `:root` (`:384-402` vs `:462,537,568,572`), so buttons render transparent and the error state is uncoloured. Uses `100vh`, 8px radii and an off-palette `#ffd6ca`. `robots.txt` disallows `/map/edit/` but not `/map/moderate/`.

**Shell, meta, JSON routes**
- Footer link set is hard-coded and diverges from `content/social-links.json` (different Telegram invite and Hub domain); year is hard-coded.
- No `og:site_name`, `twitter:site`, JSON-LD, or RSS; sitemap has no `<lastmod>`; `locations.json` links to the chapter's external link rather than its site page (contract choice in `packages/shared/src/public-content.ts:275`).
- Five browser scripts (`parallax`, `image-sequence`, `dropdown`, `modal`, `mobile-menu`) are imported nowhere; `gsap` in `packages/website/package.json` is only used by the dead parallax script.
- Images: no `astro:assets` (passthrough), no `width`/`height` on chapter/story photos, `public/images/hifi` is 5.4 MB, `greenpill-bg.png` 1.2 MB, one Google Fonts request for 15 cuts.
- Privacy: no private-field leak found in the static output or the JSON routes; the shared assertion and per-record quarantine hold. The only leak is *tone*: internal review language and research IDs on public chapter/guild pages.

---

## 4. Website implementation outline

Sequenced so each workstream ships on its own and the two contested IA changes wait for the hub amendment. Effort is S (≤1 day), M (2–4 days), L (a week+). "Issue" names the Linear issue to attach to or the child to create when the lane starts.

### W0 · Housekeeping (S) — do first, no design decisions

- Merge or close PR #9 after a 375px mobile-menu check (`GpLayout.astro:142`).
- Relabel the website issues from `client` to `editorial` (Build Sync 09-23 action).
- Fold PRD-619 and PRD-620 into PRD-739 as checklist items and cancel them; keep PRD-621 open as a product question.
- Amend `.plans/active/public-website-design-implementation/spec.md` + `plan.todo.md` so the Jul 16 decisions replace the "no root guild directory" and "Garden assessment" guardrails; then mirror the page decisions as one Linear issue per page under P-PRD-19 (Home, Library, Guild template, Garden, Guilds & Working Groups, Chrome/footer). Until that amendment lands, W4 is blocked.

### W1 · Visible content bugs and dead ends (S) — the "editorial updates" queued for the next release

Issue: new child under P-PRD-19, `editorial`.
- "Learn > Podcast" → rename in `content/podcast.json:2` (or stop rendering the title on Home).
- "bridge" overline on Garden → drop `garden.framing` from the overline (`garden/index.astro:72`).
- "Workspace" hero button on chapters → derive the label from link kind (`chapters/[slug].astro:127`); primary label = `${action} ${label}`.
- Raw theme slugs → add a `themeLabel(slug)` helper in `lib/operational-content.ts` using `snapshot.themes`, use it on chapter/guild/story pages; fix the duplicated "Public Goods" label in Directus.
- "c te d ivoire" related chip → resolve chapter name from the snapshot (`stories/[slug].astro:179`).
- Dead `#step-1` on Home → `/garden#step-1` (`content/garden.json:18,119,131`).
- Raw dates and categories in story meta → `<time>` + label map (`stories/index.astro:112,141`, `stories/[slug].astro`).
- Remove the "Knowledge map · In design" tile and the untrue "Regen toolkit" tile copy (`index.astro:266-280`); Jul 16 decision.
- Strip research citation IDs from public proof cards (`chapters/[slug].astro:158`, `guilds/[slug].astro:181`) or stop rendering `signal.source`.
- `StatusChip` inactive tone; `inactive` chapters render dimmed (`components/ui/StatusChip.astro`, `chapters/[slug].astro:117`).
- Define the missing tokens in `map/edit.astro:384-402`; add `/map/moderate/` to `public/robots.txt`.
- Delete the five unused scripts under `src/scripts/` and drop `gsap` (touches `packages/website/package.json` and the lockfile — call it out in the PR).

Validation: `bun run ui:check`, `bun run build:website`, `bun run agentic:browser-proof /` + `/chapters/nigeria` + `/garden` + `/library` at 375/1024/1440.

### W2 · HomeMap P0 (M) — PRD-739 items 1–5, unchanged scope

Issue: PRD-739 (move to Todo, assign).
1. Sizing: replace `width: min(100%, 128dvh)` with container-width sizing and a height cap (`index.astro:386`, `HomeMap.astro:6743-6747`); breakpoints off container width only; add a short-viewport budget so H1 + map + CTAs fit ~600px laptops.
2. Cross-type radius clustering with fan-out; pointer disambiguation ≥2 nodes within 44px (`HomeMap.astro:2767-2949`, `:1621-1633`).
3. "Show all" reset chip whenever a filter is active + on-canvas empty state (`:4291-4293`).
4. Clear hover/selection state on scroll, filter change, overlay open, pointer-leave (`:1468-1508`, `:281`).
5. Entries: walkthrough trigger = "Join the map" (on-map pill + footer), hero primary "Find your people" = browse behaviour with a real `href` for no-JS (`index.astro:94`, `home-page.json.hero.primaryCta`).
Also fold in from §2: pass chapter `themeSlugs` into map nodes so theme filters apply to chapters today (`HomeMap.astro:120`, `:2178`); let Escape/backdrop close the add-node dialog (`:3701-3709`); make the hover card non-live.
Validation: `scripts/home-map-browser-smoke.ts`, `bun run test:map-nodes`, browser proof at 1366×641 (the ThinkPad case), 375, 1024, 1440.

### W3 · Chapter pages as the landing surface (M) — PRD-625 code half

Issue: new child "Chapter page depth" under P-PRD-19; PRD-625 stays the content half.
- Render stories with `relatedChapter === slug` (and `featuredStorySlugs` first); render initiative `relatedStorySlugs`/`relatedResourceSlugs` as on-site links (`chapters/[slug].astro:168-222`).
- Join `people` by `stewardSlugs` for bio + links on steward cards (`lib/operational-content.ts`, `:321-345`); dedupe `links` vs `connectLinks`.
- Add a "Join this chapter" block: primary link (chat/Luma/Hub) + cadence when set + "Talk to a steward" fallback (Aug 17 "onboarding plain on the website").
- Chapters index: search field (JSON already has the placeholder copy), decide whether forming chapters are listed as forming, fix the `radiogroup`, use `ImagePlaceholder` for imageless cards, DESIGN empty-state card.
- Stop building public pages for `noindex` records, or render a public-safe "forming / dormant" template with no internal copy (`:25-28`).
- Reconcile status with the Aug 24 steward review (see §5).
Validation: `bun run test:content`, browser proof for one active, one forming, one imageless chapter.

### W4 · Jul 16 page restructures (L in total, one M lane per page) — blocked on the W0 hub amendment

Issue: one child per page under P-PRD-19, each linking the matching prompt section in `docs/design/claude-design-wireframe-prompts.md`.
- **Chrome/footer**: nav gains Guilds; footer columns per the prompt (Guilds & Working Groups, Code of Conduct, Luma calendar, Join the map, LinkedIn, YouTube, Farcaster). Single source: move footer links into `content/social-links.json`/`site-settings.json` and read them (`SiteFooter.astro:2-38`).
- **Guilds & Working Groups page** (`pages/guilds/index.astro`, new): two active guild cards (GreenSci external until it has content), working-group card + "start a working group" empty-state card, living-history list; register in `lib/public-routes.ts` and `sitemap.xml.ts`; breadcrumb back and `activeNav` on guild detail.
- **Guild template**: key-links row in the hero, mandate + 3 principles, active projects only (repo + live links both), media/appearances replaces "Public proof", hats as a grouped list, contributors from `people`, connect + CTA. Needs Directus fields for media rows and hats (see §7, P4).
- **Library**: foundation shelf (4) + wider shelf + "new addition" slot, podcast by season/series with collaborator credits (needs a per-series feed model, the current snapshot is one mixed feed), Garden hand-off band, quiet archive strip; render all published resources by kind.
- **Garden**: three steps, "Start light" labels, aligned subscribe row with podcast/X low-friction links, "How the network operates" document block (Code of Conduct v2, network structure PDF, Hub post), three after-cards; delete or move the assessment step (keep the component).
- **Home**: hero per W2, stories bento, slimmed Commons (books + podcast only), new Guilds section, categorised Ecosystem rows driven by content (new Keystatic singleton), three-card garden ramp.
Validation per page: `bun run ui:verify` at 375/1024/1440 + axe; `bun run test:content`.

### W5 · Stories and Library depth (M) — after W1

Issue: new child "Stories filters, bylines, submission path".
- Filters from `stories-index.json` (category, region/chapter), sort by date, `<time>`; real author/org bylines (Keystatic `people` refs); replace the "moderation queue" copy with the real path (Hub post → steward review → Keystatic PR) or wire a form to the agent (would need a new public route + contract per `CLAUDE.md`).
- Story body: either a real markdown renderer for the Keystatic document field or restrict authors to the supported subset and say so in Keystatic.
- Books: fill `author`/`publishYear` in Keystatic, show formats, add a "PDF · 2 MB" hint on the card.
- Podcast: refresh the feed snapshot in CI (`scripts/podcast-feed-snapshot.ts`) and filter to Greenpill-hosted episodes for "Latest".

### W6 · Quality debt the guardrails keep flagging (M, chunked)

Issue: new child "Website token, a11y, SEO and image debt" — chunk by file so each PR stays reviewable.
- Burn down `scripts/data/ui-source-baseline.tsv`: 77 font sizes → tokens (raise 10–11px metadata to the 12px floor), 139 raw values → `color-mix()` from tokens, 5 `vh` → `dvh`, 10 physical props → logical. Start with `components/ui/*` (fixes every page at once), then HomeMap, Library, map/edit.
- Headings: `Overline as="h2"` for section labels on chapter, guild, chapters-index, stories pages; `aria-label` off `<div>`s; name the four `<audio>` players; remove hover `translate` on cards.
- SEO: `og:site_name`, `twitter:site`, Organization/WebSite JSON-LD in `GpLayout.astro`, Article JSON-LD + `article:published_time` on stories, `<lastmod>` in `sitemap.xml.ts`, `stories/rss.xml.ts`.
- Images: `width`/`height` everywhere, pre-generated WebP/AVIF + `srcset` for chapter/story photos (or enable `astro:assets`), trim `public/images/hifi`, self-host the two font families with subsets.
- Editorial model: wire or delete the unused Keystatic fields (`home-page.sections`, `library.sections`, `stories-index.*`, `garden.afterCards`), purge spec prose from JSON, delete the stale `content/resources/README.md`.

### W7 · HomeMap P1 information layout (L) — design first

Issue: PRD-739 P1 block. Run the "HomeMap organism" Claude Design prompt in the same three-variant format, pick a direction, then implement: compact tooltip + docked inspector/bottom sheet, chip-strip themes with Clear/All, non-modal list drawer with search and map highlight, mobile single-row chrome with map ≥60svh, chapter labels at rest, ≥44px hit targets, node dedup/clamp/jitter. Also emit land dots once (`<symbol>`/`<use>`) and drop the mini-map duplicate; back off the 5 s poll when idle.

### W8 · Decide before building (product calls, no code yet)

- Chapter/steward application funnel (Aug 17): a form on the site would need a new agent route + shared contract + private intake table + Directus review; the alternative is a Hub/Chain Crew link. Recommend: link first, form only if the Hub path proves too slow.
- Chapter minimum standards on chapter pages (charter link, accounting, impact reporting): needs three Directus fields and a decision on what is public.
- Enable `CHAPTER_IMPACT_UI_ENABLED` for the four bound chapters once `.plans/active/chapter-impact-data-integration` browser proof exists.
- PRD-621 manual person-to-person connections: privacy model needed (consent from both sides) before scoping.
- Role terminology on public labels: wait for the Sep 7 thread.

---

## 5. Content and data reconciliation (human-owned, unblock W3)

| Item | Evidence | Owner |
| --- | --- | --- |
| Active-chapter list vs snapshot | Snapshot marks 12 active; stewards (Aug 24) confirmed 9. Ottawa, Germany and Koh Phangan are active on the site but not on the confirmed list; Ukraine is not in Directus at all; Uganda is `inactive` in Directus but "tentative" for stewards. | Stewards sync → publisher updates `entity_status` in Directus |
| Brasil stewardship | Governance transition, three people share access. `chapters.stewards` lists two. | Brasil stewards |
| Chapter images | 6 chapters have none; GreenSofa's is a Google Drive URL that may not serve as an image. | Chapter stewards (needs the CMS fix in §7 P0-1 first) |
| Chapter descriptions, founded year, cadence | 0/18 long descriptions, 1/18 founded, 0 cadence. | Chapter stewards; PRD-625 |
| Steward bios | 13 of 21 people have empty bios; not rendered today (W3 makes them visible). | Stewards |
| Theme labels | Two slugs labelled "Public Goods"; 0/20 descriptions. | Publisher |
| Guild cadence and members | `cadence.summary` is an internal note on all three guilds; Writers Guild has no public members. | Guild stewards |
| Book metadata | `author`/`publishYear` empty on all 13. | Editor (Keystatic) |
| Podcast feed | 5 months stale; shared feed. | Platform (W5) |
| Ecosystem/partner roster | Hard-coded; Jul 16 asks for 9 partners + 3 tools. | Editor (after W4 Home) |

---

## 6. Directus CMS audit findings

Roles: Steward Editor, Steward Moderator, Trusted Publisher, Operator (admin), Content Agent (API-only). Stewards edit their assigned chapter/guild directly and self-publish; the update-request flow is optional. That model shipped 2026-08-11 and works; what follows is what is still rough on top of it.

### 6.1 Steward walk-through (what a newly invited chapter steward hits)

- **Sidebar order is alphabetical with no folders**, so "Chapter Impact Snapshots" is the first collection. No `module_bar` curation, logo, or help URL despite the plan marking that done (`scripts/directus-studio-setup.ts:975-997`, `:1385-1393`).
- **Guide points to the wrong bookmark**: `STEWARD_GUIDE.md:62,206` send stewards to "Published chapter reference" (lists every chapter); the scoped bookmark is "My chapter" (`directus-studio-setup.ts:1060-1068`).
- **`region` note says "province or state"** (`directus-studio-setup.ts:463`) but the directory filter expects `americas|africa|asia|europe|oceania` (`packages/website/src/pages/chapters/index.astro:24-36`). Free text silently breaks the filter.
- **Themes and stewards are free-text tags / raw JSON**: `theme_slugs` is a `tags` input with no link to the `themes` collection (`:356-362,482`); `stewards` is a JSON code editor whose objects include a `wallet` key (`:480`), beside `steward_slugs` and a `people` collection stewards cannot write and the site never reads. Three homes for one concept.
- **Network-editorial fields are steward-writable**: `seo` (incl. `noindex`, which removes the chapter from the map and impact bindings), `featured_weight`, `related_chapter_slugs`, `featured_story*`, `authored_resource_slugs`, legacy `image` (`scripts/directus-content-access.ts:66-96`). `intro_quote*` and `authored_resource_slugs` are exposed but rendered nowhere.
- **Initiatives**: `slug` is a typed primary key with no default and no `required` flag (`packages/agent/migrations/010_*.sql:6`, `directus-studio-setup.ts:497`), `title` is DB-required but unflagged; the `chapter_slug` dropdown lists every published chapter and a wrong pick fails with a bare 400 (`directus-content-access.ts:653-657`); no groups; `impact_sources` is raw JSON; stewards cannot delete their own mistakes.
- **Image upload silently quarantines the chapter** (verified): the agent projects `image_file` to a public `image` URL (`packages/agent/src/public-content.ts:59-64`); the shared guard treats any `image` as a candidate and requires `media.reviewStatus === 'approved'` (`packages/shared/src/public-content.ts:441-460`) or drops the record from the snapshot (`:375-380`). Nothing on the direct upload path sets `reviewStatus`; the quarantine email goes to operators, not the steward. All 12 active chapters are pre-approved, so this has not bitten yet; it will on the first new image on a forming chapter or any new chapter. No test covers `imageFileId` + unapproved media.
- **`pending_review` on a chapter/guild/project is a dead end**: the notification kinds are only `update_request_pending|decided`, `initiative_pending`, `record_quarantined` (`migrations/026_*.sql:28-29`); no publisher bookmark lists pending chapters. Stewards also get no email when a publisher publishes or returns their initiative.
- **No "is it live yet" signal**: `published_at` is stamped at status change, not deploy; the dispatch → Pages path is ~5–10 min and invisible; stewards cannot read `review_notifications`. PRD-808 (watchdog) is the platform half; a steward-visible half is missing from the plan.
- **Update-request traps**: `links`/`proof_signals` on an accepted request *replace* the chapter's lists (`migrations/024_*.sql:143-144`) while the guide says "add or update"; `requested_changes` JSON is never applied; the optimistic-lock stale check trips on any direct edit since the draft was made and requires the publisher to hand-copy `chapter_updated_at_snapshot`; sync-prep drafts are created as the admin so the decision email goes to the admin.
- **Locations** are not a collection; the map pin is two decimal inputs with no picker, range check or explanation.
- **Map moderation in Directus** has no home for a decline reason (`map_node_reviews` has no studio metadata), no bookmark for owner update requests, and moderators cannot see `live_onboarding_expires_at`.
- **Guild/project parity**: `guilds.cadence` is a jsonb column with a plain text interface (typing text yields a 400), `type` is free text, no image upload, no guild-steward bookmarks, no groups on projects.

### 6.2 Permissions

The dynamic `$CURRENT_USER` assignment policy is sound and proven by the smoke script; legacy per-slug policies are cleaned up. Risks are footguns, not leaks: over-permission on editorial fields (above); under-permission on delete of own drafts, own `people` profile, `review_notifications` read, `created_by` on own requests; role exclusivity forces a moderating chapter steward into Trusted Publisher (private contact reads). Dead code in the setup script (`currentUserEditorAssignmentFilter`, `andFilter`/`orFilter`) and a deprecated `content-access -- sync` reference in `docs/agentic-mcp-tooling-runbook.md:25`.

### 6.3 Documentation drift

`packages/admin/STEWARD_GUIDE.md`, `STEWARD_SYNC_INVITE.md`, `templates/user-invitation.liquid`, root `README.md:271-274`, and the in-studio notes (`directus-studio-setup.ts:31,46,416,422`; `directus-operational-content-setup.ts:1400`) still describe the pre-August model ("trusted publisher applies your change", "edit only draft/pending", "Public image URL"). The guide omits that initiative `slug` is required, omits `media.reviewStatus`, shows JSON examples for fields that are now list editors, and says "you get an email" for prep-created drafts (you don't). `packages/admin/README.md:234` lists a bookmark the studio script deletes.

---

## 7. CMS implementation outline

### P0 · Safety and correctness (S–L) — before inviting more stewards

Issue: PRD-809 (first item is already on it) + new child "Steward field scoping and validation".
1. **First-class image metadata** (PRD-809): `image_alt`, `image_credit`, `image_review_status` columns on `content.chapters` with backfill from `media.*`; project in `content.public_chapters`; treat `image_file` set by a publisher or an accepted request as approved; expose in the Links & Media group; add a shared test for `imageFileId` + unapproved media. Layer: migration 028+ (PR #19 already claims 028 — sequence after it), `packages/shared/src/public-content.ts:441-460`, `packages/agent/src/public-content.ts:59-64`, studio + permissions field lists, guide. Effort: L.
2. **Steward-editable field subset**: a `STEWARD_EDITABLE_FIELDS` list in `scripts/directus-content-access.ts:65-156` for assigned read/update; keep the publisher set; hide `intro_quote*`/`authored_resource_slugs`. Effort: S.
3. **`region` as a select** with the five continent choices and a note (`directus-studio-setup.ts:463`). Effort: S.
4. **Required flags + slug derivation**: mark `name`/`title`/`slug` required in studio; `options.slug: true`; before-insert trigger deriving slug from title when blank. Effort: M.
5. **Scoped pickers**: `options.filter` on `chapter_initiatives.chapter_slug`, `chapter_update_requests.chapter_slug`, `projects.guild_slug` using `$CURRENT_USER.*_editor_assignments`; note "only your assigned chapter is accepted". Effort: S.
6. **Fix `guilds.cadence` interface** (jsonb vs text input) and `type` → dropdown. Effort: S.
Validation: `bun run test:content`, `bun run test:agent`, `bun run directus:content-access -- verify`, local `bun run directus:steward:smoke` after re-applying setup.

### P1 · Clarity in the studio (S–M)

Issue: PRD-809.
- Collection `sort` + folders (My content / Reference / Reviews / Moderation / Operations); `module_bar` hiding Files/Insights clutter for stewards; project logo + help URL.
- Fix the stale notes (`directus-studio-setup.ts:31,46,404-425`, `directus-operational-content-setup.ts:1400`); add notes for `entity_status`, latitude/longitude ("this is your map pin"), `publication_status` ("saved edits reach greenpill.network within ~10 minutes").
- `theme_slugs` → `select-multiple-dropdown` fed from published themes (m2m junction later).
- `stewards` → typed `list` editor (name/role/bio/location/personSlug/avatar; no `wallet`); hide `steward_slugs` for stewards.
- Field groups for initiatives, projects, update requests; guild bookmarks ("My guild", "My guild projects"); publisher bookmarks for pending chapters/guilds/projects.
- Update-request notes: "Replaces the chapter's full link list"; remove `requested_changes` from the steward write set or label it as not applied.
Validation: `scripts/directus-studio-setup.test.ts`, local bootstrap, steward smoke.

### P2 · Close the loop (M) — the two open Linear lanes plus one addition

Issue: PRD-808 (watchdog) and PRD-809 (dashboard); new child "Steward-facing publish state".
- Land PR #19 (review, resolve the four PRD-809 typecheck errors it names, then the separate activation step: migration 028, Fly secret, PAT with Actions:read).
- Notification kinds `record_pending` (chapters/guilds/projects) and `initiative_decided` to the steward, resolving emails through `chapter_editor_assignments` the way `packages/agent/src/map-nodes.ts:1594-1608` already does; quarantine alert copy to the affected chapter's stewards.
- Stewards get scoped read on `review_notifications` + a "My chapter alerts" bookmark; when the watchdog lands, surface "deployed at" there and on the operator Insights dashboard.
- Refresh `chapter_updated_at_snapshot` on transition to `pending_review` so the stale window is the review window; prep script stops pre-filling `proposed_image` and sets `created_by` from the assignment email.
Validation: PR #19's suites (`test:agent` 82, `test:content` 23, plan contract 7) plus new cases for healthy/stale/failed/recovered and for each notification kind.

### P3 · Onboarding as one step and docs truth (S)

Issue: reopen PRD-810 scope or new child "Steward onboarding v2 docs".
- `directus:users:invite` accepts `kind`/`slug` columns and creates the assignment row; unhide the `directus_users.*_editor_assignments` aliases for publishers so assignment is a click on the user record.
- Rewrite `STEWARD_GUIDE.md`, `STEWARD_SYNC_INVITE.md`, `user-invitation.liquid`, `packages/admin/README.md:234`, root `README.md:271-274`, runbook `:25` to the shipped model (My chapter bookmark, direct edit + self-publish, upload path, slug requirement, replace semantics, region choices, what emails you will and will not get).
- One-page "first 15 minutes" checklist for the Stewards Sync: log in → My chapter → update summary, region, pin, links → upload image → set published → check the site in 10 minutes.

### P4 · Structure (M–L) — after the Jul 16 guild/chapter decisions are amended into the hub

- Structured impact sources (columns instead of JSON) + steward bookmark on impact snapshots.
- Guild media rows, hats, and public contributor fields to feed the new guild template (W4); guild/project image upload reusing the chapter folder pattern.
- Chapter fields for the minimum standards (charter URL, accounting note/link, impact reporting link) once the Aug 17 standards are ratified.
- Map moderation: studio metadata for `map_node_reviews` and `map_node_update_requests`, a "Pending owner update requests" bookmark, `live_onboarding_expires_at` in settings read fields, and either a Flow inserting a review row with `$accountability.user` on status change or a `moderator_note` column.
- pt-BR/es labels after confirming locale keys (PRD-809).
- Deferred by decision, keep deferred: `content.people` as steward-owned profiles, AI assistant.

---

## 8. Suggested sequencing (three two-week cycles)

| Cycle | Website | CMS |
| --- | --- | --- |
| 1 | W0 housekeeping; W1 editorial bugs (ships with the next release); W2 HomeMap P0 | P0-2…6 (field scoping, region, required flags, pickers, cadence); P3 docs rewrite; land PR #19 |
| 2 | W3 chapter pages + §5 content reconciliation; W5 stories/library depth | P0-1 image metadata (PRD-809); P2 notifications + steward alerts; P1 studio clarity |
| 3 | W4 page restructures (start with Chrome + Guilds page + Garden, then Library, then Home); W6 debt in chunks | P2 dashboard; P4 structure needed by the guild template |

W7 (HomeMap P1) waits for its design round and slots after cycle 3.

Decisions needed from humans before cycle 2: the hub amendment for guild routes and the Garden assessment (W0), the active-chapter statuses (§5), whether forming chapters are listed, and the application-funnel path (W8).

---

## 9. Risks and guardrails

- **Security-sensitive files touched by this outline:** `packages/website/package.json` + `bun.lock` (removing `gsap`), `.github/workflows/github-pages.yml` (only if the podcast refresh is added), `scripts/directus-*.ts` (permissions). Each needs an explicit call-out in its PR.
- **Never** expose `people` private fields, `review_notifications` payloads, intake tables, or draft rows on the public site; every new public route needs the shared contract + test per `CLAUDE.md`.
- **Production Directus changes** (re-applying setup, migrations, secrets) remain a separate authorised release step, as the hub already states.
- **Local QA** for website work runs through the authenticated Brave path per `CLAUDE.md`; the `agentic:browser-proof` lane is CI/clean-room proof only.

---

## 10. Evidence index

- Linear: P-PRD-19, PRD-739, PRD-807/808/809/810, PRD-619/620/621/625, comments on PRD-807 (2026-08-11).
- Repo: `docs/design/map-polish-audit.md`, `docs/design/claude-design-wireframe-prompts.md`, `.plans/active/public-website-design-implementation/{brief,plan.todo,status}`, `.plans/active/directus-cms-advancement/{plan.todo,status,spec}`, `MAP-REVIEW.md`, `scripts/data/ui-source-baseline.tsv`, `packages/website/src/data/operational-content-snapshot.json` (generatedAt 2026-08-10).
- PRs: greenpill-dev-guild/network#19 (draft watchdog), greenpill-dev-guild/network#9 (mobile menu z-index).
- Drive: Build Sync 2026-09-09/16/23; Stewards Sync 2026-08-17/24/31, 2026-09-07/14/21; Monthly Community Call 2026-09-09.
- Verification runs on this branch: `bun run plans:validate` (10 hubs), `bun run ui:check` (0 hard, 0 warn with 231 baselined).
