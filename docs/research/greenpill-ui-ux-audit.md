# Greenpill UI/UX Audit and Design Strategy

Research snapshot assembled on March 27, 2026.

Current adopted default note:

- This document preserves the earlier UX exploration and wireframing language.
- References below to a public `/workspace` route are exploratory and no longer the active default.
- The canonical V2 decision now treats the workspace as `app.greenpill.network` and keeps the active architecture in `docs/v2`.

This document is a design audit, information architecture proposal, and migration UX plan for the Greenpill Network website refresh. It is grounded in the current repo (`release/2.0`), the existing design language, and the research pack in `docs/research/`.

The scope is user-facing: page structure, visual hierarchy, content presentation, navigation, interaction patterns, and migration experience. Backend architecture is only referenced where it directly constrains a UI decision.

---

## A. Top Findings

These are the most important design and UX findings, in priority order.

### 1. The site tells the wrong story

The homepage currently says: "Here are some books, a podcast, and some links."

The network says: "We are a global coordination network of chapters, guilds, builders, and storytellers shipping real regenerative work."

That gap is the single biggest UX problem. Every other issue flows from it.

**Evidence:** The page flow in `src/pages/index.astro` is Hero -> ChapterMap -> BookSection -> PodcastSection -> ParticipateSection -> ExploreSection -> Footer. Books and podcast get two full-screen sections. Guilds, pods, projects, builders, stories, and programs get zero sections.

### 2. The site is a single page with no information architecture

There are exactly two pages: `/` and `/explorer`. Every meaningful destination (guilds, chapters, onboarding, workspace) is an external link, mostly to Charmverse, Discord, or Google Forms.

This means:
- You cannot deep-link to a chapter, guild, project, or program.
- You cannot index or search network content.
- You cannot route different audiences to different entry points.
- You cannot build a migration path from Charmverse because there is nothing to migrate to.

### 3. The participation model is a dead-end link list

The ParticipateSection (`src/components/ParticipateSection.astro`) uses a Beginner / Intermediate / Advanced ladder. This was fine for a book-centric era. It is now a wall of green arrow links pointing to external services, many of them Charmverse URLs about to break.

The section communicates "here are things you could click" instead of "here is how you belong to this network."

### 4. The Explore section is mislabeled and redundant

The ExploreSection (`src/components/ExploreSection.astro`) is not exploration. It is a social link bar (Discord, Charmverse, Twitter, Telegram) with large inline SVGs. The name "Explore" is also used in the nav, creating confusion with the actual Graph Explorer page.

### 5. Charmverse links are embedded throughout and about to break

Hard Charmverse links appear in:
- `ParticipateSection.astro` (beginner onboarding, guild entry)
- `ExploreSection.astro` (Charmverse workspace link with invite code)
- `src/content/social-links.json` (charmverse and charmverseInvite fields)
- Several chapter JSON files may link to Charmverse spaces

These are P0 migration targets. Every one needs a website-native destination before Charmverse goes dark.

### 6. The chapter map is a pin map without stories

The ChapterMap (`src/components/ChapterMap.astro`) is a canvas with clickable dots. Each dot links out to an external URL (often a Telegram or Charmverse page). There are no chapter profiles, no stories, no activity signals, no steward names.

The map is technically functional but narratively empty. It says "we exist in these places" without saying what is happening there.

### 7. The explorer is the most forward-looking piece and should be elevated

The Graph Explorer (`src/components/GraphExplorer.astro`, `src/styles/explorer.css`) is well-designed: glass-morphism panels, clear legend, responsive layout, search, inspector. It is the best proof that the site can present network relationships visually.

But it is buried behind a button on the homepage. It should be a first-class navigation destination and the visual backbone of the network story.

### 8. The design language is good and should be extended, not replaced

The current aesthetic works:
- Dark green (`#254D32`) background with organic texture
- Lime green (`#C2E812`) and gold (`#FFD972`) accents
- Volkhov serif for headings, Inter for body
- Parallax floating elements add life
- The explorer's glass-morphism panels are a strong pattern

This is not a rebrand situation. The design system needs more components, not a new identity.

### 9. The nav does not reflect the real site structure

Current nav items: Learn, Participate, Graph, Explore. These are section anchors on a single page, not a navigation architecture. The nav needs to become a real sitemap with clear audience routing.

### 10. Mobile experience is minimal

The mobile menu is a hamburger that slides out a vertical link list. On mobile, the canvas map is hard to use, the participation section's link walls are dense, and the image sequences are heavy. The next version needs mobile-first section design for every new page.

---

## B. Current UX Audit

### What the homepage communicates well

- **Brand identity is immediate.** The dark green, lime, and gold palette with Volkhov typography is distinctive. You know this is not a generic crypto project.
- **The tagline is memorable.** "Turning Degens to Regens" is clear, provocative, and sticky.
- **The chapter map signals global presence.** Even without stories, dots on a map create a "we're real and we're everywhere" impression.
- **The book library is comprehensive.** 13+ publications with translations, multiple formats, and a well-organized grid. For someone who comes looking for the books, this works.
- **The podcast section is clean.** Clear CTAs (Listen Anywhere, View on YouTube, Recommend a Guest), cover art, and two-line description.

### What it under-communicates

- **What Greenpill actually is now.** The hero says "Turning Degens to Regens" but never explains the network, its structure, or its purpose beyond the slogan.
- **That real work is happening.** No current programs, no active projects, no recent updates, no builder output, no chapter stories.
- **Who should care and why.** A chapter organizer in Nigeria, a Solidity dev, a climate researcher, and a potential funder all land on the same page with no routing.
- **The organizational structure.** Chapters, guilds, pods, stewards, and support roles are invisible. The site shows none of the network's actual operating model.
- **Any sense of time or activity.** There are no dates, no "last updated," no event listings, no recent stories. The site could be a year old or a week old and you would not know.

### Where users likely get confused

| Moment | Problem |
| --- | --- |
| Landing on homepage | "Is this a book brand or a network?" No explanation of the network. |
| Clicking "Participate" in nav | Scrolls to a link wall. No clear first step for someone who does not already know the ecosystem. |
| Clicking "Explore" in nav | Scrolls to social links, not the actual Graph Explorer. Name collision. |
| Clicking a chapter dot on the map | Opens an external link (Telegram, Charmverse) with no context. No chapter profile. |
| Looking for guilds or pods | Not mentioned anywhere on the homepage. Only appears as one Charmverse link in the Intermediate section. |
| Looking for projects or tools | Not mentioned. Dev Guild is invisible. |
| Trying to understand how to contribute | The Beginner/Intermediate/Advanced ladder is abstract. No role-based paths. |
| Clicking any Charmverse link | About to lead to a dead or sunset page. |

### Where the site feels too static or link-driven

- **ParticipateSection:** 20+ external links with no context, descriptions, or previews. It reads like a bookmark dump.
- **ExploreSection:** Four social platform links with large SVGs. This is a footer pattern, not a section.
- **ChapterMap:** Static canvas with no activity signals. Dots do not pulse, grow, or show recency.
- **BookSection:** Comprehensive but inert. No reading paths, no "start here," no connection to the learning journey.
- **Footer:** Only a Supermodular attribution. No site navigation, no contact, no newsletter, no secondary links.

### What parts of the current visual language should be kept

