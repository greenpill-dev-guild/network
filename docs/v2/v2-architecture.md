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
| Public site | `greenpill.network` | Vercel | marketing, onboarding, chapters, guilds, stories, and library |
| Workspace frontend | `app.greenpill.network` | Vercel | authenticated React app for member operations |
| App API | `api.greenpill.network` | Fly | auth/session, app APIs, publishing helpers |
| Realtime | `realtime.greenpill.network` | Fly | Yjs/Hocuspocus collaboration |
| Assets | `assets.greenpill.network` | Tigris-backed delivery | uploads, media, exports |

## Monorepo default

The default repo posture is an explicit monorepo with `apps/` and `packages/` boundaries.

Recommended shape:

- one app for the public website
- one app for the workspace frontend
- shared packages for UI, config, auth helpers, and shared types

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

- `Vercel + Fly` is the chosen stack
- `Fly Postgres` is the default database
- `Tigris` is the default object storage provider
- launch with `IAD` primary and `FRA` secondary
- do not add a third region until real traffic justifies it

## Implementation principles

- keep Astro and Keystatic as the public foundation unless later scope proves they block required features
- keep the public site anonymous by default and start auth only inside the workspace
- treat the workspace as an adjacent React app on Vercel backed by Fly-hosted services
- favor internal public routes over raw external CTAs
- keep the existing design language and extend it instead of rebranding
- defer the Knowledge Commons Graph Explorer until it is source-aware, reviewed, stewarded, and safe to publish
- treat migration messaging as part of the UX, not an afterthought

## Current constraints

- current content schema only models books and chapters
- the homepage and chapter map still point to external systems for important flows
- Keystatic is still in local-file mode in the current repo
- the current repo does not yet represent the future monorepo split between public site and workspace app
- non-public graph research exists in `data/greenpill-graph/`, but the public explorer has been removed pending a knowledge commons plan hub
