# Greenpill Network UI/UX Audit, Pass 2

Point-in-time audit of the public website (`packages/website`) and the Directus steward admin (`packages/admin` + `scripts/directus-*-setup.ts`) as of 2026-09-24, against committed `main` at `b1ead9d`. Uncommitted work by other sessions in the same checkout (for example `packages/shared/src/public-content.ts`) is out of scope.

Pass 1 (2026-03-27, `.plans/active/public-website-design-implementation/research/greenpill-ui-ux-audit.md`) argued the site told the wrong story and had no information architecture. That has been fixed: the site now has 47 built pages, a real IA, a token system, and a verification harness. Pass 2 assumes that foundation and asks a narrower question: **does each page make a first-time visitor or a first-time steward think, and does the component system hold together?**

The three lenses are named explicitly because they disagree in useful ways:

- **Krug, *Don't Make Me Think*** — clarity and wayfinding: the trunk test, the home page's four questions, mindless choices, omit needless words, the goodwill reservoir.
- **Wathan & Schoger, *Refactoring UI*** — visual hierarchy and craft: one primary action, labels are a last resort, systematize everything, don't overlook empty states, consistency of personality.
- **Frost, *Atomic Design*** — the system underneath: atoms → molecules → organisms → templates → pages, the interface inventory, and keeping the pattern library and production in sync.

Page references below are to the PDF page numbers of the three files supplied for this audit.

---

## 0. Method and evidence

| Step | What was done | Result |
| --- | --- | --- |
| Build + render | A fresh build was not possible (dependencies are not installed in this checkout, see Appendix B). `scripts/ui-verify.ts` rendered the existing `packages/website/dist`, built 2026-08-11 11:32. No commits have touched `packages/website`, `packages/shared` or the content snapshot since then, so that build matches committed `main`. | 46 routes rendered at 375 / 1024 / 1440, **0 HARD**, 145 WARN (138 are `AXE_NOT_INSTALLED`; 6 `NO_NAV_LANDMARK` on the two standalone map pages; 1 `TOUCH_TARGET` on `/design-system`) |
| Trunk test | Extracted every landmark, heading, link, button, field and copy line from the built HTML of 12 representative pages (home, chapters, chapter detail ×2, guild, garden, library, stories, story, map/edit, map/moderate, 404) | Scratch transcripts; quoted inline below |
| Screens | Read the 375 and 1440 PNGs for the same pages | Findings marked *(seen)* were confirmed visually |
| Source | Read `DESIGN.md`, `gp-tokens.css`, every `components/ui/*`, `shell/*`, `page-sections/*`, all pages, and the two Directus setup scripts | Findings marked *(source)* cite `file:line` |
| Prior decisions | Cross-checked the 2026-07-17 call decisions in `docs/design/claude-design-wireframe-prompts.md` (appendix) and the HomeMap audit `docs/design/map-polish-audit.md` | Section 5 lists what is still open |
| Directus live QA | **Blocked.** The authenticated Brave extension path is not connected (`list_connected_browsers` returned nothing) and the repo rule forbids isolated-browser QA for Directus. The admin audit is therefore a *configuration* audit of the studio and permissions scripts plus the steward docs, not a walk through the live Data Studio. | Section 3 states this again |

Two things the harness cannot tell you, so this audit does not claim them: colour contrast (axe is not installed, so channel 3 ran as a warning) and anything that requires a logged-in Directus session.

Content source: copy findings come from the committed fallback snapshot (`packages/website/src/data/operational-content-snapshot.json`, last changed 2026-08-10). Production builds pull the live agent snapshot hourly, so stewards may already have edited some of the quoted chapter rows in Directus. Re-check the F1 page list against greenpill.network before rewriting rows.

Screenshot note: full-page renders show blank image tiles on some chapter, story and library cards, and on the Nigeria chapter hero. Every referenced local image exists in `dist` and is a valid JPEG or PNG (checked with `file` and `sips`), and the hero image CSS hides nothing, so the blanks come from the harness's beyond-viewport capture (`scripts/ui-verify.ts:845-859`), not from broken assets. They are excluded below. One real browser look at `/chapters/nigeria` would close this completely. The one genuinely broken image is GreenSofa's, whose `src` is a Google Drive viewer page (F14).

---

## 1. Headline findings

Ranked by how much goodwill they cost a first-time visitor (Krug ch. 11, p. 203–211) and how cheaply they can be fixed. Severity: **P0** = trust or comprehension failure on a primary path; **P1** = friction or system drift that compounds; **P2** = polish.

| # | Severity | Finding | Where | Lens |
| --- | --- | --- | --- | --- |
| F1 | P0 | Internal research and steward notes are published as public copy on **26 of 47 pages** | chapter summaries, story bodies and bylines, proof cards | Krug goodwill, omit needless words |
| F2 | P0 | `/map/edit` (the page reached from a personal email link) is visually a different website: forked tokens (three of them undefined), Georgia fallback, no Site ID, black canvas bands, and no link anywhere on the page, so a successful submit is a dead end | `pages/map/edit.astro:385-452, 462, 537, 568, 697-764` | Krug Site ID + forms exception; Frost duplication → drift |
| F3 | P0 | The home page does not answer "what is this / what can I do here / where do I start"; primary CTA "Find your people" opens the *add yourself* form | `pages/index.astro`, `HomeMap.astro` | Krug ch. 7 four questions, tagline vs motto |
| F4 | P0 | Guilds have three different parents (footer says Network, home and library say Library, breadcrumb says Garden) and are absent from primary nav; four footer links mismatch their destinations | `SiteFooter.astro:17`, `guilds/[slug].astro:54-56` | Krug ch. 6 "name must match what I clicked" |
| F5 | P0 | Entity heroes carry two competing buttons that go to the same URL, with labels that say nothing about the destination ("Workspace" + "Read"; "Workspace" + "Review") | `chapters/[slug].astro:127-128` | RUI one primary action (p. 60–62); Krug scent |
| F6 | P1 | Metadata overload: section headers are `LABEL — n things` pairs, proof cards lead with internal IDs `S016`, stories print raw source URLs and then repeat them as cards | chapter, guild, story templates | RUI labels are a last resort (p. 48–52) |
| F7 | P1 | Duplicate and phantom blocks: "Public links" and "Connect" list the same links; home still shows the "Knowledge map · In design" placeholder and a non-clickable "Open the toolkit" call to action | `chapters/[slug].astro:228-313`, `index.astro` | RUI be a pessimist (p. 18–19); Krug make clickable obvious |
| F8 | P1 | Status chips and theme chips are the same pill; themes print raw slugs (`opensrc`, `public`); a 16-theme filter row sits inside a 250px map at 375 | `Chip.astro`, `StatusChip.astro`, `HomeMap.astro` | RUI hierarchy; Frost atoms need one job |
| F9 | P1 | Page names are taglines. Nav says "Chapters", the h1 says "The local nodes of the Greenpill network." The real section name lives only in a 12px mono overline | all index pages | Krug page names (p. 105–107) |
| F10 | P1 | Empty and loading states leak: hero legend renders "Stewards 0 · Members 0" in static HTML and clips the third chip at 375; a single-option status filter empties the grid when toggled | `HomeMap.astro:257-270`, `chapters/index.astro:129,214` | RUI don't overlook empty states (p. 234–237); Krug mindless choices |
| F11 | P1 | Copy density: instruction paragraphs, repeated overline/h1 pairs, "source-backed" 188 times across 42 pages, "friction" labels the July call retired | site-wide | Krug ch. 5 omit needless words |
| F12 | P1 | Garden assessment: 35 radio pills; fieldset legends straddle the card edge (default `legend` rendering never reset); the July call removed this block | `GardenAssessment.astro:166-170, 478-500` | RUI ambiguous spacing (p. 96–99) |
| F13 | P1 | Story template: breadcrumb prints the raw category slug `field-report`; byline is a "GN" avatar for "Greenpill Network research · Source-backed seed copy"; 17 pages | `stories/[slug].astro:87, 95-100` | Krug conventions; RUI personality |
| F14 | P2 | Six legacy chapters are built and reachable (noindex) with research-note copy; GreenSofa's card image is a Google Drive HTML URL | `dist/chapters/{denver,california,…}`, snapshot | Frost templates must articulate variations (p. 55) |
| F15 | P1 | System health: `HomeMap.astro` is 7,104 lines; 231 accepted standard exceptions; the design-system page calls itself "temporary" and shows atoms but none of the page organisms | `.ui-verify`, `scripts/data/ui-source-baseline.tsv`, `design-system.astro` | Frost interface inventory + holy grail (p. 95–106, 159–163) |
| F16 | P0 (admin, verify live) | No non-admin permission field list includes the form-group containers or the link/proof repeater fields; stewards may be seeing empty grouped forms and no "Add New" rows | `directus-content-access.ts:65-239`, `directus-operational-content-setup.ts:116-177` | Krug goodwill; Frost system in sync |
| F17 | P0 (admin) | Stewards are handed raw JSON code editors for `stewards`, `media` (alt text lives there per the guide), `seo`, `impact_sources`, `featured_story`; only nine fields in the schema have a human label; `slug` is field 1 everywhere | `directus-studio-setup.ts:220-234, 440-557` | Krug forms; RUI hierarchy |
| F18 | P0 (admin) | The product has three names, no logo, default Directus appearance; the invite email carries two of the names in consecutive sentences | `user-invitation.liquid:4-8`, `directus-studio-setup.ts:1385-1393` | Krug Site ID; RUI personality |
| F19 | P1 (admin) | The steward's first decision (edit live vs open a request) is described five different ways; after saving, nothing tells them when the site updates; initiative decisions never notify | `STEWARD_GUIDE.md:5-23,196`, `content-operations.ts:84,556,712-766` | Krug mindless choices, goodwill |
| F20 | P1 | Dead CSS: page-scoped rules aimed at primitive children compile with the page's scope id and never match; the chapter-card 3-line summary clamp, the stories 60ch cap and the garden stack spacing are all inert in `dist` | `chapters/index.astro:459-470`, `stories/index.astro:233-236`, `garden/index.astro:289-294` | Frost: system out of sync with production |
| F21 | P1 | Small trust leaks: "17 storyies" caption, `href="#"` fallbacks on proof and output cards, raw dates ("2026-03") and slugs ("Chapter · c te d ivoire") in visible metadata, five story h1/title mismatches | `stories/index.astro:131`, `guilds/[slug].astro:135,157,180`, `stories/[slug].astro:179-186` | Krug goodwill: "looks amateurish" |

