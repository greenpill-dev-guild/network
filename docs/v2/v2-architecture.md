# Greenpill V2 Architecture

## Current repo baseline

The current repo already provides:

- `Astro 5`
- `Keystatic` with file-backed public content
- existing public routes:
  - `/`
- a baseline design language and non-public graph research data

The main gap is not framework choice. It is missing route depth, content model breadth, and a clear split between the public website and member operations. The Knowledge Commons Graph Explorer is deferred until source lineage, relationship grammar, maturity labels, public-use boundaries, and stewardship are ready.

## Domain and runtime model

| Surface | Hostname | Platform | Responsibility |
| --- | --- | --- | --- |
| Public site | `greenpill.network` | GitHub Pages currently; Vercel optional later | marketing, onboarding, chapters, guilds, stories, and library |
| Workspace frontend | `app.greenpill.network` | TBD; Vercel candidate | authenticated React app for member operations |
| Agent service | `agent.greenpill.network` | Fly | deterministic routes, auth/session, cache jobs, publishing helpers, and future interactive agent workflows |
| Realtime | `realtime.greenpill.network` | Fly | Yjs/Hocuspocus collaboration |
| Assets | `assets.greenpill.network` | Tigris-backed delivery | uploads, media, exports |

## Monorepo default

The default repo posture is an explicit package workspace using `packages/*`, matching the sibling Greenpill repos.

Current package shape:

- `packages/website` owns the public Astro + Keystatic website for `greenpill.network`.
- `packages/workspace` reserves the authenticated workspace boundary, but no workspace UI yet.
- `packages/agent` owns the Fly-hosted agent/cache service scaffold.
- `packages/shared` owns reusable public/private-boundary contracts that must be shared by the website, workspace app, and agent service.
- future package work should depend on shared packages instead of re-creating contracts inside each package

## Public site architecture

### Public routes

- `/`
- `/join`
- `/chapters`
- `/chapters/[slug]`
- `/guilds`
- `/guilds/[slug]`
- `/projects`
- `/projects/[slug]`
- `/learn`
- `/learn/onboarding`
- `/stories`
- `/stories/[slug]`

The former graph explorer is not a public route in the current architecture. Future graph work is tracked in `.plans/backlog/knowledge-commons-graph-explorer/`.

### Public content boundary

`Keystatic` remains canonical for public content.

Existing entities to retain:

- books
- chapters
- site settings
- podcast
- social links

New public entities to support:

- guilds
- pods
- projects
- stories
- programs
- resources
- themes
- people/stewards

### Public map data

Chapter map data is generated from the `chapters` collection through `/locations.json`. a checked-in public `locations.json` file is no longer a hand-maintained content source. Approved user-submitted nodes should enter the public map only through a private-store projection that exposes safe public fields.

### Chapter impact data

Chapter pages can opt into public impact feeds through `impactSources` on chapter content. These bindings are public-safe source pointers only: Green Goods garden address and chain, KarmaGAP project UID/slug, KarmaGAP community slug, and an `impactEnabled` flag.

The public site exposes enabled source bindings through `/impact-sources.json`. `agent.greenpill.network` should run the server-side cache that reads those bindings, fetches KarmaGAP public REST data, queries the Green Goods public indexer, normalizes the result with `@greenpill/network-shared/chapter-impact`, stores it in Fly Managed Postgres, and exposes `GET /impact/chapters/:slug` for chapter pages.

The agent service starts with deterministic Hono routes, but it is intentionally named as an agent because it should also become the place for future interactive or less deterministic workflows: steward review assistance, source reconciliation, publishing helpers, and guided member operations.

The browser does not call Karma write SDK flows. Raw EAS work feedback, media arrays, private node-intake data, emails, notes, IP addresses, and moderation metadata are never part of the public impact payload.

## Private node intake architecture

User-submitted map/member nodes are private operational data, not Keystatic public content.

- `Postgres` is the durable private data plane.
- `map_node_submissions` stores submitted public-safe fields plus private moderation metadata.
- `map_node_private_contacts` stores email and contact consent separately.
- `map_node_reviews` stores steward moderation history and private notes.
- `public_map_nodes` is the approved-only projection for public map consumers.
- Emails, raw notes, IP addresses, rate-limit keys, spam signals, and review notes must never be committed to the repo, public assets, Keystatic JSON, or public map payloads.

The admin layer remains undecided. Directus is the first candidate to evaluate, but the schema stays CMS-agnostic so Payload, NocoDB, Baserow, Strapi, or a later workspace-native admin can still be used.

## Workspace app architecture

### Workspace entrypoint

- `https://app.greenpill.network/login`

### Workspace V1 scope

- login and session boundary
- collaborative docs
- structured databases
- member and steward operational surfaces

### Auth model

- `Privy-first`
- login happens only in the workspace
- V1 methods:
  - email
  - social
  - passkey
  - wallet
- wallet is presented on the login screen, not only as post-login linking

### Content and publishing model

- workspace content is internal first
- public publishing from workspace content is manual export and curation into the public site
- workspace is not the canonical public CMS in V1

### Permission model

- `public`
- `member`
- `steward`

## Infrastructure defaults

- current public site deployment stays on GitHub Pages while Fly hosts backend-class services
- `Fly Managed Postgres` is the production database default
- `Tigris` is the default object storage provider
- launch with `IAD` primary and `FRA` secondary
- do not add a third region until real traffic justifies it

### Postgres hosting

Use Fly.io Managed Postgres for production. The older unmanaged Fly Postgres app path is not the default production choice because Fly now points production users toward Managed Postgres and does not provide support or guidance for unmanaged Postgres.

`agent.greenpill.network` should receive `DATABASE_URL` as a Fly app secret from `fly mpg attach`. The public website deploy must never receive database credentials. Private admin tools can attach to the same Managed Postgres cluster with restricted roles after the admin layer is chosen.

The first cluster should live in `iad` with schemas for `intake`, `impact`, future `workspace`, and future `audit` data. See `docs/v2/fly-postgres-hosting.md` for the deployment and connection model.

## Implementation principles

- keep Astro and Keystatic as the public foundation unless later scope proves they block required features
- keep the public site anonymous by default and start auth only inside the workspace
- treat the workspace as an adjacent package-hosted app backed by Fly-hosted services; choose the frontend host when workspace implementation starts
- favor internal public routes over raw external CTAs
- keep the existing design language and extend it instead of rebranding
- defer the Knowledge Commons Graph Explorer until it is source-aware, reviewed, stewarded, and safe to publish
- treat migration messaging as part of the UX, not an afterthought

## Current constraints

- current content schema only models books and chapters
- the homepage and chapter map still point to external systems for important flows
- Keystatic is still in local-file mode in the current repo
- the repo now uses a packages-first split for `packages/website`, `packages/shared`, `packages/agent`, and the scaffolded `packages/workspace` boundary
- non-public graph research exists in `data/greenpill-graph/`, but the public explorer has been removed pending a knowledge commons plan hub