| Element | Keep | Extend |
| --- | --- | --- |
| Dark green background with organic texture | Yes | Add subtle grain or noise variants for different page types |
| Lime green (#C2E812) as primary accent | Yes | Use it more systematically for interactive elements |
| Gold (#FFD972) for headings | Yes | Extend to status indicators and highlight blocks |
| Volkhov serif for display text | Yes | Use more sizes; add a display weight for hero moments |
| Inter for body and UI | Yes | Establish clearer size/weight scale |
| Parallax floating elements | Selectively | Use for atmospheric pages (home, learn). Drop on dense content pages. |
| Glass-morphism panels (explorer style) | Yes | This should become the default card and panel pattern |
| Image sequence animations | Selectively | Keep for hero and key transitions. Do not add to every page. |
| Green arrow link pattern | No | Replace with proper link/button/card components |

---

## C. Recommended Information Architecture

### Site Map

```
greenpill.network/
|
|-- / (Home)
|-- /chapters (Chapters Index)
|   |-- /chapters/[slug] (Chapter Detail)
|
|-- /guilds (Guilds & Pods Index)
|   |-- /guilds/[slug] (Guild/Pod Detail)
|
|-- /projects (Projects & Protocols)
|   |-- /projects/[slug] (Project Detail)
|
|-- /learn (Knowledge Commons)
|   |-- /learn/books (Book Library - current BookSection, promoted)
|   |-- /learn/podcast (Podcast - current PodcastSection, promoted)
|   |-- /learn/onboarding (Taking the Greenpill - replaces Charmverse onboarding)
|   |-- /learn/resources (Guides, playbooks, kits)
|
|-- /stories (Stories & Updates)
|   |-- /stories/[slug] (Story Detail)
|
|-- /impact (Impact & Reputation)
|
|-- /partner (Partner & Fund)
|
|-- /explorer (Knowledge Graph Explorer - existing)
|
|-- /workspace (Member Workspace Landing)
|   |-- /workspace/[chapter-or-guild] (Gated spaces - Phase 2+)
|
|-- /join (Onboarding Hub - role-based entry)
```

### Purpose of each section

**Home** (`/`)
The network narrative. Not a content shelf. Answers: "What is Greenpill, what is happening now, and how do I get involved?" in under 60 seconds of scrolling.

**Chapters** (`/chapters`)
The local network. Map + stories + regional context. Each chapter gets a profile page with stewards, recent activity, links, and a join path. Replaces the current canvas-only map.

**Guilds & Pods** (`/guilds`)
The skill and topic layer. Shows Dev Guild, Writers Guild, and topic pods (DeSci, Education, Environment, DePin). Each guild gets a profile with current projects, members, and join flow. Replaces the invisible Charmverse guild link.

**Projects & Protocols** (`/projects`)
What the network is building. Green Goods, GreenWill, Impact Reef, Cookie Jar, Gardens, Allo experiments. Proof that Greenpill ships. Critical for builders and partners.

**Learn** (`/learn`)
The knowledge commons. Books, podcast, onboarding courses, resource kits, workshops. Repositions books and podcast as parts of a larger learning stack instead of the whole identity.

**Stories** (`/stories`)
Chapter updates, field reports, essays, case studies, Greenpill Garden dispatches. A living editorial layer that shows the network is active. Bridges to Paragraph, YouTube, and social.

**Impact** (`/impact`)
Public evidence of outcomes. Chapter impact reports, project metrics, credential summaries, funding flows. Designed for partners and funders, not gamification.

**Partner** (`/partner`)
Partnership and sponsorship surface. What Greenpill can do with aligned organizations. Pilot examples, areas of collaboration, contact paths.

**Explorer** (`/explorer`)
The existing graph explorer, elevated to primary nav. Add overlays for chapters, guilds, projects, and people as the data model grows.

**Workspace** (`/workspace`)
Member-facing operational surface. Gated. Phase 2+. Chapter spaces, guild spaces, docs, proposals, credentials. The Charmverse replacement, built incrementally.

**Join** (`/join`)
Role-based onboarding hub. Not a single "participate" page. Routes newcomers, organizers, builders, writers, and partners to their best entry point.

### Sections that should NOT exist

- **A generic "Participate" page.** The current Beginner/Intermediate/Advanced model should be retired. Replace with role-based pathways integrated into `/join` and distributed across relevant section pages.
- **A separate "Explore" section on the homepage that is just social links.** Social links belong in the footer. The "Explore" label should be freed for the Graph Explorer.
- **A "Community" page.** Too vague. The actual community structures (chapters, guilds, pods) each deserve their own section.

---

## D. Role-Based User Journeys

### 1. Curious Newcomer

**What they need to understand quickly:**
What Greenpill is, why it matters, and that it is real (not just a book or a Discord).

**Best entry page:** `/` (Home)

**Journey:**
1. Land on homepage. See the network narrative, not just a slogan.
2. Scroll to "What is active now" — see community calls, Greenpill Garden, chapter updates.
3. See "How the network works" — chapters, guilds, pods, stewards explained in one visual.
4. See 2-3 featured chapter stories as proof.
5. Reach role-based CTA: "I want to learn" / "I want to join a chapter" / "I want to build."

**Primary CTA:** "Take the Greenpill" (routes to `/learn/onboarding`)

**Proof they need:** Real chapter stories, active programs, recent dates, recognizable partner logos.

### 2. Chapter Organizer

**What they need to understand quickly:**
How chapters work, what support exists, how to start or grow one, what other chapters are doing.

**Best entry page:** `/chapters`

**Journey:**
1. See the chapter map with activity signals and regional groupings.
2. Click into a chapter profile to see what a mature chapter looks like.
3. Find the "Start a Chapter" pathway with playbooks and steward onboarding.
4. See the chapter support structure: steward calls, resource kits, regional hubs.
5. Find workspace access for chapter operations.

**Primary CTA:** "Start a chapter" or "Join your nearest chapter"

**Proof they need:** Stories from other organizers, clear structure, support resources, active steward network.

### 3. Builder / Engineer

**What they need to understand quickly:**
That there is real technical work happening, that the Dev Guild is active, and that contributions are visible and valued.

**Best entry page:** `/projects` or `/guilds/dev-guild`

**Journey:**
1. See the project portfolio: Green Goods, GreenWill, Impact Reef, etc.
2. Click into a project to see its status, stack, contributors, and repo.
3. Navigate to Dev Guild profile to see builder spaces, events, and open issues.
4. Find join flow for the Dev Guild.
5. See credentials and contribution trails.

**Primary CTA:** "Join the Dev Guild" or "Contribute to [project]"

**Proof they need:** Active repos, recent commits, builder event dates, named contributors, clear tech stack.

### 4. Writer / Researcher

**What they need to understand quickly:**
That Greenpill has a real publishing and research function, and that there is a place for their work.

**Best entry page:** `/learn` or `/guilds/writers-guild`

**Journey:**
1. See the knowledge commons: books, podcast themes, published essays.
2. Navigate to the Writers Guild profile.
3. See current writing projects, open calls, publishing pipeline.
4. Find the Paragraph publication and editorial guidelines.
5. Find join flow for the Writers Guild.

**Primary CTA:** "Join the Writers Guild" or "Pitch a story"

**Proof they need:** Published work, named authors, editorial quality, clear submission path.

### 5. Partner / Funder

**What they need to understand quickly:**
That Greenpill is organized, impactful, and complementary to their goals.

**Best entry page:** `/partner` or `/impact`

**Journey:**
1. See the partnership surface: what Greenpill does, who it works with, what collaboration looks like.
2. Navigate to Impact to see outcomes, funded projects, and chapter reports.
3. See the network structure (chapters x guilds x tools) to understand reach.
4. Find contact/inquiry path.

**Primary CTA:** "Partner with Greenpill" or "Fund a program"

**Proof they need:** Impact metrics, named programs, governance maturity, team credibility, clear areas of collaboration.

### 6. Existing Community Member

**What they need to understand quickly:**
What is active now, what changed, where to go next.

**Best entry page:** `/` (Home, "What's Active Now" section) or `/workspace`

**Journey:**
1. Check "What's Active Now" on homepage for current programs and calls.
2. Navigate to their chapter or guild page for specific updates.
3. Access workspace for docs, proposals, and gated resources.
4. Check stories for recent dispatches.

**Primary CTA:** "Go to Workspace" or "Find your next role"

**Proof they need:** Freshness — dates, recent stories, current program status, upcoming events.

---

## E. Charmverse-to-Website UX Mapping

### Current Charmverse functions and their website-native replacements

| Charmverse Function | Current UX | Website-Native Surface | Design Pattern |
| --- | --- | --- | --- |
| **Beginner onboarding** ("Taking the Greenpill") | Link in ParticipateSection to Charmverse page | `/learn/onboarding` — a guided, multi-step onboarding course page | Step-by-step pathway with progress indicators, expandable sections, embedded media. Not a wall of text. |
| **Guild directory and landing pages** | Single Charmverse link in Intermediate section | `/guilds` index + `/guilds/[slug]` detail pages | Card grid index with guild cards (name, description, member count, status). Detail page with projects, members, join flow. |
| **Chapter workspace pages** | External links from map dots (Charmverse, Telegram) | `/chapters/[slug]` detail pages | Chapter profile card with stewards, location, activity feed, resources, join link. |
| **Workspace home / navigation** | Charmverse workspace link in ExploreSection and ParticipateSection | `/workspace` landing page | Access tier cards showing what is available at each level (public, member, chapter, guild, steward). Login/connect CTA. |
| **Gated resources and docs** | Charmverse token-gated spaces | `/workspace/[space]` gated pages (Phase 2) | Lock icon overlay on cards. "Connect wallet to access" state. Graceful degradation showing what you would see if you had access. |
| **Member identity** | Charmverse wallet-native sign-in | Wallet connect button in nav + `/workspace` profile | Subtle wallet indicator in nav bar. Profile page with wallet, roles, credentials, activity. |
| **Proposal and allocation flows** | Charmverse proposals | `/workspace` proposal drafts + Snapshot bridge (Phase 3) | Proposal card with status badge (Draft, Review, Voting, Executed). Inline voting widget. |
| **Credentials and attestations** | Charmverse credentials | `/impact` public view + profile credential chips (Phase 4) | Credential chip components (Chapter Steward, Guild Contributor, Program Participant). Attestation detail modals. |
| **Community navigation** | Charmverse sidebar navigation | Website nav + `/join` role routing + explorer graph | Primary nav with section links. Role-based onboarding hub. Explorer with people/project overlays. |
| **Docs and collaboration** | Charmverse notion-like pages | `/workspace` block editor pages (Phase 3) | Glass-morphism document cards. Inline editor with comments. Chapter/guild scoping. |

### Design patterns for replacement surfaces

**Onboarding Course Page** (`/learn/onboarding`)
```
+--------------------------------------------------+
| TAKING THE GREENPILL                              |
| A guided introduction to the Greenpill network    |
+--------------------------------------------------+
| Step 1: What is Greenpill?        [completed]     |
|   > Summary text, embedded video                  |
| Step 2: The Regen Thesis          [current]       |
|   > Book excerpt, podcast episode                 |
| Step 3: How the Network Works     [locked]        |
|   > Chapters, guilds, pods explained              |
| Step 4: Find Your Path            [locked]        |
|   > Role quiz / self-select                       |
| Step 5: Take Action               [locked]        |
|   > Join chapter, guild, or pod                   |
+--------------------------------------------------+
| Progress: =====>---------- 2/5                    |
+--------------------------------------------------+
```

**Guild/Pod Detail Page** (`/guilds/dev-guild`)
```
+--------------------------------------------------+
| [eyebrow: Guild]                                  |
| DEV GUILD                                         |
| Building coordination tools for the network       |
+--------------------------------------------------+
| [Status: Active] [Members: 24] [Projects: 7]     |
+--------------------------------------------------+
| CURRENT PROJECTS                                  |
| +-------------+ +-------------+ +-------------+  |
| | Green Goods | | GreenWill   | | Impact Reef |  |
| | [Active]    | | [Active]    | | [Beta]      |  |
| +-------------+ +-------------+ +-------------+  |
+--------------------------------------------------+
| BUILDER SPACES                                    |
| Next session: April 3, 2026 — Topic: ...         |
+--------------------------------------------------+
| HOW TO JOIN                                       |
| [Join the Dev Guild] [View on GitHub]             |
+--------------------------------------------------+
```

**Workspace Landing** (`/workspace`)
```
+--------------------------------------------------+
| YOUR WORKSPACE                                    |
| Access chapter, guild, and network resources      |
+--------------------------------------------------+
| [Connect Wallet] or [Sign In]                     |
+--------------------------------------------------+
| PUBLIC                    | MEMBER               |
| - Chapter profiles        | - Chapter spaces     |
| - Guild profiles          | - Guild docs         |
| - Project pages           | - Proposals          |
| - Learn resources         | - Gated resources    |
|                           | - Credentials        |
+--------------------------------------------------+
| COMING SOON                                       |
| Proposal drafting, collaborative editing,         |
| credential issuance, allocation tools.            |
| Some of these used to live in Charmverse.         |
| We're building them natively.                     |
+--------------------------------------------------+
```

---

## F. Wireframes

### F1. Homepage

```
+============================================================+
| [Logo: Green Pill]                    [Nav: Chapters | Guilds
|                                  | Projects | Learn | Stories
|                                  | Impact | Explorer | Join ]
+============================================================+

+------------------------------------------------------------+
| HERO                                                        |
|                                                             |
| Greenpill is a global regenerative network.                 |
|                                                             |
| We help local communities, builders, and storytellers       |
| coordinate real-world impact with web3 tools.               |
|                                                             |
| [Image sequence animation]                                  |
|                                                             |
| [Take the Greenpill]  [Explore the Network]                 |
+------------------------------------------------------------+

+------------------------------------------------------------+
| HOW THE NETWORK WORKS                                       |
|                                                             |
| +----------+ +----------+ +----------+ +----------+        |
| | Chapters | | Guilds   | | Pods     | | Stewards |        |
| | Local    | | Skill    | | Topic    | | Leaders  |        |
| | presence | | depth    | | cross-   | | who hold |        |
| | in 21+   | | Dev,     | | pollinate| | it all   |        |
| | cities   | | Writers  | | DeSci,   | | together |        |
| |          | |          | | Edu...   | |          |        |
| | [See     | | [See     | | [See     | | [Learn   |        |
| |  Map ->] | |  Guilds] | |  Pods]   | |  More]   |        |
| +----------+ +----------+ +----------+ +----------+        |
+------------------------------------------------------------+

+------------------------------------------------------------+
| WHAT IS ACTIVE NOW                                          |
|                                                             |
| +------------------------------+ +----------------------+  |
| | Greenpill Garden Season 1    | | Weekly Community Call |  |
| | [Program badge] [Active]     | | Every Thursday 17:00 |  |
| | Connecting stewards, tooling | | UTC                  |  |
| | and real-world outcomes      | | [Join Call]           |  |
| | across 8 chapters.           | |                      |  |
| | [Learn More]                 | +----------------------+  |
| +------------------------------+                            |
| +------------------------------+ +----------------------+  |
| | Dev Guild Builder Space      | | Writers Guild Open   |  |
| | Bi-weekly — Next: Apr 3      | | Call for Submissions |  |
| | [Join]                       | | [Pitch a Story]      |  |
| +------------------------------+ +----------------------+  |
+------------------------------------------------------------+

+------------------------------------------------------------+
| CHAPTER STORIES                                             |
|                                                             |
| "We planted 200 trees in a single weekend and documented   |
|  it onchain."                                               |
|  — Greenpill Brasil                                         |
|                                                             |
| +-------------------+ +-------------------+ +------------+ |
| | [Brasil photo]    | | [Nigeria photo]   | | [Ottawa    | |
| | Greenpill Brasil  | | Greenpill Nigeria | |  photo]    | |
| | Tree planting +   | | DeSci workshop +  | | Ottawa     | |
| | impact reporting  | | local onboarding  | | regens     | |
| | [Read Story ->]   | | [Read Story ->]   | | [Read ->]  | |
| +-------------------+ +-------------------+ +------------+ |
|                                                             |
| [See All Chapters ->]                                       |
+------------------------------------------------------------+

+------------------------------------------------------------+
| WHAT BUILDERS ARE SHIPPING                                  |
|                                                             |
| +-------------+ +-------------+ +-------------+            |
| | Green Goods | | GreenWill   | | Impact Reef |            |
| | Impact      | | Community   | | Reputation  |            |
| | measurement | | governance  | | and impact  |            |
| | [View ->]   | | [View ->]   | | [View ->]   |            |
| +-------------+ +-------------+ +-------------+            |
| +-------------+ +-------------+                             |
| | Cookie Jar  | | Gardens     |                             |
| | Micro-      | | Conviction  |                             |
| | grants      | | funding     |                             |
| | [View ->]   | | [View ->]   |                             |
| +-------------+ +-------------+                             |
|                                                             |
| [See All Projects ->]                                       |
+------------------------------------------------------------+

+------------------------------------------------------------+
| LEARN                                                       |
|                                                             |
| +---------------------------+ +---------------------------+ |
| | BOOKS                     | | PODCAST                   | |
| | [Book covers grid]        | | [Podcast cover]           | |
| | 13 publications in 10+    | | 200+ episodes exploring   | |
| | languages                 | | regenerative coordination | |
| | [Browse Library ->]       | | [Listen ->]               | |
| +---------------------------+ +---------------------------+ |
|                                                             |
| [Start the Onboarding Course ->]                            |
+------------------------------------------------------------+

+------------------------------------------------------------+
| EXPLORE THE NETWORK GRAPH                                   |
|                                                             |
| [Embedded mini-graph preview or screenshot]                 |
|                                                             |
| See how chapters, projects, protocols, and people           |
| connect across the Greenpill ecosystem.                     |
|                                                             |
| [Open Graph Explorer ->]                                    |
+------------------------------------------------------------+

+------------------------------------------------------------+
| GET INVOLVED                                                |
|                                                             |
| Who are you?                                                |
|                                                             |
| +------------------+ +------------------+                   |
| | I'm curious      | | I organize       |                   |
| | Learn the basics | | locally          |                   |
| | and find your    | | Start or join a  |                   |
| | path.            | | chapter.         |                   |
| | [Start Here ->]  | | [Chapters ->]    |                   |
| +------------------+ +------------------+                   |
| +------------------+ +------------------+                   |
| | I build          | | I write /        |                   |
| | Join the Dev     | | research         |                   |
| | Guild and ship   | | Join the Writers |                   |
| | tools.           | | Guild.           |                   |
| | [Dev Guild ->]   | | [Writers ->]     |                   |
| +------------------+ +------------------+                   |
| +------------------+ +------------------+                   |
| | I want to        | | I'm already      |                   |
| | partner / fund   | | a member         |                   |
| | Work with the    | | Go to your       |                   |
| | network.         | | workspace.       |                   |
| | [Partner ->]     | | [Workspace ->]   |                   |
| +------------------+ +------------------+                   |
+------------------------------------------------------------+

+============================================================+
| FOOTER                                                      |
| [Logo]  Chapters | Guilds | Projects | Learn | Stories     |
|         Impact | Partner | Explorer | Workspace | Join     |
|                                                             |
|  [Discord] [Twitter] [Telegram] [Warpcast] [YouTube]       |
|  [Paragraph] [GitHub]                                       |
|                                                             |
|  Made with <3 by Supermodular        (c) Greenpill Network |
+============================================================+
```

**Desktop:** Full-width sections, 4-column card grids, inline graph preview.
**Mobile:** Single-column stack, cards become full-width, graph preview becomes a CTA button, "How the Network Works" becomes a horizontal scroll or accordion.

### F2. Chapters Index

```
+============================================================+
| [Nav]                                                       |
+============================================================+

+------------------------------------------------------------+
| CHAPTERS                                                    |
| The Greenpill network operates through local chapters       |
| across 21+ cities worldwide.                                |
+------------------------------------------------------------+

+------------------------------------------------------------+
| [Interactive Map — upgraded from current canvas]            |
| Dots show activity level (size/pulse).                      |
| Clicking a dot opens the chapter card below the map.        |
| Regional clusters are labeled (Americas, Africa, Asia...).  |
+------------------------------------------------------------+

+------------------------------------------------------------+
| FILTER: [All] [Americas] [Africa] [Asia] [Europe]          |
+------------------------------------------------------------+

+------------------------------------------------------------+
| CHAPTER CARDS                                               |
|                                                             |
| +-------------------+ +-------------------+ +-----------+  |
| | [Brasil flag/img] | | [Nigeria img]     | | [Ottawa]  |  |
| | Greenpill Brasil  | | Greenpill Nigeria | | GP Ottawa |  |
| | Sao Paulo         | | Lagos             | | Canada    |  |
| | [Active] 12 mbrs  | | [Active] 8 mbrs   | | [Active]  |  |
| | Steward: @name    | | Steward: @name    | | 6 mbrs   |  |
| | Latest: Tree      | | Latest: DeSci     | | Steward:  |  |
| | planting event    | | workshop          | | @name     |  |
| | [View Chapter ->] | | [View Chapter ->] | | [View ->] |  |
| +-------------------+ +-------------------+ +-----------+  |
|                                                             |
| +-------------------+ +-------------------+ +-----------+  |
| | (more chapters...)                                     |  |
| +-------------------+ +-------------------+ +-----------+  |
+------------------------------------------------------------+

+------------------------------------------------------------+
| DON'T SEE YOUR CITY?                                        |
| [Start a Chapter ->]                                        |
| Includes: playbook, steward onboarding, support network.   |
+------------------------------------------------------------+
```

### F3. Chapter Detail

```
+============================================================+
| [Nav]                                                       |
+============================================================+

+------------------------------------------------------------+
| [eyebrow: Chapter]                                          |
| GREENPILL BRASIL                                            |
| Sao Paulo, Brazil                [Active]                   |
+------------------------------------------------------------+

+------------------------------------------------------------+
| ABOUT                                                       |
| Brief description of the chapter, its focus, and its        |
| local context.                                              |
+------------------------------------------------------------+

+------------------------------------------------------------+
| STEWARDS                                                    |
| +------------------+ +------------------+                   |
| | [avatar] @name   | | [avatar] @name   |                   |
| | Lead Steward     | | Steward          |                   |
| +------------------+ +------------------+                   |
+------------------------------------------------------------+

+------------------------------------------------------------+
| RECENT ACTIVITY                                             |
| +---------------------------------------------------+      |
| | Apr 2026 — Tree planting event (200 trees)        |      |
| | Mar 2026 — Community call with 15 attendees       |      |
| | Feb 2026 — Impact report submitted                |      |
| +---------------------------------------------------+      |
+------------------------------------------------------------+

+------------------------------------------------------------+
| IMPACT                                                      |
| +------------+ +------------+ +------------+               |
| | 200 trees  | | 45 members | | 3 events   |               |
| | planted    | | onboarded  | | this qtr   |               |
| +------------+ +------------+ +------------+               |
+------------------------------------------------------------+

+------------------------------------------------------------+
| CONNECTED                                                   |
| Guilds: [Dev Guild chip] [Writers Guild chip]               |
| Projects: [Green Goods chip]                                |
| Region: [Americas chip]                                     |
+------------------------------------------------------------+

+------------------------------------------------------------+
| JOIN THIS CHAPTER                                           |
| [Join Telegram] [Join Discord] [View Workspace]             |
+------------------------------------------------------------+

+------------------------------------------------------------+
| [< Back to Chapters]                                        |
+------------------------------------------------------------+
```

### F4. Guilds & Pods Index

```
+============================================================+
| [Nav]                                                       |
+============================================================+

+------------------------------------------------------------+
| GUILDS & PODS                                               |
| Guilds organize around skills. Pods organize around topics. |
+------------------------------------------------------------+

+------------------------------------------------------------+
| GUILDS                                                      |
|                                                             |
| +---------------------------+ +---------------------------+ |
| | [icon] DEV GUILD          | | [icon] WRITERS GUILD      | |
| | Building coordination     | | Publishing, storytelling, | |
| | tools and protocols       | | and knowledge work        | |
| | [Active] 24 members       | | [Active] 15 members       | |
| | 7 projects                | | Paragraph publication     | |
| | [View Guild ->]           | | [View Guild ->]           | |
| +---------------------------+ +---------------------------+ |
+------------------------------------------------------------+

+------------------------------------------------------------+
| PODS                                                        |
|                                                             |
| +-------------+ +-------------+ +-------------+ +--------+ |
| | Education   | | Environment | | DeSci       | | DePin  | |
| | [Forming]   | | [Active]    | | [Forming]   | | [New]  | |
| | [View ->]   | | [View ->]   | | [View ->]   | |[View]  | |
| +-------------+ +-------------+ +-------------+ +--------+ |
+------------------------------------------------------------+

+------------------------------------------------------------+
| START A GUILD OR POD                                        |
| Have an idea for a new guild or topic pod?                  |
| [Propose a Guild ->]                                        |
+------------------------------------------------------------+
```

### F5. Guild Detail

```
+============================================================+
| [Nav]                                                       |
+============================================================+

+------------------------------------------------------------+
| [eyebrow: Guild]                                            |
| DEV GUILD                                                   |
| Building coordination tools for the regenerative network    |
| [Active]  [24 members]  [7 projects]                        |
+------------------------------------------------------------+

+------------------------------------------------------------+
| WHAT WE BUILD                                               |
| The Dev Guild ships open-source tools for impact            |
| measurement, capital allocation, community governance,      |
| and reputation.                                             |
+------------------------------------------------------------+

+------------------------------------------------------------+
| CURRENT PROJECTS                                            |
| +-------------+ +-------------+ +-------------+            |
| | Green Goods | | GreenWill   | | Impact Reef |            |
| | [Active]    | | [Active]    | | [Beta]      |            |
| | Impact      | | Governance  | | Reputation  |            |
| | measurement | | toolkit     | | system      |            |
| | [View ->]   | | [View ->]   | | [View ->]   |            |
| +-------------+ +-------------+ +-------------+            |
+------------------------------------------------------------+

+------------------------------------------------------------+
| BUILDER SPACES                                              |
| Bi-weekly open sessions for contributors.                   |
| Next: April 3, 2026 at 18:00 UTC                           |
| [Join Builder Space ->]                                     |
+------------------------------------------------------------+

+------------------------------------------------------------+
| MEMBERS                                                     |
| [avatar chips row — clickable to profiles when available]   |
+------------------------------------------------------------+

+------------------------------------------------------------+
| REPOSITORIES                                                |
| [GitHub org link] [Key repos with star counts]              |
+------------------------------------------------------------+

+------------------------------------------------------------+
| HOW TO JOIN                                                 |
| 1. Join the Discord #dev-guild channel                      |
| 2. Attend a Builder Space session                           |
| 3. Pick an open issue or propose a project                  |
| [Join the Dev Guild ->]                                     |
+------------------------------------------------------------+
```

### F6. Projects & Protocols

```
+============================================================+
| [Nav]                                                       |
+============================================================+

+------------------------------------------------------------+
| PROJECTS & PROTOCOLS                                        |
| Tools and experiments built by the Greenpill network.       |
+------------------------------------------------------------+

+------------------------------------------------------------+
| FILTER: [All] [Active] [Beta] [Completed] [Experimental]   |
+------------------------------------------------------------+

+------------------------------------------------------------+
| +---------------------------+ +---------------------------+ |
| | GREEN GOODS               | | GREENWILL                 | |
| | Impact measurement and    | | Community governance      | |
| | verification              | | toolkit                   | |
| | Guild: Dev Guild          | | Guild: Dev Guild          | |
| | [Active] [Solidity,React] | | [Active] [React, Node]   | |
| | [View Project ->]         | | [View Project ->]         | |
| +---------------------------+ +---------------------------+ |
| +---------------------------+ +---------------------------+ |
| | IMPACT REEF               | | COOKIE JAR                | |
| | Reputation and impact     | | Micro-grants and          | |
| | tracking                  | | community funding         | |
| | [Beta]                    | | [Active]                  | |
| | [View Project ->]         | | [View Project ->]         | |
| +---------------------------+ +---------------------------+ |
| +---------------------------+ +---------------------------+ |
| | GARDENS                   | | ALLO EXPERIMENTS          | |
| | Conviction funding        | | Capital allocation        | |
| | mechanisms                | | strategies                | |
| | [Active]                  | | [Experimental]            | |
| | [View Project ->]         | | [View Project ->]         | |
| +---------------------------+ +---------------------------+ |
+------------------------------------------------------------+

+------------------------------------------------------------+
| CONTRIBUTE                                                  |
| All projects are open source. Find open issues on GitHub    |
| or join a Builder Space to connect with maintainers.        |
| [View GitHub Org ->] [Join Builder Space ->]                |
+------------------------------------------------------------+
```

### F7. Learn / Knowledge Commons

```
+============================================================+
| [Nav]                                                       |
+============================================================+

+------------------------------------------------------------+
| LEARN                                                       |
| The Greenpill knowledge commons: books, podcast,            |
| onboarding, and resources for regenerative coordination.    |
+------------------------------------------------------------+

+------------------------------------------------------------+
| START HERE                                                  |
| +------------------------------------------------------+   |
| | TAKING THE GREENPILL                                  |   |
| | A guided introduction to the network.                 |   |
| | 5 steps — 30 minutes — no prerequisites               |   |
| | [Start the Course ->]                                 |   |
| +------------------------------------------------------+   |
+------------------------------------------------------------+

+------------------------------------------------------------+
| BOOKS                                                       |
| [Current BookSection layout, slightly condensed]            |
| Featured: Pathways to Regeneration                          |
| [Browse Full Library ->]                                    |
+------------------------------------------------------------+

+------------------------------------------------------------+
| PODCAST                                                     |
| [Current PodcastSection layout]                             |
| 200+ episodes exploring regenerative coordination.          |
| [Listen Anywhere ->] [View on YouTube ->]                   |
+------------------------------------------------------------+

+------------------------------------------------------------+
| RESOURCES                                                   |
| +------------------+ +------------------+ +-------------+  |
| | Chapter Starter  | | Steward          | | Impact      |  |
| | Kit              | | Playbook         | | Reporting   |  |
| | [Download]       | | [View]           | | Guide       |  |
| |                  | |                  | | [View]      |  |
| +------------------+ +------------------+ +-------------+  |
+------------------------------------------------------------+
```

### F8. Stories & Updates

```
+============================================================+
| [Nav]                                                       |
+============================================================+

+------------------------------------------------------------+
| STORIES                                                     |
| Field reports, essays, updates, and dispatches from         |
| across the Greenpill network.                               |
+------------------------------------------------------------+

+------------------------------------------------------------+
| FILTER: [All] [Chapters] [Guilds] [Programs] [Essays]      |
+------------------------------------------------------------+

+------------------------------------------------------------+
| FEATURED                                                    |
| +------------------------------------------------------+   |
| | [large photo]                                        |   |
| | Greenpill Garden Season 1: What We Learned           |   |
| | Mar 15, 2026 — Program Update                        |   |
| | [Read Story ->]                                      |   |
| +------------------------------------------------------+   |
+------------------------------------------------------------+

+------------------------------------------------------------+
| RECENT                                                      |
| +------------------+ +------------------+ +-------------+  |
| | [photo]          | | [photo]          | | [photo]     |  |
| | Brasil tree      | | Dev Guild ships  | | Nigeria     |  |
| | planting event   | | Green Goods v2   | | DeSci       |  |
| | Feb 28, 2026     | | Mar 1, 2026      | | workshop    |  |
| | Chapter Update   | | Guild Update     | | Mar 5, 2026 |  |
| | [Read ->]        | | [Read ->]        | | [Read ->]   |  |
| +------------------+ +------------------+ +-------------+  |
+------------------------------------------------------------+

+------------------------------------------------------------+
| LOAD MORE                                                   |
+------------------------------------------------------------+
```

### F9. Workspace Landing

```
+============================================================+
| [Nav]                                        [Connect Wallet]
+============================================================+

+------------------------------------------------------------+
| YOUR WORKSPACE                                              |
| Access chapter, guild, and network resources.               |
+------------------------------------------------------------+

+--- IF NOT CONNECTED ----------------------------------------+
|                                                             |
| Connect your wallet to access member resources.             |
|                                                             |
| [Connect Wallet]                                            |
|                                                             |
| PUBLIC RESOURCES (available without login):                 |
| - Chapter and guild profiles                                |
| - Project pages                                             |
| - Books and podcast                                         |
| - Stories and updates                                       |
|                                                             |
+--- IF CONNECTED --------------------------------------------+
|                                                             |
| Welcome, 0x1234...abcd                   [Profile] [Logout] |
|                                                             |
| YOUR ROLES                                                  |
| [Chapter Steward: Brasil] [Dev Guild Member]                |
|                                                             |
| YOUR SPACES                                                 |
| +---------------------------+ +---------------------------+ |
| | Greenpill Brasil          | | Dev Guild                 | |
| | Chapter Workspace         | | Guild Workspace           | |
| | [3 new updates]           | | [1 proposal in review]    | |
| | [Open ->]                 | | [Open ->]                 | |
| +---------------------------+ +---------------------------+ |
|                                                             |
| YOUR CREDENTIALS                                            |
| [Steward Season 1] [Garden Participant] [Builder Spaces x3]|
|                                                             |
| PROPOSALS                                                   |
| +------------------------------------------------------+   |
| | Proposal: Q2 Chapter Budget — [In Review]            |   |
| | Proposal: Impact Reef Integration — [Voting]         |   |
| +------------------------------------------------------+   |
|                                                             |
+------------------------------------------------------------+

+------------------------------------------------------------+
| MIGRATION NOTICE                                            |
| Some workspace features are still being built. Resources    |
| that previously lived in Charmverse are being migrated.     |
| [View migration status ->] [Need help finding something?]  |
+------------------------------------------------------------+
```

### F10. Gated Member Page (example: Chapter Workspace)

```
+============================================================+
| [Nav]                                [Wallet: 0x1234...abcd]
+============================================================+

+------------------------------------------------------------+
| [eyebrow: Chapter Workspace]                                |
| GREENPILL BRASIL                                            |
| Private workspace for chapter stewards and members.         |
+------------------------------------------------------------+

+--- IF NOT AUTHORIZED ---------------------------------------+
|                                                             |
| [Lock icon]                                                 |
| This workspace is available to Greenpill Brasil members.    |
|                                                             |
| To access:                                                  |
| 1. Connect your wallet                                      |
| 2. Hold a Greenpill Brasil membership token                 |
|    OR be added to the chapter allowlist                      |
|                                                             |
| [Connect Wallet] [Request Access]                           |
|                                                             |
| PUBLIC CHAPTER PROFILE:                                     |
| You can still view the public chapter page.                 |
| [View Greenpill Brasil ->]                                  |
|                                                             |
+--- IF AUTHORIZED -------------------------------------------+
|                                                             |
| QUICK LINKS                                                 |
| [Chapter Docs] [Meeting Notes] [Budget] [Proposals]        |
|                                                             |
| RECENT DOCUMENTS                                            |
| +------------------------------------------------------+   |
| | Q2 2026 Planning Notes — Updated 2 days ago          |   |
| | Tree Planting Impact Report — Updated 1 week ago     |   |
| | Steward Onboarding Guide — Updated 3 weeks ago       |   |
| +------------------------------------------------------+   |
|                                                             |
| CHAPTER PROPOSALS                                           |
| +------------------------------------------------------+   |
| | Q2 Budget Request — [Draft] — Edit                   |   |
| | Partnership with Local NGO — [Approved]              |   |
| +------------------------------------------------------+   |
|                                                             |
| MEMBERS                                                     |
| [avatar] @steward1 (Lead)  [avatar] @member2               |
| [avatar] @member3          [avatar] @member4               |
|                                                             |
+------------------------------------------------------------+
```

---

## G. Design System Extensions

These components should be added to the existing component library, using the current Greenpill aesthetic (dark backgrounds, glass-morphism panels, lime/gold accents, Volkhov headings).

### Card Families

**Network Card** (for chapters, guilds, pods)
- Glass-morphism panel with `border: 1px solid var(--explorer-border)`
- `backdrop-filter: blur(18px)` consistent with explorer panels
- Eyebrow label (Chapter / Guild / Pod) in lime green uppercase
- Title in Volkhov gold
- Status badge (Active, Forming, Inactive)
- 2-3 metadata chips (member count, project count, location)
- Hover: subtle border glow, slight translate
- Used on: `/chapters`, `/guilds`, homepage sections

**Project Card**
- Similar glass panel
- Eyebrow: "Project" or "Protocol"
- Title, one-line description
- Tech stack chips (Solidity, React, etc.)
- Status badge (Active, Beta, Experimental, Completed)
- Guild attribution chip
- Used on: `/projects`, guild detail pages, homepage

**Story Card**
- Glass panel with optional header image area
- Date + category label
- Title in Volkhov gold
- 2-line excerpt
- Category: Chapter Update, Guild Update, Program Update, Essay, Field Report
- Used on: `/stories`, homepage

**Book Card** (existing, minimal changes)
- Keep current BookCard.astro pattern
- Add "Recommended starting point" highlight variant
- Used on: `/learn/books`

**Workspace Access Card**
- Glass panel with lock/unlock icon
- Space name and type
- Access level indicator (Public, Member, Chapter, Guild, Steward)
- Notification badge for updates
- Used on: `/workspace`

### Filter Components

**Pill Row Filter** (already exists in explorer, should be promoted to shared component)
- Horizontal row of pill buttons
- Active state: lime green background, dark text
- Inactive state: transparent with subtle border
- Used on: chapters (by region), guilds (by type), projects (by status), stories (by category)

**Region Filter** (for chapters)
- Pill row variant with region labels: All, Americas, Africa, Asia, Europe
- Ties to map view state

### Status and Metadata Components

**Status Badge**
- Small pill: Active (lime), Forming (gold), Beta (explorer-bridge orange), Inactive (muted)
- Used on cards, detail page headers, workspace items

**Credential Chip**
- Small pill with icon prefix
- Variants: Chapter Steward, Guild Contributor, Program Participant, Builder
- Used on profiles, chapter/guild detail pages, workspace

**Impact Metric Block**
- Small glass cell (like `detail-cell` in explorer.css)
- Numeric value (large) + label (small, muted, uppercase)
- Used on chapter details, impact page, project details

**Member Count Chip**
- Inline: icon + number + "members"
- Used on cards and headers

### Onboarding Components

**Role Card** (for "Get Involved" section)
- Glass panel with role icon
- Role name (Curious, Organizer, Builder, Writer, Partner, Member)
- 2-line description
- Single CTA button
- Used on: homepage "Get Involved" section, `/join`

**Onboarding Step**
- Numbered step indicator with completion state
- Title + description
- Expandable content area (text, video, book embed)
- Progress bar
- Used on: `/learn/onboarding`

### Migration and Transition Components

**Migration Banner**
- Full-width, subtle, dismissible
- Yellow/gold accent border
- Message: "This page has moved from Charmverse. [Learn more]"
- Used on: any page that replaces a Charmverse URL

**Archive Notice**
- Inline block within content areas
- "This content was archived from Charmverse on [date]. It may be outdated."
- Used on: migrated docs that have not been updated

**"Coming Soon" Block**
- Glass panel with muted styling
- Title + description of upcoming feature
- "Previously in Charmverse" note if applicable
- Used on: workspace, gated areas

**Redirect Landing**
- Full page or modal for old Charmverse URLs
- "This page has a new home" with direct link
- "Need help? [Contact]"
- Used as a catch-all for broken Charmverse links during transition

### Navigation Components

**Section Nav** (for pages with many sub-sections)
- Sticky horizontal pill row below main nav
- Scrolls with the page, highlights current section
- Used on: Learn (Books | Podcast | Onboarding | Resources), Chapters (Map | Cards)

**Breadcrumb**
- Simple: Home > Chapters > Greenpill Brasil
- Muted text, lime green for links
- Used on: all detail pages

### Ecosystem and Relationship Components

**Relationship Chip Row**
- Horizontal row of clickable chips showing connections
- "Guilds: [Dev Guild] [Writers Guild]" / "Projects: [Green Goods]"
- Used on: chapter details, guild details, project details

**Partner Logo Row**
- Horizontal row of partner organization logos
- Muted by default, full color on hover
- Used on: `/partner`, homepage

**Graph Entry Module**
- Preview card with mini graph visualization or screenshot
- Title + description
- CTA to open full explorer
- Used on: homepage, chapter detail (showing that chapter's connections)

### Map Components

**Enhanced Chapter Map**
- Upgrade from current canvas to interactive map with:
  - Activity-based dot sizing (more active = larger dot)
  - Regional cluster labels
  - Click to expand inline chapter card (not external link)
  - Filter by region
- Mobile: full-width, scrollable, with list fallback below

---

## H. Migration Experience

### Principles

1. **No broken links without explanation.** Every Charmverse URL that Greenpill has shared publicly should either redirect to a new page or land on a "this moved" notice.
2. **Visible progress, not invisible transitions.** Users should see that Greenpill is intentionally moving to its own platform. This builds trust.
3. **Public surfaces first, gated surfaces second.** Replace public-facing content before internal workspace features.
4. **Graceful hybrid state.** For features that are not yet built (proposals, credentials), show a clear "coming soon" block that acknowledges the gap and provides a temporary alternative.

### What gets replaced first (user-visible priority)

| Priority | Surface | Why first |
| --- | --- | --- |
| P0 | Homepage Charmverse links (ParticipateSection, ExploreSection) | These are the first things to break and the most visible. |
| P0 | Beginner onboarding ("Taking the Greenpill") | High-traffic entry point. Must not dead-end. |
| P0 | Guild directory link | Currently the only way to find guilds. Must become a real page. |
| P1 | Chapter detail pages | Map dots currently link externally. Need internal destinations. |
| P1 | Guild and pod detail pages | Visible proof the network structure exists. |
| P1 | `/workspace` landing page | Even before full workspace features, a landing page that explains what is coming and provides interim alternatives. |
| P2 | Gated workspace features | Wallet auth, token gating, chapter/guild spaces. |
| P3 | Proposals, credentials, reputation | Deeper operational features. |

### What gets redirected

For any Charmverse URL that Greenpill has publicly shared or linked:

1. **Create a redirect map** (spreadsheet or config file) mapping old Charmverse URLs to new internal routes.
2. **For URLs you control** (links on the website, shared in Discord/Telegram), update them directly.
3. **For URLs you don't control** (shared by others, indexed by search engines, bookmarked), create redirect landing pages at predictable internal routes that explain the move.

Example redirect landing:

```
+------------------------------------------------------------+
| [Greenpill logo]                                            |
|                                                             |
| THIS PAGE HAS MOVED                                        |
|                                                             |
| The Greenpill guild directory has moved from Charmverse     |
| to our new website.                                         |
|                                                             |
| [Go to Guilds & Pods ->]                                    |
|                                                             |
| Looking for something else? [See the full site map]         |
| Questions? [Join Discord]                                   |
+------------------------------------------------------------+
```

### What should be public vs. gated

| Content | Access Level | Reason |
| --- | --- | --- |
| Chapter profiles | Public | Discovery and onboarding. Anyone should be able to find their local chapter. |
| Guild profiles | Public | Same. Must be visible to attract new members. |
| Project pages | Public | Builders and partners need to see what exists. |
| Stories and updates | Public | The editorial layer is a marketing and trust surface. |
| Impact and reputation summaries | Public | Partners and funders evaluate credibility here. |
| Books, podcast, onboarding | Public | The knowledge commons is the network's main entry funnel. |
| Chapter workspace docs | Member (chapter members) | Operational docs should be scoped. |
| Guild workspace docs | Member (guild members) | Same. |
| Steward playbooks | Member (stewards) | Some operational guidance may be sensitive or in-progress. |
| Proposal drafts | Member (relevant scope) | Governance context should be visible to participants. |
| Credentials and attestations | Public display, member issuance | Public proof, but only members can mint/claim. |
| Budget and allocation data | Steward or member, depending on scope | Financial data may need access controls. |

### How to handle "this used to live in Charmverse" moments

**Strategy: Acknowledge, redirect, and show progress.**

1. **Migration Banner** (persistent, dismissible): On any page that replaces Charmverse content, show a subtle banner: "This page has moved from Charmverse to greenpill.network. [Learn about the migration]"

2. **Migration Status Page** (`/workspace` or `/migration`): A simple page listing:
   - What has moved
   - What is in progress
   - What is coming next
   - Temporary alternatives for features not yet replaced

3. **"Looking for Charmverse?" link**: In the footer or workspace landing, include a small link: "Previously used Charmverse? [See what moved where]"

4. **Discord announcement**: Pin a message in Discord with the migration map. Update it as features move.

5. **Timeline transparency**: Show dates. "Guild pages launched March 2026. Workspace docs coming May 2026." Specific dates build trust.

### Temporary hybrid states

For features that cannot be immediately replaced:

| Feature | Hybrid Strategy |
| --- | --- |
| Collaborative docs | "Coming soon" block on workspace, with link to temporary bridge tool (Docmost/AFFiNE) if deployed |
| Proposals | "Proposals are currently drafted in [temporary tool]. We're building a native proposal system." |
| Token gating | "Wallet-gated features are coming. For now, use Discord role-gating." |
| Credentials | "Credential display is coming. Your contributions are tracked and will be reflected here." |

The key is: **never show an empty page without explanation.** Every gap should have a "coming soon" block that says what is planned and when.

---

## I. Prioritized Front-End Roadmap

This is a UI/UX-first priority order. It assumes the content model and routes can be built incrementally.

### Phase 1: Foundation (Weeks 1-3)

**Goal:** Replace the homepage narrative and create real page destinations for the most critical Charmverse link targets.

1. **New homepage structure** — Rewrite `index.astro` with the section order from the wireframe above. Replace the current Hero, ParticipateSection, and ExploreSection. Keep ChapterMap (with minor upgrades), condense BookSection and PodcastSection into a combined Learn preview.

2. **New navigation** — Replace the current 4-item anchor nav with a real site navigation: Chapters, Guilds, Projects, Learn, Stories, Explorer, Join. Mobile: hamburger with full section list.

3. **New footer** — Add site navigation links, social links (moved from ExploreSection), and newsletter/contact. Keep Supermodular attribution.

4. **`/chapters` index page** — Chapter cards grid with upgraded map. Replace external links with internal chapter card click targets.

5. **`/guilds` index page** — Guild and pod cards. Replace the single Charmverse guild link.

6. **`/join` page** — Role-based onboarding hub replacing the Beginner/Intermediate/Advanced ladder.

7. **`/learn/onboarding` page** — "Taking the Greenpill" content migrated from Charmverse into a guided course layout.

8. **Remove all Charmverse links** from ParticipateSection, ExploreSection, and social-links.json. Replace with internal routes.

### Phase 2: Content Depth (Weeks 3-6)

**Goal:** Give every major section real content and detail pages.

9. **`/chapters/[slug]` detail pages** — Chapter profiles with stewards, activity, impact, and join links.

10. **`/guilds/[slug]` detail pages** — Guild profiles with projects, members, events, and join flow.

11. **`/projects` index page** — Project cards with status, guild attribution, and tech stack.

12. **`/projects/[slug]` detail pages** — Project profiles with description, contributors, repos, and status.

13. **`/learn` hub page** — Reorganized Learn section with books, podcast, onboarding, and resources as sub-sections.

14. **`/stories` index page** — Story cards with category filters. Requires story content type in Keystatic.

15. **`/partner` page** — Partnership surface with areas of collaboration, partner logos, and contact path.

16. **Design system components** — Build the shared card families, status badges, filter pills, credential chips, and migration banners as reusable Astro components.

### Phase 3: Workspace and Identity (Weeks 6-10)

**Goal:** Create the member-facing layer.

17. **`/workspace` landing page** — Explains access tiers, shows migration status, provides connect-wallet CTA.

18. **Wallet connect in nav** — SIWE integration, session handling.

19. **`/impact` page** — Public impact evidence: chapter reports, project metrics, credential summaries.

20. **Enhanced explorer overlays** — Add chapter, guild, and project layers to the existing graph explorer.

21. **Gated route infrastructure** — Token/NFT gating for workspace sub-pages.

### Phase 4: Coordination Features (Weeks 10-16)

**Goal:** Replace deeper Charmverse functions.

22. **Chapter and guild workspace pages** — Block editor, docs, meeting notes.

23. **Proposal drafting and review** — Proposal cards, status flow, Snapshot bridge.

24. **Credential display** — EAS-backed credential chips on profiles and chapter/guild pages.

25. **Member profiles** — Wallet, roles, credentials, contribution history.

---

## Appendix: Visual Direction Notes

Two evolutionary visual directions that fit within the current brand:

### Direction A: "Living Network"

Lean into the organic, networked feel. Add subtle animation to cards (idle breathing), connect cards with faint lines suggesting relationships (like a simplified graph), use the parallax elements more purposefully. Homepage feels like looking at a living ecosystem diagram, not a brochure.

- Cards have subtle ambient animation (scale pulse on idle)
- Section transitions use the image sequence technique to morph between states
- The chapter map becomes more expressive: dots pulse with activity, regional connections are drawn
- Color temperature shifts slightly by section (warmer for chapters/stories, cooler for projects/explorer)

### Direction B: "Editorial Network"

Lean into the editorial quality. Larger typography, more whitespace within glass panels, featured images with editorial cropping, a magazine-like story grid. The site feels like a well-designed publication about a living network.

- Larger Volkhov display sizes for section headers
- Story cards with generous image areas and editorial typography
- Chapter profiles use a photo essay layout
- Guild pages have a clean project portfolio feel
- More intentional use of the gold accent for editorial highlights

**Recommendation:** Direction A for the homepage and explorer-adjacent pages. Direction B for Stories, Learn, and chapter/guild detail pages. The two can coexist — the homepage pulls you in with living-network energy, and detail pages deliver editorial depth.

---

## Source Files Referenced

| File | Role in audit |
| --- | --- |
| `src/pages/index.astro` | Current homepage structure and section order |
| `src/components/Hero.astro` | Hero section: tagline and image sequence |
| `src/components/ChapterMap.astro` | Canvas-based chapter map with external links |
| `src/components/BookSection.astro` | Book library grid with translations |
| `src/components/PodcastSection.astro` | Podcast section with CTAs |
| `src/components/ParticipateSection.astro` | Beginner/Intermediate/Advanced link ladder; multiple Charmverse links |
| `src/components/ExploreSection.astro` | Social links section (Discord, Charmverse, Twitter, Telegram) |
| `src/components/GraphExplorer.astro` | Graph explorer: glass panels, search, inspector |
| `src/components/Nav.astro` | Navigation: 4 anchor links, mobile hamburger |
| `src/components/Footer.astro` | Supermodular attribution only |
| `src/styles/global.css` | Brand colors, type, button styles, modal |
| `src/styles/explorer.css` | Explorer-specific glass-morphism design system |
| `keystatic.config.ts` | Content model: chapters, books, podcast, social links |
| `docs/research/greenpill-current-state.md` | Network research: what Greenpill actually is now |
| `docs/research/greenpill-website-direction.md` | IA and audience strategy |
| `docs/research/greenpill-knowledge-map.md` | Network relationship model |
| `docs/research/greenpill-charmverse-transition.md` | Charmverse migration plan and stack recommendations |