---

## 2. Website

### 2.1 Trunk test

Krug's trunk test (p. 112–113): dropped on a random page, can you find the Site ID, the page name, the sections, local navigation, a "you are here" marker and search, without squinting?

| Page | Site ID | Page name | Sections | Local nav | You are here | Search |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | ✓ logo + wordmark | ✗ motto, no name | ✓ 4 items | n/a | n/a | ✗ |
| `/chapters` | ✓ | ~ "The local nodes of the Greenpill network." | ✓ | ✓ region pills | ~ thin underline only | ✗ |
| `/chapters/nigeria` | ✓ | ✓ "Greenpill Nigeria" | ✓ | ✓ breadcrumb ("Africa" crumb is dead text) | ~ | ✗ |
| `/guilds/dev-guild` | ✓ | ✓ | ✓ but "Guilds" is not one of them | breadcrumb parent is **Garden** | ✗ nothing lit | ✗ |
| `/library` | ✓ | ~ "Everything we have made public." | ✓ | ✓ 2 anchor CTAs | ~ | ✗ (13 books, 296 episodes, no find) |
| `/stories` | ✓ | ~ "Field notes from the network." | ✓ | ✗ | ~ | ✗ |
| `/garden` | ✓ | ~ "Enter the garden." | ✓ | ✓ "Start with Step 1" | ~ | ✗ |
| `/map/edit` | **✗ no header at all** | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/map/moderate` | ~ mono overline only | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/404` | ✓ | ✓ | ✓ | ✓ 3 exits | n/a | ✗ |

Reading: the shell is good (persistent header, footer mirrors, 404 is a proper page). The two failures are the standalone map pages and the "page name" column, which is the subject of F9.

### 2.2 Home page against Krug's questions (ch. 7, p. 114–131)

*(seen at 375 and 1440; transcript of `dist/index.html`)*

- **What is this?** The h1 is "A global regenerative network." Krug distinguishes a *tagline* (a value proposition) from a *motto* (p. 126): this is a motto. The one sentence that actually says what Greenpill is exists on the page, but only inside `<meta name="description">`: "Greenpill is a global regenerative network of chapters, guilds, storytellers, and builders coordinating pu…". Put that sentence on the page.
- **What can I do here / where do I start?** The paragraph under the map is an instruction ("Start with the map, read the field notes, browse the public library, or enter through the Garden at the pace that fits."). Krug: nobody reads instructions (p. 82), and listing four options is not the same as showing where to start.
- **Primary CTA** "Find your people" opens the *Drop your pin* walkthrough (`HomeMap.astro:3529`). Someone who wants to *find* people gets a form asking for their name and email. The HomeMap audit already decided the trigger becomes "Join the map"; the July appendix repeats it. Not implemented.
- **Signs of life.** The legend chips render "CHAPTERS 12 · STEWARDS 0 · MEMBERS 0" in the static HTML (`HomeMap.astro:257-270`). Counts update from `/map/state` only if the agent answers (`:3268`, failure is a silent no-op at `:3320`). For any visitor whose fetch fails, the hero announces a network with no stewards and no members. Refactoring UI: an empty state is the user's first interaction, design it (p. 234–237). At minimum, hide zero counts until the fetch resolves.
- **At 375** *(seen)* the legend row overflows the map card: only the dot of the third chip is visible at the right edge.
- **Commons bento** still contains "Knowledge map · In design" (a card that is not a link and promises a feature) and "Field-tested guides for local action. — Open the toolkit" where "Open the toolkit" is plain text styled like a CTA and not wrapped in an anchor (`dist/index.html`, confirmed). The July call decided to hide both tiles. Refactoring UI p. 18–19: don't imply functionality you aren't ready to build.
- **The ramp cards** still say "Lowest friction / Light friction / Medium friction / Highest friction" and include the Regen Assessment; both were retired on the July call.

### 2.3 Wayfinding and information architecture

*(source + transcripts)*

**Guilds have no home.** Footer puts Dev Guild and Writers Guild under "Network" (`SiteFooter.astro`). Home and `/library` present them under "Library · Knowledge commons" / "Guilds · Working circles". The guild page breadcrumb says `← Garden / Guild / Dev Guild` (`guilds/[slug].astro:54-56`). Krug's social contract (p. 107): the name of the page will match the words I clicked, and the path back should be the path I came by. Pick one parent. The July decision was "Guilds in primary nav" plus a new `/guilds` page; until that lands, the breadcrumb parent should be whichever section actually links to guilds most (today, Library).

**Footer links that don't match their destinations** (`SiteFooter.astro:14-20`):

| Label | Destination | Problem |
| --- | --- | --- |
| Attend an event | `/chapters` | The chapters index has no events |
| Add yourself to the map | `/#join-map` | No element has that id; it works only because `HomeMap.astro:3651` listens for the hash. On the home page itself the link produces no visible change if the listener has not attached |
| Talk to a steward | Google Calendar (external) | No external indicator, unlike the `↗` used on guild outputs |
| Subscribe (home ramp card) | `#step-1` | The anchor exists only on `/garden` (0 matches in `dist/index.html`) |

**Footer duplication and drift.** `/garden` appears twice ("Garden" under Network, "Start in the Garden" under Get involved), `/chapters` twice under two labels, "Podcast" goes to Apple Podcasts although `/library#podcast` exists, and the footer's Telegram URL differs from `src/content/social-links.json:7` because the footer is hard-coded rather than read from content (`SiteFooter.astro:2-38`). `DESIGN.md:555` specifies a right-rail wordmark and tagline in the footer that was never built; that slot is where Krug would put the tagline the home page is missing.

**Nothing is marked on home or guild pages.** `index.astro:78` passes `activeNav="Home"` and `guilds/[slug].astro:48` passes `"Guilds"`; neither label exists in the nav, so no item lights up.

**The "you are here" cue is too subtle** *(seen at 1440)*: the active nav item is a 1px underline in the same colour, and the hover state uses the same underline (`SiteHeader.astro:113-117`), so hovering any item makes it look current. Krug p. 109: apply more than one distinction (colour *and* weight, or a filled pill). The `is-active` class exists; only its styling is timid.

**Breadcrumb crumbs that are not links.** "Africa" on chapter pages and "field-report" on story pages are inert text in crumb position. Krug p. 111: crumbs exist to back up a level or go home. Either make region a filter link (`/chapters?region=africa`) or drop the crumb and keep the overline.

**No search.** With 18 chapters, 13 books, 296 episodes and 18 stories, the site is at the edge of Krug's "very small and very well organized" exemption (p. 102). Not urgent, but the Library is the page that will need a find-as-you-type filter first.

### 2.4 Copy

Krug's third law (p. 77): get rid of half the words, then half of what's left. The site's copy problem is not verbosity so much as *audience*: a lot of it is written for the team that built it.

**Internal notes published as public copy** *(transcripts; `dist` grep)*. 26 of 47 pages contain at least one of: "needs steward backfill", "before launch", "research artifact", "This pass did not find", "legacy chapter record", "Needs source review", "should be published as goals, not completed metrics", "being backfilled". Examples exactly as rendered:

- `/chapters/denver` summary: "Held as a legacy chapter record from the existing site. This pass did not find Denver in the provided priority research artifact, so detailed public copy needs steward backfill before launch." Proof card: "EXISTING REPO CONTENT / Needs source review / Legacy record". Link row: "Legacy X account / Needs steward backfill".
- `/chapters` index cards: Ottawa "Deeper chapter activity needs steward backfill before launch copy makes specific program claims." Germany "The previously listed chapter website needs a fresh source check before launch." Kenya "Exact event year needs steward review." Côte d'Ivoire "Targets should be published as goals, not completed metrics." Cape Town "Public source links and detailed program notes are being backfilled with stewards." That is 5 of the 12 cards a visitor scrolls on the index.
- `/stories/greenpill-nigeria-water-cup` body: "Greenpill Nigeria has one of the strongest public chapter footprints in the research artifact." and "This story should render as a proof-backed field note, not as a claim that every downstream impact metric is already verified by the website."
- Story byline on 17 pages: "Greenpill Network research · Source-backed seed copy · 3 MIN READ" with a "GN" avatar.

