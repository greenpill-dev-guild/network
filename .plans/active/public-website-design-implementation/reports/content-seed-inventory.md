# Step 3.5 Content Seed Inventory

## Purpose

This report grounds the public website design implementation in source-backed content before any HiFi page build begins. The HiFi package is treated as a field-shape reference only. Its mock people, counts, stories, events, and impact stats were not used as publication facts.

Primary source inventory: `/Users/afo/Downloads/Greenpill Content Research.md`, the Claude deep research artifact supplied for this pass.

Publication boundary:

- Confirmed public facts can be rendered as page content when the cited public source remains available.
- Inferred narrative copy can be used as positioning, but not as a metric or evidence claim.
- Internal Drive references from the research artifact (`I001` through `I010`) are not publication sources. They may explain direction, but they must not be linked or quoted on the public website without explicit steward approval.

## Seed Targets

| Surface | Seeded entries | Primary sources | Steward review |
|---|---:|---|---|
| Home singleton | 1 | S001, S006, S007, S013, S044, S045 | Review final hero promise and whether the 293 episode count should be refreshed before launch. |
| Garden singleton | 1 | S042, S045 | Review onboarding copy if any private Garden Guide language is later added. |
| Chapters index singleton | 1 | S003, S015-S039, S051-S054 | Review inactive/forming display policy for California, Cape Town, Denver, and Dominican Republic. |
| Library singleton | 1 | S001, S004-S006, S037, S043, S044, S047 | Review featured podcast/resource ordering. |
| Stories index singleton | 1 | S015-S018, S021-S022, S033, S042-S043 | Public story refs stay empty until draft stories are steward-approved and published. |
| Themes | 16 new public map themes | HiFi `map-themes.jsx`, shared `PUBLIC_MAP_THEMES` | Confirm final label/icon vocabulary during page implementation. |
| Chapters | 18 chapter records updated | S015-S041, S051-S054 | California, Cape Town, Denver, Dominican Republic, Kenya, and Cote d'Ivoire need review notes below. |
| Guilds | 2 guild records updated | S005, S008, S012, S013 | Confirm public roster/cadence before launch. |
| Projects | 10 project records updated/added | S008-S013, S042-S044, S047 | Confirm project status labels and whether Octant/public funding copy should be shown. |
| Books | 5 core book records enriched | S001, existing public book assets | Review library grouping and featured weights. |
| Resources | 9 resource records added | S004-S007, S013, S037, S042-S044, S047 | Podcast episode metadata should be checked before launch if displayed as exact. |
| Stories | 10 story records added as `draft` | S015-S018, S021-S022, S033, S042-S043 | Draft stories are reviewable in Keystatic but filtered from public story routes and public refs until steward-approved. |
| People | 8 public people records added | S005, S006, S013, S036-S037, public episode/resource context | Public-only roster; no private contact info included. |
| Runtime fixture | 4 public map nodes, 1 impact cache snapshot | S015-S018, S021, S033, S036-S038, S046 | Apply only to intended Postgres target after migrations. |

## Confirmed Public Facts

