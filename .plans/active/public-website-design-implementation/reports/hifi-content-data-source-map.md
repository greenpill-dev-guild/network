# HiFi Content And Data Source Map

## Purpose

This report maps the checked-in HiFi design package to data ownership before page implementation. It is report-only: no live-site crawl, no schema changes, no content seeding, and no API changes.

HiFi sources reviewed:

- `artifacts/hifi/HANDOFF.md`
- `artifacts/hifi/CLAUDE_CODE_HANDOFF.md`
- `artifacts/hifi/hifi/*-page.jsx`
- `artifacts/hifi/hifi/*-sections.jsx`
- `artifacts/hifi/hifi/*-bits.jsx`
- `artifacts/hifi/hifi/*-data.jsx`
- `artifacts/hifi/hifi/map-data.jsx`
- `artifacts/hifi/hifi/map-themes.jsx`

## Ownership Buckets

| Bucket | Owns | Must not own |
|---|---|---|
| Keystatic public content | Static/editor-curated public copy, public entity profiles, media slots, SEO, public CTAs, featured refs, chapters, guilds, projects, stories, resources, people/stewards, home, and garden public copy. | Private contact fields, review notes, raw moderation metadata, per-user/member state. |
| Agent/API data | Public runtime data, approved map nodes, generated map state, cache-backed chapter impact snapshots, public counts, fresh activity, and aggregates that should not be hand-edited. | Private emails, raw notes, private steward notes, raw upstream data, pending submissions. |
| Private Admin CMS | Directus/private admin data for moderation, pending submissions, private contacts, review history, member/steward workflow, RSVPs, applications, assessments, pledge state, and future identity-bound workspace data. | Public page copy or canonical public content. |

Coverage labels:

- Supported: current repo has a clear field/route/table for the HiFi requirement.
- Partial: current repo has a nearby shape, but the next implementation wave needs fields, references, or route policy.
- Missing: no current repo surface covers the requirement.
- Deferred: visible in HiFi, but not a first public static-content requirement.
- Design-only: component/token reference, not website content.

## Components Reference

| HiFi surface | Source constants / sections | Owner | Current coverage | Notes |
|---|---|---|---|---|
| Components page | `comp-page.jsx`, `comp-foundations.jsx`, `comp-components.jsx`, `comp-blocks.jsx` | Design-only | Partial | Use as visual/component contract for tokens, chrome, cards, rows, heroes, article blocks, and Garden-specific blocks. Do not model as public content. |
| Shared shell | `GP_Header`, `GP_Footer`, breadcrumbs, buttons, cards, pills, section headers | Keystatic for nav/footer labels; design system for rendering | Partial | Header/footer content can stay in singletons or layout config. Component props should not become per-page hardcoded copy. |

## Home

HiFi page sections: `HmHero`, `HmStoriesSection`, `HmLibrarySection`, `HmEcosystemSection`, `HmGardenSection`.

| Surface | HiFi data | Required fields | Owner | Coverage | Privacy / notes |
|---|---|---|---|---|---|
| Hero and page promise | Section copy in `home-sections.jsx` | overline, headline, dek/body copy, primary/secondary CTAs, proof signals, media/background slot | Keystatic public content | Partial | Current `homePage` singleton supports title/promise/summary/CTAs/proof/media/SEO but needs a final section-level copy model if the hero text is not fixed in code. |
| Mycelial chapter map | `HM_CHAPTERS`, `HM_THEME_COLORS`; `MAP_CHAPTERS`, `MAP_THEMES` | chapter name, lat/lng, themes, status/size, theme labels/colors/icons, map aggregate counts | Agent/API for generated state; Keystatic for canonical chapter/theme records | Partial | `/locations.json` and chapter content cover canonical chapter pins. A future map-state API should combine chapters plus approved submitted nodes and public aggregates. |
| Procedural steward/member network | `MAP_MEMBER_CITIES`, `MAP_STEWARD_NAMES`, `MAP_MEMBER_NAMES`, `generateMapNetwork` | public node type, public display name or pseudonym, city, lat/lng, themes, generated edges | Agent/API, with Private Admin CMS behind source data | Missing | If real member/steward nodes are used, private identity/contact state stays in Private Admin CMS. Public API returns only approved/pseudonymous public projections. |
| Story previews | `HM_STORIES` | related chapter/region, title, excerpt/blurb, media, featured flag | Keystatic public content | Partial | `stories` supports title/excerpt/image/relatedChapter/featuredWeight, but entries are intentionally empty and need real content later. |
| Library preview | `HM_LIB_PREVIEW` | featured book/resource, featured podcast episode, top books, guild/resource preview refs | Keystatic public content | Partial | `books` and `resources` cover core items. Podcast episode shape is only partially represented by `resources` today. |
| Ecosystem/guild preview | `HM_LIB_PREVIEW.guilds` | guild title, summary, member count, status, featured refs | Keystatic for guild copy; Agent/API for counts | Partial | `guilds` supports public copy; member counts should be API aggregates or curated proof signals, not fake static counts. |
| Garden steps preview | `HM_GARDEN_STEPS` | step number, friction label, title, description, CTA label/kind/href | Keystatic public content | Supported | Current `garden` singleton has steps; final implementation should reuse it instead of hardcoding Home-only steps. |