Krug ch. 11 lists "your site looks amateurish" and "shucking and jiving" as goodwill drains; a chapter page that says its own copy "needs backfill" does both. The fix is structural, not editorial: these sentences belong in a private `steward_notes` / `editorial_notes` field in Directus, and the publish pipeline (`content:snapshot`, the hourly build) should refuse a row whose public `summary` matches the internal-note vocabulary. Then rewrite the 10 affected chapter rows (list in Section 6).

**"Source-backed" is a house standard, not a reader benefit.** It appears 188 times across 42 pages: "source-backed activity", "source-backed destinations", "source-backed evidence anchoring this chapter profile", "Featured source-backed story", "A source-backed Brasil story for the chapter, Library, and future impact surfaces." Readers see the proof links; they do not need to be told nine times per page that the team checked its sources. Keep the proof, delete the adjective.

**Overline / h1 redundancy and section-front happy talk.** `/stories`: overline "STORIES · FIELD NOTES FROM THE NETWORK" directly above h1 "Field notes from the network." `/stories` featured block: label "FEATURED" next to caption "Featured source-backed story." Guild hero: dek "Building open-source coordination tools for the regenerative network." followed by summary "The engineering arm of Greenpill Network, building open-source coordination tools for chapters, funders, and regenerative communities." Chapter section captions: "Public, approved channels for this chapter.", "Source-backed evidence anchoring this chapter profile.", "3 chapter-owned efforts". Overlines "GREENPILL GARDEN · BRIDGE" and "GARDEN · RAMP" use internal metaphors ("bridge", "ramp") as labels.

**Vague action labels.** "Read", "Review", "Workspace", "Visit org", "Notes", "Read the story" (fine), "Open the toolkit" (not a link). Krug p. 70–76: links that say what you get give off scent. "Workspace" is what the team calls the Regen Hub thread; visitors do not know that.

**Unformatted data in visible copy.** The stories index caption pluralises by appending "ies": with 17 non-featured stories it reads **"17 storyies"** (`stories/index.astro:131`). `Meta` rows print raw dates ("2026-03-23", "2025-08") and category slugs ("field-report"); related-chapter chips are built from slugs ("Chapter · c te d ivoire", `stories/[slug].astro:179, 186`). Five story pages have an h1 that differs from their `<title>` ("Celebrating Ethereum at 10 — Greenpill Nigeria Awka" vs "Ethereum at 10 Awka"). Proof cards, guild outputs and library links fall back to `href="#"` when a URL is missing (`chapters/[slug].astro:157`, `guilds/[slug].astro:135, 157, 180`, `stories/[slug].astro:156`, `library/index.astro:105, 178`), so a card can look clickable and go nowhere.

### 2.5 Hierarchy and actions (Refactoring UI)

**One primary action per screen** (p. 60–62). Chapter hero *(seen)*: ghost "Workspace" and primary "Read" stacked, both pointing at the same URL (Nigeria → the Water Cup Hub thread; Denver → the same X account twice). Source: `chapters/[slug].astro:127-128` renders `data.link` as "Workspace" and `links[0]` as the primary, and for most chapters those are the same URL. Guild hero: "Visit org" primary + "Read" ghost. Stories index: two ghost buttons and no primary. Library hero: "Browse books" primary + "Listen to the podcast" ghost, then a stat row, then the books, which is the right shape.

**Labels are a last resort** (p. 48–52). The site uses the `LABEL : value` pattern the book warns about, at three levels:

1. Section headers are `OVERLINE — count + noun`: "PUBLIC LINKS — 4 source-backed destinations", "INITIATIVES — 3 chapter-owned efforts", "PROJECTS — 8 public projects", "PUBLIC STEWARDS — 3 stewards". The count is visible from the list; the noun is the overline.
2. Proof cards lead with an internal source ID in bold mono: "S016 / 10 weeks / Education program", "S013 CRYPTO ALTRUISTS / 2.5 ETH / Octant Community Fund grant". The ID is the most prominent element and means nothing to a reader.
3. Story pages print a "Sources" list of raw URLs prefixed with the same IDs ("S046: https://app.hypercerts.org/hypercerts/42220-0x16bA53…") *and then* a "Proof links" card block with the same two sources. One block, human labels, no IDs.

**Chips.** *(seen)* Status ("● ACTIVE") and themes ("water", "education", "public", "events", "impact") are rendered as the same pill size, radius and lime tint, so status and topics read as one row of tags. Theme labels are raw slugs (`opensrc`, `public`, `impact`) in lowercase while the status is uppercase. Refactoring UI p. 38–41: hierarchy comes from de-emphasising, so themes should drop to a quieter tone or plain text, and the slug→label map that the HomeMap already has ("Open Source", "Public Goods") should be reused everywhere.

**Stat tiles.** Chapters index shows "12 CHAPTERS · 12 ACTIVE · 4 REGIONS": the middle tile repeats the first. Library shows "13 BOOKS · 296 episodes PODCAST ARCHIVE · 3 GUILDS · 3 GARDEN GUIDES" where one tile carries its unit inline in lime and the others do not; at 375 the fourth tile wraps to its own line *(seen)*. Refactoring UI p. 94–95 and 118–120: sizing and baseline should be consistent within a row.

**Mono metadata overload.** The 12px JetBrains Mono overline is used for section labels, chip text, card kickers ("FIELD-REPORT · AFRICA · 2025"), bylines ("GREENPILL NETWORK RESEARCH"), image captions ("GREENPILL NIGERIA VIA REGEN HUB"), ramp metadata ("STEP 1 · STAY IN THE LOOP · PUBLIC UPDATES · UNSUBSCRIBE ANYTIME · NO ACCOUNT") and stat units. Refactoring UI p. 132–134: all-caps tracking helps legibility of a *label*, but five-segment all-caps sentences at 12px are body copy in disguise. The DESIGN.md rule ("mono for overlines/technical metadata only") is right; the pages stretch it.

**Line length** (p. 114–116). Story body copy sits in a `md` container (~624px at 1440) and is fine. Two blocks are far outside the 45–75 character range: the Garden step body is 14px text in a `132px 1fr` column with no cap, about 1,116px wide at 1440 (`garden/index.astro:229-235, 305-312`), and a chapter's initiative summary sits in an `auto-fit, minmax(260px, 1fr)` grid, so the single card that 10 of 12 chapters have stretches to about 1,248px (`chapters/[slug].astro:622-626`). Guild mandate text runs uncapped at ~675px (`guilds/[slug].astro:333-338`). Cap prose blocks at `max-inline-size: 65ch` regardless of the grid they sit in; Refactoring UI p. 115 makes exactly this point about mixed-width content.

**Motion.** `DESIGN.md:506` says card hover gets "no translate, no scale, no shadow stack". Cards translate on hover at `library/index.astro:482-484, 568, 851` and `index.astro:707-709`, scale the image at `chapters/index.astro:445-447`, and step the shadow at `library:510`. Not a taste call: the standard is the repo's own.

### 2.6 Consistency and the system (Atomic Design)

**Two pages left the system.** `pages/map/edit.astro:397-452` carries its own copy of the token variables "so the standalone page reads as one system" and then sets `--gp-font-display: Georgia, "Times New Roman", serif` and never loads the web fonts that `GpLayout.astro:58-61` loads. Rendered result *(seen at 375 and 1440)*: bold Georgia headline in white instead of Spectral in gold, Helvetica body, a centred card floating on a gradient with black bands above and below because the page does not fill the viewport. No header, no Site ID, no way home. This is the page a member reaches from the "we've emailed a manage link" flow to edit their own name and location. Krug p. 97 allows a *minimal* header on forms (Site ID + Home), not none; and consistency "gives you instant confirmation you're still in the same site". `pages/map/moderate.astro` does import the tokens and looks like the site, but also has no Site ID or home link and shows a lime focus ring around its `<h1 tabindex="-1">` headings *(seen)* because programmatic focus inherits the global ring. Frost p. 144–146 names the mechanism: once a copy of a pattern stops reflecting the system, it becomes obsolete the day it ships. Fix: a `chrome="minimal"` variant of `GpLayout`, used by both pages; delete the forked token block.

**The pattern library is not in sync with production.** `/design-system` (noindex) describes itself as "A temporary Astro surface for checking the ported HiFi tokens" and shows colour, type, spacing, the `ui/*` primitives and the shell. It does not show any of the organisms the pages actually run on: chapter card, story card, project card, proof card, link row list, stat row, filter pill row, hero blocks, ramp step, CTA strip variants, or the map. Frost's holy grail (p. 159–163) is an environment where changing a pattern updates the library and every page that uses it. Here the pages own their organisms as page-local CSS (see the inventory in 2.6.1), so the library cannot show them. Making `/design-system` official (Frost p. 148–149: make a thing, show it's useful, make it official) means promoting the recurring page-local blocks into `components/` and rendering them there with real content and their empty/forming variants.