| Fact or copy block | Intended page/collection | Seeded location | Source references | Publication note |
|---|---|---|---|---|
| Greenpill podcast is a public Greenpill media source with 293 episodes in the supplied research snapshot. | Home, Library, `resources`, `projects` | `home-page`, `resources/greenpill-podcast.json`, `projects/greenpill-podcast.json` | S006: https://podcasts.apple.com/us/podcast/greenpill/id1609313639 | Refresh count before launch if rendered as a precise metric. |
| Greenpill Network has a public Luma network used for weekly/community calls. | Home, Garden, Library | `home-page`, `garden`, `resources/greenpill-network-luma.json` | S007: https://luma.com/greenpill-network | Safe as public link. |
| Greenpill Dev Guild has a public GitHub org and Paragraph publication. | Home, Guild detail, Library | `guilds/dev-guild.json`, `resources/trailblazers-octant-ep4-gpdg.json` | S005: https://paragraph.com/@greenpilldevguild, S008: https://github.com/greenpill-dev-guild | Safe public organization links. |
| Greenpill Dev Guild received a 2.5 ETH Octant Community Fund grant according to Crypto Altruists. | Home proof signal, Dev Guild detail, Library resource | `home-page`, `guilds/dev-guild.json`, `resources/trailblazers-octant-ep4-gpdg.json` | S013: https://www.cryptoaltruists.com/blog/trailblazers-of-octant-episode-4-greenpill-dev-guild-scaling-the-regen-movement-with-web3-coordination-tools | Safe public claim, but avoid implying current funding status. |
| Public Octant forum proposal describes a Dev Guild request with Green Goods development and Rio Claro pilot framing. | Dev Guild detail, Green Goods project | `guilds/dev-guild.json`, `projects/green-goods.json` | S012: https://discuss.octant.app/t/greenpill-dev-guild-regeneration-through-collaboration/456 | Review exact budget language before prominent publication. |
| Green Goods has public GitHub and docs, and is framed as public-goods impact tooling. | Project, Guild detail, Library | `projects/green-goods.json`, `resources/green-goods-docs.json` | S009: https://github.com/greenpill-dev-guild/green-goods, S047: https://docs.greengoods.app/community/why-we-build | Do not expose raw EAS/work media feedback. |
| Greenpill Nigeria has public Water Cup, 10-week ReFi education, Awka Ethereum-at-10, and Hypercert references. | Chapters, Stories, map fixture | `chapters/nigeria.json`, three story entries, `public-content-seed.json` | S015, S016, S017, S046, S051 | Safe public facts; story drafts still need editorial signoff. |
| Greenpill Brasil has Regen Hub, KarmaGAP, Gitcoin, and Luma event references. | Chapters, Stories, impact fixture | `chapters/brasil.json`, `stories/greenpill-brasil-gg20-climate-milestones.json`, `public-content-seed.json` | S018: https://www.karmahq.xyz/project/greenpill-brasil, S019, S020, S021 | Karma milestones are seeded as impact cache fixture; meeting-hour claims withheld. |
| GreenSofa / Greenpill Taiwan has public HackMD, Giveth, dashboard, and X references. | Chapters, Stories | `chapters/greensofa.json`, `stories/greensofa-taiwan-public-goods-tooling.json` | S025, S026, S052, S058 | Funding amounts from receipts are noted in content but should be steward-reviewed before hero placement. |
| Greenpill Koh Phangan has public Giveth, Crypto Altruism episode, Ethereum-at-10, and X references. | Chapters, Stories, Library | `chapters/koh-pha-ngan.json`, `resources/crypto-altruism-ep138-refi-phangan.json`, `public-content-seed.json` | S036, S037, S038, S053 | Safe public links; no private community data seeded. |
| Greenpill NYC has Regen Hub, Luma, and X references. | Chapters | `chapters/new-york-city.json` | S028, S029, S030 | Social follower/post counts not seeded as page metrics. |
| Greenpill London Ontario has a public TechAlliance event listing. | Chapters, Stories, map fixture | `chapters/london-ontario.json`, `stories/vibe-coding-good-london-ontario.json`, `public-content-seed.json` | S033: https://www.techalliance.ca/news/events/vibe-coding-for-good-a-collaborative-build-night-reimagine-co-presented-by-greenpill-london-ontario/ | Single-source chapter profile; review before heavy promotion. |
| Greenpill Cote d'Ivoire has a public La Ligne Verte / Green Mission thread. | Chapters, Stories | `chapters/c-te-d-ivoire.json`, `stories/greenpill-cote-divoire-la-ligne-verte.json` | S022: https://hub.regencoordination.xyz/t/greenpill-civ-chapter-update-the-beginning-of-la-ligne-verte/333 | Targets are goals, not delivered metrics. |
| Greenpill Germany has a public X reference. | Chapters | `chapters/germany.json` | S035 | The previously listed website failed link checks and was removed from launch proof until refreshed. |
| Greenpill Kenya has a public Gitcoin/Octant community round reference. | Chapters | `chapters/kenya.json` | S039 | Event year/local anchor need steward confirmation. |
| Greenpill Toronto has public website/Consensus sponsor evidence. | Chapters | `chapters/toronto.json` | S032 | No dedicated social handle found. |
| Greenpill Ottawa has a public X reference. | Chapters | `chapters/ottawa.json` | S031 | Thin source; needs richer public backfill. |
| Uncommons is the renamed prior GreenPill CN surface with public Hub, website, and X references. | Chapters | `chapters/uncommons.json` | S023, S050 | xLog failed link checks and was removed from launch proof; $100k+ creator funding claim remains withheld pending cross-check. |
| Greenpill Garden Season One and the Network Onboarding Revamp have public Regen Hub references. | Garden, Stories, Projects, Resources | `garden`, `projects/greenpill-garden.json`, `stories/greenpill-garden-season-one.json` | S042, S045 | Internal Garden Guide content was not seeded. |
| Growing the Greenpill Impact Framework and Website Revamp have public Regen Hub references. | Home, Library, Stories, Projects | `projects/greenpill-impact-framework.json`, `projects/greenpill-v2-website.json`, stories/resources | S043, S044 | Avoid internal Drive framework claims unless publicly mirrored. |

## Inferred Narrative Copy