## Chapters Index

HiFi page sections: `ChHeroTypographic`, `ChHeroImagery`, `ChHeroMapLed`, `ChMapBlock`, `ChFilterBar`, `ChListSection`.

| Surface | HiFi data | Required fields | Owner | Coverage | Privacy / notes |
|---|---|---|---|---|---|
| Hero stats | `CH_COUNTS`, `CH_REGIONS` | total chapters, active/forming counts, region counts | Agent/API or generated static build data | Partial | Counts can be derived from Keystatic at build time for static pages; freshness-sensitive counts belong in Agent/API. |
| Featured chapters | `CH_FEATURED`, `CH_FEATURED_COORDS` | slug, name, city, region, status, story headline, blurb, steward display ref, photo/media, featured weight | Keystatic public content | Partial | Chapter schema supports core fields, stewards, media, and featured weight. It lacks explicit featured story headline/blurb separate from `summary`. |
| Directory list | `CH_COMPACT` | slug, name, city, region, status, short summary, lat/lng | Keystatic public content | Supported | Current chapter collection covers these fields, with lowercase region/status normalization. |
| Filters | `CH_REGIONS`, status toggles in `ch-page.jsx` | region options, active/forming filters | Static UI from content enums | Supported | Filter state is UI-only. No CMS/API state required. |
| Map/pins | `CH_ALL_PINS` | slug, display name, lat/lng, status, size/featured treatment | Agent/API or generated `/locations.json` | Partial | Existing `/locations.json` covers public chapter pins. Size/featured treatment can be derived from featured weight or current route policy. |

## Chapter Detail

HiFi page sections: `CdHero*`, `CdIntroSection`, `CdStoriesSection`, `CdStewardsSection`, `CdEventsSection`, `CdLibrarySection`, `CdLocationSection`, `CdConnectSection`, `CdRelatedSection`.

| Surface | HiFi data | Required fields | Owner | Coverage | Privacy / notes |
|---|---|---|---|---|---|
| Chapter identity and intro | `CD_CHAPTER` | slug, name, region, status, city, founded, lat/lng, hero media, intro, intro quote, quote attribution | Keystatic public content | Partial | Chapter schema supports identity, location, founded, summary, media. It needs intro quote fields or a richer body/section model. |
| Chapter stats | `CD_STATS` | members, steward count, story count, founded year, impact counts | Agent/API for live counts; Keystatic/proof signals for curated public stats | Partial | Existing proof signals can hold curated stats. Live member/steward counts need API aggregation. |
| Stewards | `CD_STEWARDS` | name, role, bio, location, avatar/media, chapter relation | Keystatic public people/stewards for public roster; Private Admin CMS for full/private steward workflow | Partial | Current inline stewards and `people` support public basics, but not location/chapter-specific steward metadata cleanly. |
| Stories | `CD_STORIES` | title, blurb, photo, date, tag/category, metric, related chapter | Keystatic public content, with optional Agent/API impact metric | Partial | Story schema covers core story fields. Metric should be public proof signal or impact API, not freeform private data. |
| Events | `CD_EVENTS` | date, time, title, location, RSVP count, cap, kind | Private Admin CMS for RSVP/event ops; Agent/API for public event projection | Missing | Events and RSVPs are operational. Public page should consume a safe event projection only. |
| Chapter-authored resources | `CD_LIBRARY` | title, author, year, kind, tag, related chapter | Keystatic public content | Partial | `resources` covers most fields; `books` compatibility exists. Need relation policy for authored/translated chapter resources. |
| Connect links | `CD_LINKS` | label, subtext, handle/action, glyph/icon, href | Keystatic public content | Partial | `links` supports label/url only. Needs display metadata if the HiFi link cards stay as designed. Avoid raw workspace links unless V2 routing policy approves them. |
| Related chapters | `CD_RELATED` | related chapter slugs | Keystatic public content | Missing | Current chapter schema has no explicit related chapter list. Can be inferred by region or added as editor-curated refs. |
| Impact feed | Handoff route contract plus existing chapter-impact plan | source bindings, snapshot payload, stale/unavailable status, proof links | Agent/API | Supported | Current agent cache route and `impactSources` cover this. Public payload must exclude raw EAS/media/private data. |