**Dead CSS aimed at primitives.** Astro scopes a component's styles by a `data-astro-cid-*` attribute. When a page passes a class into a primitive (`<Text class="gp-chapters-card-summary">`), the class lands on the primitive's element, which carries the primitive's scope id, while the page's rule compiles with the page's scope id. Confirmed in `dist/chapters/index.html`: the element is `<p class="gp-text is-title-lg gp-chapters-card-title" data-astro-cid-jsr45nuq>` and the rule is `.gp-chapters-card-title[data-astro-cid-uyykasaz]`. Rules that therefore never apply: chapter card title and summary (the 3-line clamp, `chapters/index.astro:459-470`), CTA body (`:539-541`); chapter proof value (`chapters/[slug].astro:585-591`) and the impact `.is-hidden` rule (`:673-675`, latent behind a feature flag, but when enabled every state block would show at once); guild `:443-449, 480-482`; stories dek 60ch cap and muted colour (`stories/index.astro:233-236`); garden `.gp-garden-stack` flex, gap and padding (`garden/index.astro:289-294`); two `:global()` rules naming classes no component emits (`library:761 .gp-overline`, `stories/index:342 .gp-body-lg`). This is Frost's "pattern library out of sync" in its most literal form: the page believes it styled the primitive. The fix is a rule, not eleven patches: primitives take their variation through props, and pages never target a primitive's inner element by class.

**Accepted drift.** `scripts/data/ui-source-baseline.tsv` grandfathers 231 standard exceptions: 139 raw design values, 77 hard-coded font sizes, 10 physical side properties, 5 `vh` units. By file: `HomeMap.astro` 55, `library/index.astro` 30, `map/edit.astro` 26, `index.astro` 13, `chapters/[slug].astro` 12. These are known and documented, which is the right posture; the point for this audit is that the three files with the most exceptions are also the three with the most UX findings above, which is Frost's argument for fixing at the system level rather than the page level (p. 145–146).

**HomeMap is an application, not a component.** 7,104 lines in one `.astro` file (586 of frontmatter and template, 3,492 of script, 3,027 of style), 24 buttons, 2 dialogs, 78 event listeners. It contains its own legend, filter chips, list drawer, edit-link form, a four-step walkthrough form with its own place search and coordinate entry, and a theme picker. In Frost's terms it is atoms, molecules, organisms and a template in one file, which is why the theme-chip labels, the email input and the pill buttons inside it diverge from `Chip.astro`, `EmailInput.astro` and `Button.astro`. The HomeMap audit (PRD-739) already carries the P0/P1 plan for its behaviour; this audit adds the structural recommendation: split the walkthrough dialog and the list drawer into their own components before the P1 information-layout redesign, or the redesign will be done inside the same file.

#### 2.6.1 Interface inventory summary

Frost's interface inventory (p. 95–106), run over `packages/website/src`. Full tables in Appendix A.

| Layer | Count | Health |
| --- | --- | --- |
| Primitives in `ui/` | 16 | 3 have **zero production uses** (`CtaStrip`, `ImagePlaceholder`, `RailArrows`); 3 have one (`SectionHeader`, `EmailInput`, `AvatarStack`); `Text`'s `h1` variant is never used; 2 unused imports (`ArrowLink` in `guilds/[slug].astro:7`, `Chip` in `stories/[slug].astro:6`) |
| Page-local re-implementations of those primitives | 15 pattern families | Section header ×8 local classes (while `SectionHeader` is used once); CTA strip ×3 identical copies that stack at 1100 / 720 / 980px (while `CtaStrip` is used 0 times); hero block ×9; stat tiles ×2 with identical declarations; proof tiles ×2 identical; mono uppercase label ×33 local rules; chips ×5; status badges ×3; buttons ×7; inputs ×3; grids ×14 |
| Near-duplicate card classes | 20 | Border alpha varies .24 / .32 / .42, one gold; radius `lg` except one `xl` and one **8px literal**; hovers translate, scale or step the shadow on 6 of them, which `DESIGN.md:506` forbids |
| Scoped-CSS rules that never apply | 11 sites in 7 files | See F20; confirmed against compiled selectors in `dist` |
| Motion tokens | 0 | `DESIGN.md:484-501` specifies duration and easing tokens; `gp-tokens.css` defines none; 39× `cubic-bezier(0.4,0,0.2,1)` and 12× an easing not in the spec |
| Orphaned code | 5 scripts, 2 route dirs | `src/scripts/{dropdown,image-sequence,mobile-menu,modal,parallax}.ts` are imported nowhere; `src/pages/learn/` and `src/pages/projects/` are empty |
| Colour literals matching no token | 5 families | `rgba(2,12,7)` ×10 and `rgba(7,24,15)` ×7 in header, footer, map and edit page; pure white ×3; pure black ×2 |

Reading: the atoms are good and the molecules exist, but pages route around them, so every page grew its own organisms. That is the mechanism behind most of Section 2.5: when the "CTA strip" is three copies, the "section header" is eight, and cards are twenty, hierarchy decisions get made twenty times and land differently.

### 2.7 States

| State | Where | What renders | Assessment |
| --- | --- | --- | --- |
| Loading | home map counts | "12 · 0 · 0" until `/map/state` answers; no skeleton | Hide counts or show "—" until loaded |
| Failed fetch | home map | Silent no-op (`HomeMap.astro:3320`), zeros persist | Show "Live counts unavailable" quietly, keep chapters |
| Empty filter | `/chapters` | "No source-backed chapter records match this filter yet." (`data-chapter-empty`) | Good that it exists; the copy is internal; add a reset |
| Empty filter | home map list | "No visible nodes match these filters." | Good |
| Single-option filter | `/chapters` "ACTIVE · 12" | Toggling it off hides every card | Refactoring UI p. 236: hide filters that cannot do anything |
| Subscribe | `/garden` step 1 | Real `POST /newsletter/subscribe`; "Subscribing… / You are subscribed. / Subscription is unavailable right now." | Good; the one well-rounded form on the site |
| Edit link request | home map "Email me a manage link" | Neutral success copy by design | Good |
| Invalid edit token | `/map/edit` | Terracotta bordered message, but see F2 | Copy fine, chrome not |
| Placeholder imagery | stories without images | Topographic placeholder on every card | All cards identical, so the index has no scan anchors; vary the crop or add a category glyph |
| Forming / dormant chapter | `/chapters/denver` etc. | Same template as an active chapter, with research notes as copy | Needs a dormant variant (2 lines, "This chapter is not currently active", link to Garden) |
| 404 | `/404` | Name, one sentence, three exits | Good |

### 2.8 Forms

**Add yourself to the map** (HomeMap walkthrough). Well structured: 1–4 themes, name, email with a stated private purpose ("used only for future edit links"), tagline with a 72-character counter, place search with a "public community location, not a home address" nudge, a review step. Refactoring UI p. 96–99: the label-above-input spacing is tighter than the between-field spacing, which is correct. Four things to fix *(source)*: the step progress indicator exists in CSS and JS but has no markup, so it never renders (`HomeMap.astro:3356, 3530-3532, 5868-5882`); the dialog auto-closes 700 ms after a successful submit (`:4036`), which takes the success message away before it can be read; Escape and backdrop-click are disabled (`:3701-3709`), so the × is the only exit; and the hero trigger is a JS-only `<button>` with no fallback href, although the content record for it says `/garden` (`index.astro:68, 94`). Also the step-two field set asks for four things plus a place search on one 375px screen, and the walkthrough title is still "Find your people".

**Garden assessment.** Seven fieldsets, five radio pills each. *(seen at 375 and 1440)* Every question legend sits across the top edge of its card, half on the card background and half on the page background, because `.gp-ga-q-legend` styles the text but never resets the fieldset/legend default placement (`GardenAssessment.astro:487-498`). It reads as clipped. Since the July call removed the assessment, the cheapest fix is to remove the block; if it stays, `legend { float: left; padding: 0 }` plus a clearing element, or `display: contents` on the legend, is the standard reset.

**Newsletter (Garden step 1).** Label above input, placeholder as example, status line with `aria-describedby`. Good.

**Moderation (`/map/moderate`).** Approve / Decline with confirm dialogs, optional 500-character private note with counter. Good pattern. Two things: the destructive action ("Decline") and the primary ("Approve") sit as equals; Refactoring UI p. 62 suggests demoting the destructive one to secondary in the row and making it primary only inside its confirm dialog. And the headings-with-focus-ring issue from 2.6.

### 2.9 Mobile (375)

Krug ch. 10: constraints force tradeoffs; the failure mode is deciding those tradeoffs by accident.

- Home: h1 (3 lines) + a 250px map + instruction paragraph + two stacked CTAs before any content. The map at that size shows three pins and a clipped legend *(seen)*; it is decorative, not usable. Consider a static map thumbnail with a "Open the map" action on narrow containers, and move the legend below the canvas.
- Chapters index: stat row + 6 filter pills consume a full screen before the first card *(seen)*.
- Story breadcrumb at 375 truncates the title to "Greenpill Nigeria Water C…" while keeping the raw "field-report" crumb; the middle-crumb collapse rule in `Breadcrumb.astro:112-121` only fires for three or more crumbs.
- Library stat row wraps to two lines with one orphan tile.
- Everything else reflows correctly; `ui:verify` found no overflow and one 88×16px link on `/design-system` under 44px.