| Narrative copy | Intended surfaces | Basis | Guardrail |
|---|---|---|---|
| "A global regenerative network" and "local chapters, guilds, and public-good tools" | Home hero, Chapters, Garden | Pattern across S001, S003, S007, S008, S042-S045 | Positioning copy only; not a count or governance claim. |
| "Start with the Garden, then find chapters, stories, and tools" | Home, Garden onboarding | S042 and S045 public onboarding direction | Do not imply private Garden assessment data is public. |
| "The Library is a knowledge commons for public-goods builders" | Library | S004-S006 plus existing books and public resource links | Use as editorial framing, not a metric. |
| "Stories show local proof before they become abstractions" | Stories index/detail | Chapter evidence in S015-S022, S033, S036-S038 | Story drafts need steward approval before launch. |
| "Guilds turn network needs into tools and practices" | Guild detail, Home ecosystem | S005, S008, S012, S013 | Avoid unverified contributor/member counts. |
| "Impact surfaces should show proof links, source status, and unavailable states" | Chapter detail, map, impact blocks | Existing agent/shared contracts plus S018/S046 | Never render raw upstream payloads or private review data. |

## Page Copy Proposals

### Home

Headline: A global regenerative network.

Deck: Greenpill connects local chapters, builders, writers, and public-goods stewards who are turning regenerative ideas into visible projects, tools, stories, and impact evidence.

Primary CTA: Explore chapters. Secondary CTA: Enter the Garden.

Section copy:

- Map: Find chapters and public activity anchors across the network.
- Stories: Read what chapters are doing in place: water, education, local events, funding experiments, and open-source coordination.
- Library: Start with the books, podcast, and public resources that explain the movement.
- Guilds and projects: See the tools and practices the network is building together.
- Garden: Begin with a lightweight onboarding path before joining deeper coordination spaces.

### Chapters Index

Headline: Chapters turn public goods into local practice.

Deck: Explore active, forming, and review-needed chapter records from public sources. Each chapter profile should show only source-backed public links, city-level map data, and editorial summaries that can be reviewed by stewards.

Filter copy: Browse by region, chapter status, and focus theme.

Review state copy: Some chapter records are intentionally marked forming, inactive, or noindex until a steward provides a public source.

### Chapter Detail Template

Headline pattern: `{Chapter name}`.

Deck pattern: A public profile for local Greenpill activity in `{place}`, grounded in public links, stories, and approved impact sources.

Recommended sections:

- What this chapter is working on.
- Public proof and source links.
- Stories from this chapter.
- Library and resources connected to this place.
- Public impact status, with explicit stale/unavailable states.
- Connect links, only where the destination is public and approved.

### Library

Headline: A knowledge commons for regenerative public goods.

Deck: Books, podcasts, guides, and public threads that help people understand Greenpill, local regeneration, public-goods funding, impact evidence, and coordination practice.

Recommended sections:

- Foundational books.
- Podcast and field conversations.
- Practical guides and public threads.
- Guild/project resources.

### Stories Index

Headline: Stories from the field.

Deck: Source-backed reports from chapters, guilds, and projects across the Greenpill network. Treat each story as a public narrative draft until a steward signs off on the claims and emphasis.

Recommended sections:

- Featured story.
- Chapter updates.
- Impact and funding evidence.
- Garden and onboarding stories.
- Submit or suggest a story, routed to a private review workflow.

### Story Detail Template

Headline pattern: `{Story title}`.

Deck pattern: A public narrative grounded in cited public links and approved chapter/project references.

Recommended sections:

- Article body in markdown.
- Proof signals and source links.
- Related chapter, guild, project, and resource refs.
- Continue reading.
- Editorial review status if drafts are ever rendered internally.

### Guild Detail

Headline pattern: `{Guild name}`.

Deck pattern: A public profile for the guild's mandate, outputs, principles, projects, and public links.

Recommended sections:

- Mandate and operating focus.
- Public outputs.
- Projects.
- How the guild works.
- Public people and references.
- Connect links.

### Garden / Onboarding

Headline: Enter the Garden.

Deck: A lightweight path into the Greenpill network: read the public field notes, join the public conversation, reflect on how you want to contribute, and book a steward conversation when you are ready.

Recommended sections:

- Four public onboarding steps.
- After-Garden cards for chapters, guilds, and library.
- Explicit privacy note: assessment responses, booking state, and private coordination do not live in public Keystatic content.

## Runtime Seed Inventory

Runtime fixture: `packages/agent/fixtures/public-content-seed.json`

Seed script: `scripts/agent-public-content-seed.ts`

Dry-run command:

```sh
bun --env-file-if-exists=.env.local scripts/agent-public-content-seed.ts --dry-run
```

Apply command:

```sh
bun --env-file-if-exists=.env.local scripts/agent-public-content-seed.ts
```

Target: any Postgres database identified by `DIRECT_DATABASE_URL` or `DATABASE_URL`, after `bun run db:migrate` has applied the `intake` and `impact` schemas plus the replay-safe Live Onboarding settings migration (`003_map_node_intake_settings.sql`). In normal local development this targets local Postgres if `.env.local` points there. It targets Fly/prod only if an operator deliberately points the environment at production credentials.