## Library

HiFi page sections: `HFHero*`, `HFBooksSection`, `HFPodcastSection`, `HFBentoSection`.

| Surface | HiFi data | Required fields | Owner | Coverage | Privacy / notes |
|---|---|---|---|---|---|
| Library hero | Hero copy in `lib-sections.jsx` | overline, title, dek/body copy, stats, featured media treatment | Keystatic public singleton or resources index config | Missing | No library singleton exists. Current page likely hardcodes index copy. |
| Books/resources | `HF_BOOKS` | title, author, year, pages, edition, cover/media, links, kind/status | Keystatic public content | Partial | `books` supports compatibility; `resources` supports kind/status and public links but not `pages` or `edition` directly. |
| Podcast feature | `HF_FEATURE_EP` | episode number, title, guest/host, duration, age/publish date, blurb, media/link | Keystatic public content | Partial | `resources` can represent podcast items, but episode number and guest fields should be explicit if this layout ships. |
| Podcast episode list | `HF_EPS` | episode number, title, guest, duration, age/date, link | Keystatic public content | Partial | Same podcast-resource gap as above. `age` should be derived from publish date, not manually authored. |
| Guild cards | `HF_GUILDS`, `HF_GUILD_DETAILS` | title, summary, member count, status, tags, lead, project count, featured flag | Keystatic for public guild metadata; Agent/API for counts | Partial | Guild schema covers public copy/tags via themes, but lead/project counts need refs or aggregates. |
| Garden/playbook cards | `HF_GARDEN`, `HF_GARDEN_DETAILS` | title, description, chapters count, read time, updated date, authors count, topics, featured flag | Keystatic public resources | Partial | `resources` covers core copy/tags; read/update/authors/chapter count need explicit fields or derived policy. |

## Stories Index

HiFi page sections: `StIntroSection`, `StFeatured`, `StSubFeaturesSection`, `StTopicSpotlightSection`, `StFeedSection`, `StTranslationsSection`, `StNewsletterSection`, `StSubmitSection`.

| Surface | HiFi data | Required fields | Owner | Coverage | Privacy / notes |
|---|---|---|---|---|---|
| Stories hero | `ST_HERO` | overline, title, blurb | Keystatic public singleton or stories index config | Missing | No stories index singleton exists. |
| Featured story | `ST_FEATURED` | slug, chapter/region, tag, title, dek, author, author role, date, read time, photo | Keystatic public content | Partial | `stories` covers title/excerpt/author/date/readTime/image/relatedChapter. Missing author role and region/tag specificity. |
| Sub-features | `ST_SUB_FEATURES` | same as featured story, smaller layout | Keystatic public content | Partial | Can be driven by `featuredWeight` after real entries exist. |
| Filters/tags | `ST_TOPIC_TAGS`, `ST_CHAPTER_TAGS` | topic filters, chapter filters | Keystatic-derived taxonomy | Partial | Topics can come from `themeSlugs`; chapter list from `chapters`. Display labels need policy. |
| Feed | `ST_FEED` | slug, chapter, tag, title, dek, author, date, read time, photo | Keystatic public content | Partial | Supported after story entries exist; final field names need alignment with card components. |
| Topic spotlight | `ST_TOPIC_SPOTLIGHT` | topic, blurb, stats, read refs | Keystatic public content plus Agent/API for stats if live | Missing | Could be a theme/topic singleton or curated story-index block. Stats should not be invented if not live. |
| Translations strip | `ST_TRANSLATIONS` | title, languages | Keystatic public content | Partial | `books` has translations; `stories` does not. Need story/resource translation model decision. |
| Newsletter CTA | Section copy in `st-sections.jsx` | headline, body, email action, last issue refs | Keystatic public content plus future form endpoint | Partial | Public copy can be static; email submission requires separate provider/API. |
| Submit story CTA | Section copy in `st-sections.jsx` | CTA copy, destination/action | Keystatic public content; Private Admin CMS if submissions are captured | Partial | If this becomes a real submission flow, private drafts/contact data stay out of public content. |

