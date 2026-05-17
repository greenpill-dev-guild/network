# Greenpill V2 Delivery Plan

## P0: Synthesis and handoff

### Goal

Turn the workshop, async thread, and board into aligned docs and one machine handoff artifact.

### Outputs

- aligned V2 brief, architecture, and delivery docs
- finalized migration mapping
- validated `ai-build-manifest.yaml`
- active steward decision pack in `.plans/active/v2-steward-decision-pack/`
- short steward brief and Telegram question set for unresolved narrative decisions

### Acceptance criteria

- the canonical docs do not contradict one another on routes, hosting, auth, or phase order
- every visible public Charmverse entry point has a mapped destination
- unresolved steward decisions are tracked in the active plan hub, not as loose notes
- implementation can describe P1 in one sentence and estimate it without another synthesis pass

## P1: Public foundation and Charmverse replacements

### Goal

Ship the first public-facing version of V2 that fixes the most visible broken dependency risk and tells a clearer network story.

### In scope

- homepage rewrite around Greenpill as a living network
- homepage promise and proof model informed by the steward decision pack
- real navigation instead of section-only anchors
- `/join`
- `/chapters`
- `/guilds`
- `/learn/onboarding`
- removal of public Charmverse links from homepage components and the social link singleton
- Knowledge Commons Graph Explorer deferred into `.plans/backlog/knowledge-commons-graph-explorer/`

### Acceptance criteria

- no public Charmverse CTA remains in:
  - `src/components/ParticipateSection.astro`
  - `src/components/ExploreSection.astro`
  - `src/content/social-links.json`
- homepage clearly routes to `/join`, `/chapters`, `/guilds`, and `/learn/onboarding`
- `/join` explains pathways instead of acting as a generic dump of external links
- `/guilds` exists as an internal destination
- `/learn/onboarding` exists as an internal destination
- the former public explorer route is not shipped until the graph has source lineage, relationship grammar, maturity states, and stewardship review

### Non-goals

- workspace auth or collaboration tooling
- chapter detail pages for every chapter
- project and story detail systems
- public graph explorer implementation

## P2: Public entity pages and knowledge commons

### Goal

Deepen the public site so it reflects the actual network structure and gives people better pathways into chapters, guilds, projects, learning, and stories.

### In scope

- `/chapters/[slug]`
- `/guilds/[slug]`
- `/projects`
- `/projects/[slug]`
- `/stories`
- `/stories/[slug]`
- `/learn`
- expanded Keystatic content model
- replacement of chapter-level external map destinations with internal chapter routes
- public themes and reusable people/steward profile contracts
- private node-intake contracts for submitted map/member nodes, email privacy, and approved public projections

### Acceptance criteria

- chapter routes exist and supported map links no longer depend on raw Charmverse URLs
- guild routes exist and link to current work or projects
- projects become first-class public proof of network activity
- the site has a coherent `learn` surface beyond homepage sections
- Keystatic can author the new public entities without ad hoc hardcoding
- the public map reads chapter data from the `chapters` collection rather than a separate hand-maintained JSON file
- private map-node contracts prove public payloads exclude email, private notes, spam metadata, and pending submissions

### Non-goals

- full workspace parity
- gated experiences
- governance and allocation execution
- choosing or deploying the private CMS/admin layer

## P3: Workspace app foundation

### Goal

Create the first real Greenpill workspace application and define the boundary between the public website and member operations.

### In scope

- `app.greenpill.network` as the workspace hostname
- workspace frontend on Vercel
- Fly-backed agent, auth/session, and realtime collaboration services
- Privy-first auth with email, social, passkey, and wallet
- collaborative docs and structured databases as the first workspace primitives
- `public / member / steward` permissions
- manual export path from workspace content into canonical public content

### Acceptance criteria

- workspace hostname exists
- login lives only in the workspace, not on the public site
- member-operation CTAs route directly to `https://app.greenpill.network/login`
- backend responsibilities for the agent service, auth, and realtime are explicit
- docs and databases are the first defined workspace primitives
- wallet is supported on the workspace login surface
- manual export to public content is the only publishing mode described for V1

### Non-goals

- token or NFT gating
- proposal execution
- multisig flows
- attestation-backed reputation
- automatic workspace-to-public publishing

## Charmverse migration map

### Migration rules

- every public Charmverse link should have a website-native replacement or a clear transition page
- replace homepage entry-point links before deeper workspace parity work
- group chapter-level Charmverse links behind chapter profile routes instead of leaving them as raw external destinations
- use `/join` for public onboarding and orientation
- use `https://app.greenpill.network/login` for member-operation entry points

### Current touchpoints

| Surface | Source | Current destination | Intended replacement | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| Taking the Greenpill onboarding | `src/components/ParticipateSection.astro` | `https://app.charmverse.io/greenpill-network/taking-the-greenpill-4871995012783201` | `/learn/onboarding` | P1 | Replace with guided onboarding page and migration note if needed |
| Charmverse workspace CTA | `src/components/ParticipateSection.astro` | `https://app.charmverse.io/greenpill-network/` | `https://app.greenpill.network/login` | P3 | Member-operation CTA should go directly to workspace login instead of an in-site route |
| Guild directory CTA | `src/components/ParticipateSection.astro` | `https://app.charmverse.io/greenpill-network/guilds-29059086676991` | `/guilds` | P1 | Guild index page replaces the single external guild link |
| Charmverse invite CTA | `src/components/ExploreSection.astro` | `https://app.charmverse.io/invite/5e5ee6` | `/join` | P1 | This should become a public routing page, not a workspace dependency |
| Social singleton Charmverse links | `src/content/social-links.json` | workspace and invite URLs | `/join` and `https://app.greenpill.network/login` | P1 / P3 | Use `/join` for public orientation and workspace login for member operations |
| Chapter map links | `src/pages/locations.json.ts` + `src/content/chapters/*.json` | chapter-specific Charmverse pages | `/chapters/[slug]` | P2 | Generate public map data from chapter content and replace external map links with internal chapter detail routes |
| Chapter content links | `src/content/chapters/*.json` | chapter-specific Charmverse pages | `/chapters/[slug]` | P2 | Chapter profiles should become the canonical destination |

### Follow-up inventory outside the repo

- Charmverse pages and databases not currently linked from the public site
- images, files, and attachments that need export
- onboarding copy that should be migrated into `learn`
- guild and workspace structure that still needs a durable home
- any public links previously shared in Discord, forums, or docs that should redirect cleanly