### 2.10 Accessibility notes

Not a full audit (axe not installed). From the tree and source:

- Landmarks, skip link, one `<main>`, named navs, labelled inputs, `aria-current` on the active nav item, `aria-pressed` on filter pills, `aria-label` on icon buttons: all present. This is better than most sites.
- `<h1 tabindex="-1">` on the moderation page receives the global focus ring; use `:focus-visible` only for interactive elements or add `outline: none` to programmatic focus targets.
- Theme chips inside the map legend are `<button>`s without `aria-pressed` in the static HTML (the state is added client-side); acceptable, but the map's 16-theme row has no group label at 375 where it scrolls.
- External links open in new tabs inconsistently: guild outputs mark `↗`, footer and chapter links do not.
- Small mono text at 12px in `--gp-fg-dim` on elevated cards is the contrast case DESIGN.md itself warns about; install axe (dev dep, needs your approval per repo policy) so channel 3 can prove it either way.
- **Primary button focus ring may be invisible** *(verify in a browser)*. The global ring lives in `@layer gp-base` as a `box-shadow` (`gp-tokens.css:218-222`); the primary `Button` sets an unlayered `box-shadow: var(--gp-shadow-pill)` (`Button.astro:54`), which by cascade wins over the layered ring while the layered `outline: none` still applies. If that reading holds, a focused primary button looks identical to an unfocused one, on the single most important control on every page.
- The chapters region filter is a `role="radiogroup"` wrapping plain `<button>`s with no `role="radio"` or `aria-checked`; the script toggles a class only (`chapters/index.astro:120-124, 235-241`), so the selected region is not exposed. Use `aria-pressed` like the status pill does, or real radios.
- The mobile menu panel is `max-height: 320px; overflow: hidden` (`SiteHeader.astro:167-168`); fine for four items, a trap the day a fifth is added.

---

## 3. Directus steward admin

**What this section is.** A configuration audit. Everything a steward sees in Data Studio is produced by two scripts, `scripts/directus-studio-setup.ts` (collection and field metadata, bookmarks, project settings) and `scripts/directus-operational-content-setup.ts` (roles, policies, field-level permissions), plus the dynamic assignment policy in `scripts/directus-content-access.ts`. Those scripts, the migrations in `packages/agent/migrations`, and the steward-facing docs (`STEWARD_GUIDE.md`, `STEWARD_SYNC_INVITE.md`, `templates/user-invitation.liquid`) were read line by line. **Nothing here was checked in a live Directus session**: the Brave extension path required by the repo's QA rule is not connected, so live QA is reported as blocked. Items that can only be settled at runtime are marked *[verify live]*.

### 3.1 Verify first *[verify live]*

Every non-admin permission row lists its readable and writable fields explicitly; none uses `*` (`directus-content-access.ts:65-239`, `directus-operational-content-setup.ts:116-177, 442-461`). None of those lists includes the form-group container fields (`group_*`), the one-to-many child-row fields (`chapters.initiatives`, `guilds.projects`, `chapter_update_requests.links`, `chapter_update_requests.proof_signals`). If Directus 11 filters the item form by the permission field list, which is its documented behaviour for fields, then a Steward Editor opens a chapter and sees **no grouped sections and no "Add New" link or proof rows**, which is exactly the path `STEWARD_GUIDE.md:138-141, 190-192` tells them to use instead of raw JSON. A Trusted Publisher would be affected the same way. Log in as the smoke-test steward (`bun run directus:steward:smoke` creates one) and open a chapter and an update request before anything else in this section is acted on.

### 3.2 Trunk test for a first-time steward (Krug ch. 6–7)

| Question | What the configuration gives them | Assessment |
| --- | --- | --- |
| What site is this? | Project name "Greenpill Network Admin", descriptor "Steward CMS" (`studio:1386-1387`); the invite email calls it "Greenpill Network Steward Admin" (`user-invitation.liquid:4`) and then interpolates `{{ projectName }}` in the next sentence, so one email carries two names. No `project_logo`, no `custom_css`, no login note, default appearance (`studio:1385-1393` sets only name, descriptor, url, color, collaboration, MCP flags). | Three names for one product; the Site ID is Directus's, not Greenpill's. The public site is forest green + lime + gold serif; the admin is Directus default light with a `#2F7D32` accent. Refactoring UI p. 20–26: personality is a set of concrete choices, and this set says "some other product". |
| What are the sections? | A Steward Editor sidebar lists Themes, People, Chapters, Chapter Initiatives, Guilds, Projects, Chapter Impact Snapshots, and (once assigned) Chapter Update Requests. No collection has a display name, folder, colour or sort (`studio` sets `translations` only on fields, `:955, 1015`). | The guide says "confirm these collections are visible: Chapters, Chapter Initiatives, Chapter Update Requests" (`STEWARD_GUIDE.md:50-55`); the steward sees eight, ungrouped, three of them read-only reference tables. Krug p. 72: three mindless clicks beat one that requires thought; a sidebar with five decoys is the thought. |
| Where do I start? | No landing page, dashboard or default bookmark. Five Steward bookmarks exist ("My chapter", "Published chapter reference", "My chapter initiatives", "My chapter change requests", "My change request outcomes", `studio:1063-1126`). The guide names three of them; "My chapter" (the one they actually need) is not mentioned in the guide at all; the README still lists a deleted one ("My draft initiatives", `README.md:234-235` vs `studio:1053-1057`). | The best entry point exists and is undocumented. |
| What page am I on? | Item forms open with `slug` as field 1 in all six operational collections (`studio:440, 447, 459, 497, 513, 540`), a key the steward cannot edit (`access:159`). | Krug p. 106: the page name should frame the unique content; here the first thing framed is an immutable identifier. |

### 3.3 Forms (Krug ch. 4 and 11; Refactoring UI p. 48–52, 96–99)

**Raw JSON where a steward is expected to type.** Steward-editable `input-code` JSON fields: on chapters `stewards`, `featured_story`, `impact_sources`, `media`, `seo`; on initiatives `impact_sources`; on guilds `stewards`, `public_members`, `mandate_paragraphs`, `outputs`, `principles`, `media`, `seo` plus `cadence` (a free-text box over a JSON column, `m005:8`); on projects `media`, `seo`; on update requests `requested_changes`. The guide sends alt text and image credit into the `media` JSON (`STEWARD_GUIDE.md:88`), and the pre-created sync drafts put the steward's starter checklist inside `requested_changes` JSON (`directus-steward-sync-prep.ts:130-142`). Krug's goodwill list (p. 208–209): "punishing me for not doing things your way" and "asking me for information you don't really need". A chapter steward should never see `seo`, `impact_sources` or `featured_story`; those are publisher fields. Alt text and credit need two plain fields (the CMS hub already tracks this as open, `plan.todo.md:126`).

**Labels are missing, which is the inverse of the Refactoring UI warning.** Nine fields in the whole schema have a human label (`studio:220-234`); everything else is key-derived: "Theme Slugs", "Chapter Slug", "Steward Slugs", "Featured Weight", "Seo", "Requested Changes", "Sort Order", "Href". The guide calls the picker "Chapter" (`STEWARD_GUIDE.md:185`); the form calls it "Chapter Slug".

**Field order puts the machine before the person.** `slug` first everywhere; on initiatives `slug` and `chapter_slug` precede `title`; in link and proof child rows `sort_order` precedes `label`; `featured_weight` sits inside the "Story" group on chapters and guilds (`studio:165, 198`). Refactoring UI p. 38–41: hierarchy is the tool that makes a form feel designed; a steward scanning for "Summary" passes six technical fields first.

**Required fields with no format guidance.** Slugs ("Set once, then avoid changing" but no allowed characters), `latitude`/`longitude` (no range or decimal guidance; the map-node table has range checks, `m007:107-112`, the chapter table does not, `m004:80-81`), repeater sub-fields `label`, `url`, `value` (required, no note, `studio:752-753, 776-777`). URL validation exists on `primary_link` and request URLs but not on request-link `url`, proof `href`, `guilds.image`, `projects.image`, `people.avatar`. `entity_status` has no note in any collection (`studio:464, 500, 516, 542`).

**Two "Archived" choices.** `entity_status` (Active / Forming / Inactive / Archived) and `publication_status` (Draft / Pending Review / Published / Archived) both offer "Archived" on the same form, with no note distinguishing "the chapter closed" from "unpublish this record". Krug p. 70–76: that is the mailbox labelled *Stamped* and *Metered*.

**Status fields have no colour.** All `labels` displays are configured without display options (`studio:411, 568, 676, 712, 866, 874`), so Draft, Pending Review, Published and Archived render as identical grey pills in list views, and `entity_status` has no display at all so lists show the raw value. Refactoring UI p. 145–147: semantic states are exactly what accent colours are for.