## Story Detail

HiFi page sections: `SdArticleHero`, `SdArticleBody`, `SdContinueReadingSection`, `SdNewsletterSection`, `SdSubmitSection`.

| Surface | HiFi data | Required fields | Owner | Coverage | Privacy / notes |
|---|---|---|---|---|---|
| Article metadata | `SD_STORY` | slug, chapter/chapterSlug, region, tag, title, dek, author, author role, author bio, date, read time, hero photo, translations | Keystatic public content | Partial | Story schema covers core fields but not author role/bio, region, translations, or structured dek separate from excerpt. |
| Article body block model | `SD_STORY.body` | ordered blocks: paragraph, h2, pullquote, list, thanks/acknowledgements | Keystatic public content | Missing | Current story `body` is a string. HiFi needs a structured block model or markdown convention that renders these block types. |
| Article stats | `SD_STORY.stats` | label/value pairs for impact or story metrics | Keystatic proof signals or Agent/API | Missing | Public stats can be curated proof signals or API-derived. Avoid raw/private upstream data. |
| Continue reading | `SD_CONTINUE_READING` | story refs with chapter/tag/title/dek/author/date/read/photo | Keystatic public content | Partial | Can be derived from related stories or curated refs. |
| Newsletter/submit CTAs | Section copy in `sd-sections.jsx` | same as Stories index CTA surfaces | Keystatic public content plus future form/private submission endpoint | Partial | Form submissions should not write into public content directly. |

## Guild Detail

HiFi page sections: `GldHero*`, `GldDiagramSection`, `GldMandateSection`, `GldProjectsSection`, `GldHowWeWorkSection`, `GldMembersSection`, `GldConnectSection`.

| Surface | HiFi data | Required fields | Owner | Coverage | Privacy / notes |
|---|---|---|---|---|---|
| Guild identity/mandate | `GLD_GUILD` | slug, name, kind, status, founded, oneliner, outputs, mandate paragraphs, hero photo | Keystatic public content | Partial | Guild schema supports name/status/summary/description/media. Missing outputs array, founded, mandate paragraph structure. |
| Guild stats | `GLD_STATS` | active repos, contributors, merged PRs, chapters using tools | Agent/API for live stats; Keystatic proof signals for curated stats | Partial | `proofSignals` can hold curated stats. Live repo/contributor stats need API/source policy. |
| Projects | `GLD_PROJECTS` | title, short label, description, tech, status, lead | Keystatic public projects | Partial | Project schema supports tech/status/description, but lead ref/short label may need fields. |
| Members | `GLD_MEMBERS`, `GLD_MEMBER_MORE` | public name, role, chapter, count of additional members | Keystatic public people for public roster; Private Admin CMS for full member state | Partial | Public roster can use `people`; full member list/count belongs in private workspace/admin, with only approved public projection if shown. |
| Cadence | `GLD_CADENCE` | call time, format, recordings | Keystatic public content | Missing | Could live on guild entry or a guild schedule block. |
| Principles | `GLD_PRINCIPLES` | ordered number, title, body | Keystatic public content | Missing | Needs structured array on guild or a reusable content block. |
| Connect links | `GLD_LINKS` | label, subtext, action, glyph/icon, href | Keystatic public content | Partial | Current link shape is too simple for HiFi link cards. Avoid raw Charmverse links unless explicitly retained. |

## Garden

HiFi page sections: `GD_Hero`, `GD_RampScale`, `GD_Step`, `GD_StickyCTA`, `GD_AfterGarden`.