Seeded runtime data:

- 4 approved public map-node projection rows: Nigeria Water Cup/Awka, Brasil RegenMeetUp/Rio, London Ontario build night, Koh Phangan ReFi community.
- 1 public chapter impact cache snapshot for Greenpill Brasil, normalized from the KarmaGAP project source with two public milestone entries.

Runtime privacy guard:

- No private contacts, emails, raw notes, review notes, IP addresses, user agents, spam metadata, pending submissions, raw EAS payloads, work media, raw feedback, or private member data are present in the fixture.
- Contract tests validate the fixture through the same public projection and public impact guards used by the app packages.
- `bun run test:content` validates that public singletons and active chapter records do not point at noindex chapters, missing stories, or unpublished story routes.

## Steward Review Before Launch

| Item | Why review is needed | Current handling |
|---|---|---|
| Greenpill California | No public footprint found beyond dormant `@greenpill_LA` in research. | Seeded as inactive and noindex; do not promote until public source exists. |
| Greenpill Cape Town | Thin public footprint; research relied on internal copy direction. | Seeded as forming and noindex; needs public Luma, Hub, website, or steward-provided source. |
| Greenpill Kenya event details | Gitcoin source does not clearly anchor every event detail/year. | Seeded conservatively with Gitcoin source; exact event/year copy needs review. |
| Cote d'Ivoire targets | 100 contributors / EspacesVerts are goals, not completed outcomes. | Written as targets/planned goals, not delivered metrics. |
| Greenpill Brasil meeting hours | Research notes 20 meetings / 30+ hours from self-report. | Not seeded as a promoted metric. |
| Uncommons $100k+ funding claim | Public source trail needs EF/GCC cross-check, and the xLog link failed launch link checks. | Not seeded as a promoted metric. |
| GreenSofa funding amounts | Public receipts exist, but they are sensitive if used as headline impact numbers. | Kept in story/proof context; review before hero placement. |
| Public people roster | People records use public context only, but roles/cadence can drift. | Confirm before rendering as official membership roster. |
| Podcast exact episode count | Research snapshot says 293 episodes. | Safe as source-backed snapshot; refresh if used as live stat. |

## Schema Gaps For HiFi Implementation

| Gap | Impact on upcoming page work | Suggested follow-up |
|---|---|---|
| Chapter map visibility currently follows `seo.noindex`. | Review-gated chapters are filtered from generated chapter pages, the chapter index, impact-source export, and `/locations.json`. | Add explicit `mapVisibility` or `hideFromMap` later only if editors need a chapter page indexed but hidden from maps. |
| Chapter related refs are limited. | Chapter detail related-chapter blocks will need inference by region/theme. | Add `relatedChapterSlugs` if curated related blocks are required; public refs must continue to target generated chapter pages. |
| Chapter connect links are simple label/url records. | HiFi link cards have subtext/action/glyph metadata. | Extend link schema only if the richer card UI ships. |
| Story publication status is enforced. | Seeded story drafts are filtered from public story list/detail routes and are not referenced by public singletons or active chapter records until marked `published`. | Steward-approved stories should be promoted by changing `status` to `published` and then adding curated refs. |
| Story body is markdown/string, not structured article blocks. | HiFi pullquotes, stats, acknowledgements, and lists need markdown conventions or new block schema. | Prefer markdown conventions first unless editors need block controls. |
| Story author role/bio and translation fields are incomplete. | Story detail hero may need richer author display. | Add optional author role/bio/translation fields if designs require them. |
| Resources do not fully model podcast episode number, guest, duration, pages, or edition. | Library podcast and book cards may fall back to generic metadata. | Add fields only for the layouts that actually render them. |
| Events/RSVPs have no public projection model. | Chapter detail event blocks cannot truthfully render live event state yet. | Keep events out of static content until event source and privacy projection are chosen. |
| Public aggregate counts are not wired for guild/member/story totals. | HiFi stat strips must avoid fake counts. | Use build-derived counts or Agent/API aggregates with explicit `not_configured` states. |
| Green Goods/impact provenance is only partially structured in chapter entries. | Impact blocks need clear source labels and stale/unavailable handling. | Reuse `impactSources` plus agent cache payload; avoid duplicate proof logic in Astro pages. |
| Garden preview UI references assessment, Telegram, email, and booking states. | These are not public content records and could imply private data exposure. | Render public illustrative copy only, or add private/admin-backed projections later. |

## Content Status

Step 3.5 is ready for page wiring once validation passes. The public content now has real seed entries for the target collections, draft story records stay reviewable without public broken links, and the runtime fixture is narrow, public-safe, idempotent, optional, and backed by replay-safe migrations. Remaining work before launch is editorial/steward review, not schema-blocking for the first HiFi implementation pass.