### 3.4 The choice a steward is asked to make

The invite says "suggest updates to public chapter profiles" and "Chapter Update Requests to suggest changes while the public page stays live" (`user-invitation.liquid:8, 26`). The guide's first paragraph says stewards "edit their assigned chapter or guild record directly at any status, including published" (`STEWARD_GUIDE.md:11-12`), then says publishing "remain[s] trusted publisher/operator actions" (`:22-23`), then "You can publish your own initiative directly" (`:196`). The collection notes say "Stewards can edit assigned draft or review-ready records" (`studio:31, 46`); the role description says "draft operational content editing" (`setup:1400`); the actual policy allows update at draft, pending review *and* published (`access:36, 622-639`) and allows creating an initiative or project directly as published (`access:649-659, 766-774`).

So the steward's first real decision, edit the live record or open a request, is described five different ways across the surfaces they will read in their first ten minutes. Krug p. 72: the cost is not the click, it is the uncertainty. Pick the model the code enforces (direct edit is the default; requests are for review-worthy changes), write it once, and make every other surface quote it.

### 3.5 Feedback loop (Krug goodwill: "tell me what I want to know")

| Steward action | What they are told | Gap |
| --- | --- | --- |
| Save a direct edit | Directus default toast | Nothing says when it reaches the site. The agent sweeps every 60 s and rebuilds at most every 5 min with an hourly fallback (`server.ts:146-156`, `content-operations.ts:107-188`, `github-pages.yml:17-22`). A "last published to the website at …" readout on the chapter form, or in a steward-visible `publish_health` view, would close this. |
| Set a request to Pending Review | Nothing | Reviewer email goes to an env list, not to Trusted Publisher members (`content-operations.ts:84, 712-720`), and is skipped silently if the list is empty. |
| Request decided | Email "Your Greenpill chapter update request was reviewed … was marked "needs_changes"" (`content-operations.ts:556`) | Raw status value in the sentence. Pre-created sync drafts are created by the admin client, so their `created_by` is the admin and the decision email goes to the admin, not the steward (`directus-steward-sync-prep.ts:213, 233-234`) *[verify live]*. |
| Set an initiative to Pending Review | Nothing, ever | There is no "initiative decided" notification type. |
| Preview | `preview_url` on chapters and requests only, both pointing at production `/chapters/{slug}` (`studio:33, 82`) | Unpublished chapters preview to a page that is not built; a request previews the *current* chapter, which the guide admits (`STEWARD_GUIDE.md:173-176`). No preview for initiatives, guilds or projects although guild pages exist. |
| Accepted request | The guide says accepting "applies the proposed summary … automatically" (`:163-165`) | The same guide (`:174-176`), the README (`:215-216`) and the sync invite (`:41`) still say a publisher applies changes by hand. The trigger does it (`m024:81-165`). |

### 3.6 Vocabulary (Frost: naming is the design system)

The interface inventory exercise in *Atomic Design* (p. 104) exists largely to surface "we call that the utility bar / the admin nav / the floating action area". The same pattern is visible across site, admin and docs:

| Concept | Names in use |
| --- | --- |
| The product | Greenpill Network Steward Admin · Greenpill Network Admin · Steward CMS · private Greenpill Directus admin · private Directus workspace |
| A reviewer | trusted publisher · Reviewer · Network steward · Publisher · operator; the code sends to `CONTENT_REVIEW_RECIPIENTS` |
| A steward's proposal | Chapter Update Requests (collection) · change requests (bookmarks) · update request (emails) · "Update request pending" (label) |
| Saying yes | Published (content) · Accepted (requests) · Approved (map nodes) · "trusted publishers approve content" (guide) |
| Saying no | Declined (requests) · Rejected (map nodes in Directus) · "Decline node" (the public `/map/moderate` page for the same record) |
| A link's type | External / Website / Social / Chat / Docs (direct-edit repeater) · website, social, event, program, contact (request note) · `"kind": "program"` (guide example) |
| A chapter | Chapter (admin, everywhere) · "local nodes" and "local hubs" (website chapters hero) · "Hub" also means the Regen Coordination forum in the footer |
| A chapter's image | upload a file (guide) · "Public image URL" (sync invite) · `proposed_image` URL (request) · written to the hidden "Legacy image URL" on accept (`m024:139-142`) |

### 3.7 Governance and truth

- Two scripts write the same field metadata in sequence: `content:setup` creates the request `links`/`proof_signals` fields at sort 20/21 with one note, `studio:setup` overwrites them at 11/12 with another (`setup:1952-1976` vs `studio:558-607`). One owner per field, please.
- `directus-studio-setup.ts` merges into existing metadata rather than replacing it (`:1234-1260`), so production may carry manual edits the repo cannot see *[verify live]*.
- The CMS hub marks "Module bar + branding" done (`.plans/active/directus-cms-advancement/plan.todo.md:145-146`); only `project_name` and `project_color` are in code. It marks "unhide chapter/guild_editor_assignments for Trusted Publisher" done (`:102-105`); both are still `hidden: true` (`studio:60, 67`). Since `.plans` is the execution truth for this repo, both rows should be reopened.
- No bookmarks exist for guild stewards, projects or people, although the guide is addressed to "chapter and guild stewards".

### 3.8 Admin recommendations

**P0**

- A1. Run 3.1 in an authenticated steward session. If grouped sections or repeaters are hidden, add the `group_*` and child-row fields to the Steward Editor and Trusted Publisher field lists.
- A2. Take raw JSON off the steward surface: hide `seo`, `impact_sources`, `featured_story`, `media` from Steward Editor (keep for Trusted Publisher), add `image_alt` and `image_credit` as plain fields, and stop the sync-prep script from writing checklists into `requested_changes`.
- A3. One name, one Site ID: set `project_logo`, `default_appearance`, a login note and `custom_css` for the brand colours; make the invite template use `{{ projectName }}` only; give the sender a display name; use the same name in guide, invite and settings.
- A4. Labels and order: label every steward-facing field in plain words ("Chapter", "Themes", "Related chapters", "Featured order"), add an `entity_status` note ("Is the chapter running? This is separate from whether the record is published."), move `slug`, `featured_weight` and the workflow block to the bottom, add format notes to lat/long and slugs.

**P1**

- A5. Landing and sidebar: fold reference collections (Themes, People, Impact Snapshots) into a "Reference" folder, put Chapters / Initiatives / Update Requests first, and make "My chapter" the documented first click.
- A6. Feedback: a steward-visible "last published to greenpill.network" timestamp; an initiative-decided email; reviewer email to the Trusted Publisher role rather than an env list; human status words in decision emails; sync-prep drafts created as the steward.
- A7. Vocabulary: one word for the proposal ("update request"), one pair for decisions (Approve / Decline everywhere, including the map), one link-kind list shared by both repeaters and the guide, `entity_status` labels shared with the site.
- A8. Colour the status pills (Draft muted, Pending Review gold, Published lime, Needs Changes terracotta, Archived dim) using the same semantic tokens the site uses, so the two surfaces feel like one system.

**P2**

- A9. Reconcile the CMS hub rows named in 3.7, fix the README bookmark list, and add a "who owns which field metadata" line to the admin README.

---

## 4. Atomic Design health check

Frost's five stages, applied to this codebase:

| Stage | Where it lives | State |
| --- | --- | --- |
| Atoms | `gp-tokens.css`; `ui/Button`, `Chip`, `StatusChip`, `Text`, `Overline`, `Avatar`, `EmailInput` | Solid. Tokens are complete (9 space steps, 5 radii, fluid type). The one gap is that `Chip` and `StatusChip` converge visually (2.5). |
| Molecules | `ui/Card`, `LinkRow`, `Meta`, `SectionHeader`, `CtaStrip`, `AvatarStack`, `RailArrows`, `ImagePlaceholder` | Present but under-used; pages re-implement most of them (Appendix A). |
| Organisms | `shell/SiteHeader`, `SiteFooter`, `Breadcrumb`; `page-sections/HomeMap`, `GardenAssessment` | Two organisms are page-level applications. The recurring page organisms (entity hero, card grid, proof block, stat row, filter row, ramp step) are not components. |
| Templates | `GpLayout` + each page file | Pages *are* the templates. There is no chapter template that a forming or dormant chapter can vary; Frost p. 49–55 says templates should articulate content structure and its variations (40 vs 340 characters, empty vs full). |
| Pages | 47 built routes | Real content is in place, which is exactly the stage that exposes the template gaps above (research notes as summaries, orphan dormant chapters). |

Removal (Frost p. 158): five scripts under `src/scripts/` are imported by nothing (`parallax.ts` targets a class that no longer exists, and the `.gp-background-parallax` element in `GpLayout.astro:69` has no script driving it); `src/pages/learn/` and `src/pages/projects/` are empty directories; three primitives have no production caller. Deprecate or delete, so the library shows what production uses.

Governance (Frost p. 155–158): there is no stated answer to "what happens when an existing pattern doesn't fit" other than writing page-local CSS, which is how the 231-line baseline grew. A one-paragraph rule in `DESIGN.md` ("if you need a card variant, add a prop to `Card`; if you need a new organism, add it under `page-sections/` and show it on `/design-system`") plus a `ui:check` warning for new page-local `.gp-*-card` classes would close the loop.