| Surface | HiFi data | Required fields | Owner | Coverage | Privacy / notes |
|---|---|---|---|---|---|
| Garden hero | Copy in `gd-sections.jsx`, `garden-overlay.jpg` | title, summary, hero variant, media/background, CTAs | Keystatic public content | Partial | Current `garden` singleton supports title/summary/framing/media/SEO, but not hero variant/accent policy. |
| Onboarding steps | `GD_STEPS` | number, level, stage, levelLabel, kicker, title, body, meta, CTA, surface type | Keystatic public content | Partial | Current `garden.steps` supports kicker/title/body/meta/CTA, but not level/stage/levelLabel/surface. |
| After-garden cards | `GD_AFTER` | kicker, title, body, link label, href | Keystatic public content | Supported | Current `garden.afterCards` covers this via CTA. |
| Email preview | `GD_EMAIL_PREVIEW` | meta, headline, excerpt, reader count | Keystatic public content; Agent/API only if reader count is live | Missing | Preview can be illustrative static copy. Reader count should be curated or derived, not fabricated. |
| Telegram preview | `GD_TELEGRAM_MESSAGES` | sender, message text, time | Keystatic public content for illustrative preview; Agent/API if live | Missing | Do not show private Telegram content unless explicitly public/approved. Prefer curated illustrative copy. |
| Assessment preview | `GD_ASSESSMENT_OPTIONS` | labels, active/default state | Keystatic public content for labels; Private Admin CMS/API for real answers | Missing | Real assessment responses are private/user-specific and belong outside public content. |
| Steward-call preview | `GD_STEWARD_SLOTS`, `GD_STEWARD_PROFILE` | slot day/time, active/default slot, steward display profile, rotation | Private Admin CMS/API for availability; Keystatic for public steward bio only | Missing | Real availability and booking state are operational/private. Public page may show a curated static preview. |
| Sticky CTA | `GD_StickyCTA` | active CTA label/destination | Keystatic public content | Partial | Can use selected step CTA or a Garden singleton CTA policy. |

## Cross-Route API And Private Admin Surfaces

| Surface | HiFi signal | Owner | Current coverage | Next decision |
|---|---|---|---|---|
| Public map state | Home map, Chapters map, `map-data.jsx` | Agent/API | Partial | Define `GET /map-nodes/public` plus a future aggregate map-state route that merges chapter pins, approved submitted nodes, public theme metadata, and public counts. |
| Chapter impact | Chapter detail stories/stats/proof links and current chapter-impact plan | Agent/API | Supported | Keep Green Goods/Karma cache behind `GET /impact/chapters/:slug`; do not expose raw upstream payloads. |
| Public counts | chapter counts, member counts, guild stats, story/topic stats | Agent/API or build-time derived | Partial | Use build-time derived counts when static and truthful; use Agent/API for freshness or source-backed external stats. |
| Events and RSVPs | `CD_EVENTS` | Private Admin CMS with public projection | Missing | Add only after deciding event source and public-safe projection fields. |
| Applications and story submissions | submit/story/garden CTAs | Private Admin CMS | Missing | Public CTA copy in Keystatic; submitted data stays private until moderated/exported. |
| Assessment and pledge state | Garden assessment/steward-call previews | Private Admin CMS | Missing | Keep user-specific state in workspace/private admin. Public page can preview the flow only. |
| Member/steward operations | guild members, steward slots, full member network | Private Admin CMS | Partial | Public people/stewards can be Keystatic; complete identity/workflow state is private. |

## Implementation Deltas

Keystatic/public content deltas:

- Add index singletons or content blocks for Home, Library, Stories, and possibly Chapters if section copy should remain editable.
- Extend story content with structured body blocks or a markdown rendering convention for paragraphs, headings, pull quotes, lists, thanks, translations, author role/bio, and story stats.
- Extend guild content for outputs, founded year, mandate paragraphs, cadence, principles, richer link cards, and public member/person refs.
- Extend chapter content for intro quote, related chapter refs, richer connect-link cards, featured story headline/blurb, and optional chapter-authored resource refs.
- Extend resources for podcast episode number, guest/host, pages, edition, updated/read-time metadata, and chapter/guild/garden card metadata if those layouts ship.
- Extend Garden singleton for step level/stage/levelLabel/surface and optional preview cards.

Agent/API deltas:

- Define a public map-state contract that can reuse `/locations.json`, approved `public_map_nodes`, theme metadata, public counts, and generated edges without exposing pending/private data.
- Define public count/aggregate contracts for chapter, guild, story/topic, and library popularity stats only where the source is real and freshness matters.
- Keep `GET /impact/chapters/:slug` as the source-backed impact route; add browser-facing state only after cache data exists.
- Add public projections for events only if the source of events/RSVPs is chosen.

Private Admin CMS deltas:

- Keep Directus/private admin focused on pending map-node moderation, contact visibility, review notes, event/RSVP moderation, applications, story submissions, assessment/pledge state, and member/steward operations.
- Do not let Directus become the canonical public content source in this wave.
- Any public projection from private admin must explicitly exclude email, raw notes, review notes, IP/user-agent, spam metadata, pending submissions, and user-specific answers.

Deferred/design-only:

- Components page is a visual contract only.
- HiFi gallery frames and `?raw` branching are prototype chrome and should not ship.
- Live member-only workspace states are not designed by this HiFi package.
- HiFi placeholder copy is field-shape evidence only, not final editorial content.

## Coverage Checklist

Data constants represented:

- Home: `HM_CHAPTERS`, `HM_STORIES`, `HM_LIB_PREVIEW`, `HM_GARDEN_STEPS`, `HM_THEME_COLORS`.
- Chapters index: `CH_FEATURED`, `CH_COMPACT`, `CH_FEATURED_COORDS`, `CH_ALL_PINS`, `CH_REGIONS`, `CH_COUNTS`.
- Chapter detail: `CD_CHAPTER`, `CD_STATS`, `CD_STEWARDS`, `CD_STORIES`, `CD_EVENTS`, `CD_LIBRARY`, `CD_LINKS`, `CD_RELATED`.
- Library: `HF_BOOKS`, `HF_FEATURE_EP`, `HF_EPS`, `HF_GUILD_DETAILS`, `HF_GARDEN_DETAILS`, `HF_GUILDS`, `HF_GARDEN`.
- Stories index: `ST_HERO`, `ST_FEATURED`, `ST_SUB_FEATURES`, `ST_TOPIC_TAGS`, `ST_CHAPTER_TAGS`, `ST_FEED`, `ST_TOPIC_SPOTLIGHT`, `ST_TRANSLATIONS`.
- Story detail: `SD_STORY`, `SD_CONTINUE_READING`.
- Guild detail: `GLD_GUILD`, `GLD_STATS`, `GLD_PROJECTS`, `GLD_MEMBERS`, `GLD_MEMBER_MORE`, `GLD_CADENCE`, `GLD_PRINCIPLES`, `GLD_LINKS`.
- Garden: `GD_STEPS`, `GD_AFTER`, `GD_EMAIL_PREVIEW`, `GD_TELEGRAM_MESSAGES`, `GD_ASSESSMENT_OPTIONS`, `GD_STEWARD_SLOTS`, `GD_STEWARD_PROFILE`.
- Map model: `MAP_CHAPTERS`, `MAP_MEMBER_CITIES`, `MAP_STEWARD_NAMES`, `MAP_MEMBER_NAMES`, `MAP_THEMES`, `MAP_THEME_BY_ID`, `generateMapNetwork`.

Top-level page sections represented:

- Home: `HmHero`, `HmStoriesSection`, `HmLibrarySection`, `HmEcosystemSection`, `HmGardenSection`.
- Chapters: `ChHeroTypographic`, `ChHeroImagery`, `ChHeroMapLed`, `ChMapBlock`, `ChFilterBar`, `ChListSection`.
- Chapter detail: `CdHeroLandscape`, `CdHeroFullBleed`, `CdHeroTypographic`, `CdHeroStatStrip`, `CdIntroSection`, `CdStoriesSection`, `CdStewardsSection`, `CdEventsSection`, `CdLibrarySection`, `CdLocationSection`, `CdConnectSection`, `CdRelatedSection`.
- Library: `HFHeroEditorial`, `HFHeroFeatured`, `HFHeroIconic`, `HFHeroMono`, `HFBooksSection`, `HFPodcastSection`, `HFBentoSection`.
- Stories: `StIntroSection`, `StFeatured`, `StSubFeaturesSection`, `StTopicSpotlightSection`, `StFeedSection`, `StTranslationsSection`, `StNewsletterSection`, `StSubmitSection`.
- Story detail: `SdArticleHero`, `SdArticleBody`, `SdContinueReadingSection`, `SdNewsletterSection`, `SdSubmitSection`.
- Guild detail: `GldHeroMandatePhoto`, `GldHeroMandateDiagram`, `GldHeroTypographic`, `GldHeroFullBleed`, `GldHeroStatStrip`, `GldDiagramSection`, `GldMandateSection`, `GldProjectsSection`, `GldHowWeWorkSection`, `GldMembersSection`, `GldConnectSection`.
- Garden: `GD_Hero`, `GD_RampScale`, `GD_Step`, `GD_StickyCTA`, `GD_AfterGarden`.