---

## 5. Status of earlier decisions

Cross-check of the 2026-07-17 call decisions (`docs/design/claude-design-wireframe-prompts.md`, appendix) and the HomeMap audit (PRD-739) against the current build.

| Decision | Status on `main` | Evidence |
| --- | --- | --- |
| "Join the map" replaces "Find your people" as the walkthrough trigger | **Open** | `index.astro:68`, `HomeMap.astro:3529` |
| Hide Knowledge Map + Toolkit tiles on home | **Open** | both render; toolkit CTA is non-clickable |
| Standalone Guilds section on home; Guilds in primary nav; new `/guilds` page | **Open** | guilds live inside the Library bento; nav has 4 items |
| Ecosystem in categorised rows (9 partners + tools row) | **Open** | one 8-tile grid |
| Garden: Regen Assessment removed, steps renumbered, "friction" labels reframed | **Open** | assessment renders on `/garden` and as ramp card 03 on home; "Lowest friction … Highest friction" labels present |
| Footer: Farcaster rename, LinkedIn, YouTube, Luma, Code of Conduct, Guilds | **Partial** | "Warpcast" still; no CoC/YouTube/Luma |
| Map fills its container (ThinkPad sizing) | Not re-verified here (needs a 1366×641 render) | HomeMap audit P0 |
| Map: reset affordance + empty state for filters | **Done** for the list drawer ("No visible nodes match these filters."); legend reset not seen | `HomeMap.astro:2491` |
| Guild page: key links in hero, active projects only, Hats tree as list, bigger body type | **Open** | `guilds/[slug].astro` unchanged in shape |
| Library: GP-written four lead, podcast by season, guilds tile removed | **Open** | 13-book numbered shelf; guild cards present |

None of these is a new finding; they are listed so this audit does not re-derive them and so the next implementation pass can treat Section 1 and Section 5 as one queue.

---

## 6. Recommended sequence

Read-only recommendations. No code was changed in this pass.

**P0 — trust (one content pass + two page fixes)**

1. Add an internal-notes gate to the publish pipeline: a `content:snapshot` check that fails on the vocabulary in 2.4, plus a private notes field in Directus so stewards have somewhere to put those sentences. Then rewrite the 10 chapter rows flagged in the snapshot (`california`, `cape-town`, `c-te-d-ivoire`, `denver`, `dominican-republic`, `germany`, `kenya`, `ottawa`, `uganda`, `uncommons`), the 9 story pages whose body or dek carries "research artifact" / "launch-safe" language, and the "Source-backed seed copy" byline on all 17 story pages. *(content lane)*
2. Route `/map/edit` and `/map/moderate` through `GpLayout` with a minimal-chrome variant (Site ID + Home); delete the forked token block in `edit.astro:397-452`. *(ui lane, small)*
3. Home hero: replace the motto with a tagline + one-sentence welcome blurb (the meta description already has it), rename the trigger to "Join the map", make "Browse chapters" the visible way to *find* people, and hide zero counts until `/map/state` resolves. *(ui + content, already decided in July)*
4. Chapter/guild heroes: one primary button whose label names the destination ("Water Cup updates on Regen Hub"), drop "Workspace". *(ui, small)*

**P1 — hierarchy and IA**

5. Guilds: one parent everywhere; add to primary nav (decided). Fix the four footer mismatches.
6. Section headers: overline + optional one-line caption, no counts, no IDs; merge "Sources" and "Proof links" on stories; merge "Public links" and "Connect" on chapters.
7. Chips: theme chips quieter (`tone="soft"`/plain text) with human labels from the existing slug map; status chip keeps the dot.
8. Page names: make the section name the h1 ("Chapters", "Library", "Stories") and demote the taglines to deks, or keep the taglines but make the overline a real page name at label size in body font.
9. Garden: remove the assessment (decided) or fix the legend reset; reframe ramp labels.
10. Story template: category label from a slug→label map, real author or no byline block, no "seed copy".
11. Dormant/forming chapter template variant; decide whether the six orphan routes should redirect to `/chapters`.
12. Fix the dead scoped CSS (F20) by moving those variations into primitive props, and the small leaks in F21 (pluralisation, `href="#"` fallbacks, date and slug formatting through one `formatMeta` helper). Verify the primary-button focus ring in a browser and fix the cascade if it is suppressed.
13. Walkthrough: render the progress indicator, keep the success step open until dismissed, allow Escape, give the trigger a fallback href.

**P2 — system**

14. Promote the recurring page organisms into `components/page-sections/` (start with the three that already have identical copies: CTA strip → `CtaStrip`, section header → `SectionHeader`, stat and proof tiles → new `StatRow` / `ProofTile`) and render them on `/design-system` with real content and variants; rename that page from "temporary" to the pattern library it is. Add the motion tokens `DESIGN.md` already specifies.
15. Split `HomeMap.astro` into map canvas, legend/filter, list drawer, and join-walkthrough components before the P1 map redesign.
16. Install axe-core (approval required) so the contrast channel proves the `--gp-fg-dim` rule; add a `ui:check` warning for new page-local card classes and for page rules that target a primitive's inner class. Delete the five orphaned scripts and two empty route directories.

**Do this once, cheaply (Krug ch. 9, p. 141–173):** one morning, three people who have never seen the site, three tasks — "find a chapter near you", "figure out what Greenpill is in 30 seconds", "add yourself to the map". The findings above predict where they will stall; a live test will rank them.

---

## Appendix A. Component and pattern inventory

Condensed from the read-only inventory of `packages/website/src` (every `ui/`, `shell/`, `page-sections/` component, `GpLayout`, all pages). "Production" excludes `/design-system`. Citations are `file:line` under `packages/website/src`.

### A.1 Primitive usage

| Component | Variants defined | Production use | Notes |
| --- | --- | --- | --- |
| `ui/Text` | display, h1, h2, h3, title-lg, title-md, body-lg, body, body-sm, caption, mono | 150 tags | `h1` variant never used; `mono` size is an 11px literal (`Text.astro:128`), no token |
| `ui/Overline` | tone primary/muted/dim; `segments`; `as` | 47 tags | `as` never used (always a `<div>`); `segments` used in 2 places, so pages hand-build "A · B" strings without per-segment `nowrap` |
| `ui/Container` | md/lg/xl/2xl, bleed | 43 tags | 38 are `2xl`; default `xl` and `bleed` never used |
| `ui/Button` | primary/ghost, fullWidth | 31 tags in 9 files | `fullWidth` never used; garden shows 3 primaries on one page |
| `ui/ArrowLink` | tone primary/secondary/muted, size sm/md | 17 tags in 5 files | 7 uses have no `href` and render as arrow-less muted text (`index.astro:130, 247, 259, 270`, `stories/index:118, 146`, `stories/[slug]:208`); unused import in `guilds/[slug].astro:7` |
| `ui/Meta` | items, accentIndex | 14 tags | prints raw dates and slugs (F21) |
| `ui/Card` | default/elevated, padded md/lg | 11 tags in 5 files | 20 page-local card classes exist alongside it (A.3) |
| `ui/Chip` | outline/soft-lime/soft-gold/fill-lime, sm/md/lg, mono, active, href, as | **3 tags**, all `soft-lime` spans | interactive modes and other tones appear only on `/design-system`; unused import in `stories/[slug].astro:6` |
| `ui/StatusChip` | primary/secondary, sm/lg | 2 tags | `lg` unused |
| `ui/LinkRow` | glyph, shape circle/pill, last | 3 sites | `glyph`, `shape` unused |
| `ui/Avatar` | sizes 32–96 | 2 sites + AvatarStack | |
| `ui/AvatarStack` | names, count, extra, size | **1 site** (`chapters/index:171`) | defaults to four placeholder names |
| `ui/SectionHeader` | overline, segments, title, side slot | **1 site** (`garden:93`) | 8 page-local section-header classes exist (A.2); no dek slot |
| `ui/EmailInput` | label, placeholder, autocomplete… | **1 site** (`garden:112`) | only a `:focus` state, no error state (`EmailInput.astro:64-66`) |
| `ui/CtaStrip` | lift/soft | **0** | 3 identical page-local copies exist |
| `ui/ImagePlaceholder` | label, ratio, height | **0** | `DESIGN.md:563-566` calls for it on detail heroes |
| `ui/RailArrows` | none | **0** | buttons have no script |
| `shell/Breadcrumb` | back, crumbs | 3 pages | middle-crumb collapse only for ≥3 crumbs |
| `shell/SiteHeader` | activeNav | GpLayout | sticky, `background: none`, hover = active underline |
| `shell/SiteFooter` | none | GpLayout | hard-coded links; column headings are `<div>`s |
| `page-sections/GardenAssessment` | stewardCallHref | 1 site | |
| `page-sections/HomeMap` | none | 1 site | 7,104 lines |
| `layouts/GpLayout` | title, description, ogImage, canonicalPath, activeNav, noindex, hideShell, backgroundMode, ogType | 10 pages | `hideShell` never passed; `/map/edit` and `/map/moderate` do not use it; `#main-content` is a `<div>`, each page supplies its own `<main>` |

### A.2 Duplicated pattern families

| Pattern | Local implementations | Primitive it should use | Divergence |
| --- | --- | --- | --- |
| Section header (overline + h2 + dek + side link) | `.gp-home-section-head` ×3 (`index:103, 156, 310`), `.gp-library-section-head` ×4 (`library:164-311`), `.gp-home-eco-intro` (`index:287`) | `SectionHeader` (needs a dek slot) | copy max 640 vs 720px; stack breakpoints differ |
| Section label without h2 | `.gp-chapter-section-head` ×7, `.gp-guild-section-head` ×5, `.gp-stories-section-head` ×2, `.gp-story-section-head` ×2 | `SectionHeader` / `Overline as="h2"` | same flex rule four times |
| CTA strip | `chapters/index:191`, `chapters/[slug]:372`, `guilds:235` (CSS identical) | `CtaStrip` | stack at 1100 / 720 / 980px |
| Hero block | 9 copies (`index`, `chapters`, `chapters/[slug]`, `guilds`, `stories`, `stories/[slug]`, `library`, `garden`, `404`) | none exists | 5 re-declare the display font-size with line-height 1.02/1.04 vs the 1.05 token; 9 apply `gp-topo`, a no-op class |
| Stat tiles | `.gp-chapters-stat*` and `.gp-library-stat*` (identical declarations), `.gp-chapter-impact-stats` | none | impact values use a 28px literal |
| Proof tiles | `.gp-chapter-proof` and `.gp-guild-proof` (identical), `.gp-story-proof-row` | `Card` | story version has no background |
| Chips / pills | `.gp-chapters-pill` (36px), `.gp-story-related-chip` (30px, no coarse-pointer bump), `.gp-library-garden-topics span`, moderate `.theme-chip`, HomeMap chips | `Chip` | active state solid lime vs spec soft-lime |
| Status badges | `.gp-home-soon-pill`, `.gp-library-status`, Overline "Guild · status" | `StatusChip` | 10px mono, no dot |
| Mono uppercase label | 33 local rules incl. `.gp-footer-heading` | `Text mono` / `Overline` | 10–11px literals |
| Buttons | GardenAssessment reset (44px), moderate `.button`, edit-page buttons, 5 HomeMap button styles | `Button` (48px) | heights 40/44/48, radius md vs pill |
| Inputs | HomeMap inputs (radius md), edit page (8px), moderate textarea | `EmailInput` (pill) | |
| Grids | `clamp(14px,1.5vw,20px)` gap ×7; `minmax(220px,1fr)` ×5; `minmax(260px,1fr)` ×2 | none | `DESIGN.md:550` specifies `gap: spacing.xl` |
| Rails | library book rail: scroll-snap + mask, no controls | `RailArrows` | |
| Link rows | library episode rows, HomeMap list rows, moderate `dl` rows | `LinkRow` | |
| Empty states | `index:137-149`, `stories/index:80-93`, `chapters/index:182-184`, `HomeMap:2488-2491` | none (spec at `DESIGN.md:623-632`) | four different treatments |

### A.3 Near-duplicate card classes (20)

Baseline unless noted: 1px `--gp-border-soft`, background `--gp-card`, hover `--gp-card-elev`.

| Class | File | Padding | Radius | Border / hover deviation |
| --- | --- | --- | --- | --- |
| `Card` (primitive) | `ui/Card.astro` | lg / xl | lg | no hover |
| `.gp-home-story` | `index:445` | clamp(lg,2vw,xl) | lg | lime .32; custom easing |
| `.gp-home-lib-tile` | `index:614` | clamp(lg,2vw,xl) | lg | lime .32 on `a` only |
| `.gp-home-eco-tile` | `index:815` | sm/md | lg | lime .42; min-height 92px |
| `.gp-home-garden-card` | `index:880` | clamp(lg,2vw,xl) | lg | no hover; min-height 260px |
| `.gp-chapters-card` | `chapters/index:407` | 0 (body lg) | lg | lime .32; **image scale(1.02)**; arrow translateX |
| `.gp-chapter-proof` / `.gp-guild-proof` | `chapters/[slug]:567` / `guilds:425` | lg | lg | lime .42 |
| `.gp-chapter-initiative` | `chapters/[slug]:628` | lg | lg | lime .32 |
| `.gp-chapter-related-card`, `.gp-guild-output`, `.gp-guild-project`, `.gp-story-continue` | various | lg | lg | lime .32 |
| `.gp-chapter-steward-card` | `chapters/[slug]:599` | md | **8px literal** | no hover |
| `.gp-guild-principle-list li` | `guilds:349` | md | md | no hover |
| `.gp-story-proof-row` | `stories/[slug]:375` | md | md | no background |
| `.gp-stories-card` | `stories/index:360` | clamp(lg,2vw,xl) | lg | translucent bg + blur |
| `.gp-stories-feature` | `stories/index:273` | clamp(xl,3vw,3xl) | **xl** | translucent bg |
| `.gp-library-guild-card` | `library:834` | xl | lg | lime .24 gradient; **translateY(-2px)** |
| `.gp-library-garden-card` | `library:699` | xl | lg | **gold** .22/.34 |
| `.gp-library-podcast-feature` | `library:549` | md | lg | hover on a non-link `<article>`; **translateY(-2px)** |
| `.gp-library-book-cover` | `library:493` | 10px | md | gold .14; shadow steps up on hover |
| `.gp-ga-q` | `GardenAssessment:478` | lg | lg | legend not reset (2.8) |

Class families also split by number: `gp-chapters-*` (index) vs `gp-chapter-*` (detail), `gp-stories-*` vs `gp-story-*`.

### A.4 Token discipline by file

Columns: colour literals (hex / rgba), px font-size declarations out of all font-size declarations, px spacing declarations (in brackets, declarations using `--gp-space-*`), `!important`.

| File | hex | rgba | px font-size | px spacing | !important |
| --- | --- | --- | --- | --- | --- |
| `page-sections/HomeMap` | 5 | 29 | 25 / 69 | **171** (8) | 5 |
| `pages/library/index` | 2 | 23 | 9 / 11 | 13 (34) | 0 |
| `pages/map/edit` | 6 | 18 | 0 / 7 | rem + local vars | 1 |
| `pages/index` | 0 | 10 | 4 / 6 | 16 (30) | 0 |
| `pages/stories/index` | 0 | 10 | 0 / 1 | 5 (15) | 0 |
| `pages/map/moderate` | 0 | 0 | 0 / 7 | 10 (0) | 2 |
| `pages/chapters/[slug]` | 0 | 8 | 5 / 7 | 9 (27) | 0 |
| `pages/chapters/index` | 0 | 7 | 3 / 5 | 8 (17) | 0 |
| `pages/guilds/[slug]` | 0 | 5 | 1 / 3 | 5 (25) | 0 |
| `pages/stories/[slug]` | 0 | 5 | 2 / 5 | 5 (19) | 0 |
| `pages/garden/index` | 0 | 3 | 3 / 4 | 2 (10) | 0 |
| `ui/*` combined | 0 | 18 | 18 | 17 (5) | 0 |
| `shell/*` combined | 0 | 3 | 5 | 6 | 0 |

Site-wide: 77 px font-size declarations (11px ×24, 13px ×12, 10px ×10, 12px ×8, 18px ×5, …), 61 of them values with no fixed token. The story body text is a 17px literal (`stories/[slug].astro:300`). No viewport `@media` inside `#main-content` (the standard holds there). `!important` only in reduced-motion and `[hidden]` rules. rgba literals that match a token: lime-500 ×51, gold-500 ×20, off-white ×13, green-900 ×10, green-800 ×9; that match none: `2,12,7` ×10, `7,24,15` ×7, pure white ×3, pure black ×2, five HomeMap-only greens.

### A.5 Content facts the templates were tested against

18 chapters (12 indexed and active; 6 `noindex`: california, india, uganda, uncommons inactive; denver, dominican-republic forming), 3 guilds (2 with public pages), 9 projects, 18 published stories with images, 13 books with images. The `chapters-index.json` content record defines `searchPlaceholder`, `regionLabel` and `statusLabel` that no page renders; the content model anticipated a search control the template never got.

## Appendix B. Evidence

- Rendered screenshots: `packages/website/.ui-verify/<route>@{375,1024,1440}.png`, report at `packages/website/.ui-verify/report.json` (generated 2026-09-24T16:01Z from the 2026-08-11 `dist`). These are local and gitignored; regenerate them with `bun run ui:verify` once dependencies are installed.
- Build note: dependencies are not installed in the checkout this audit ran in. `bun run ui:verify` fails at `build:packages` (`node_modules/@typescript/native/bin/tsc` not found, exit 127) and `astro build` fails the same way (`astro: command not found`). Run `bun install --frozen-lockfile` before the next verify run; under the repo's supply-chain rule that install needs explicit approval.
- Books: `Don't Make Me Think` (3rd ed.), `Refactoring UI`, `Atomic Design`; page numbers are PDF pages of the supplied files.
- Trunk-test transcripts were produced by a throwaway HTML extractor over `packages/website/dist` and are not committed.
