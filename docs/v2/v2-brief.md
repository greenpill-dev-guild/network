# Greenpill V2 Brief

## What V2 is

Greenpill V2 turns `greenpill.network` from a link hub into a public knowledge commons and onboarding surface for a living network. It should make the network legible, replace visible Charmverse dependencies, and give people clear next steps whether they are new, returning, or already operational inside Greenpill.

## Why this matters

- important Greenpill knowledge and workflows are still scattered across Charmverse, Discord, and other external tools
- the current site underrepresents the real network
- new contributors need clearer pathways than a wall of links
- chapters, guilds, and builders need a public home that reflects real activity

## Primary outcomes

- replace the most visible Charmverse dependencies before they fail publicly
- shift the website from `content shelf + link hub` to `network narrative + proof of activity + role-based pathways`
- create a public knowledge commons that can grow inside the current Astro and Keystatic foundation
- establish a phased path toward a future workspace app without blocking the public-site refresh

## Priority audiences

| Audience | Primary question | What the site must help them do | Priority |
| --- | --- | --- | --- |
| Curious newcomer | What is Greenpill and why does it matter? | Understand the network and choose a clear next step | P1 |
| Chapter organizer | How do I join, start, or strengthen a local chapter? | Find chapter examples, steward pathways, and support resources | P1 |
| Builder or designer | Is real work happening here? | See projects, guilds, and current workstreams | P1 |
| Writer, educator, or researcher | Is there a place for my contribution? | Find learning, publishing, and topic-based pathways | P2 |
| Partner or funder | Is this credible, active, and useful to collaborate with? | Understand programs, outcomes, and partnership entry points | P2 |
| Existing member | Where do I plug in next? | Route into join, learn, or workspace login from the public site | P1 |

## Locked defaults

### Product defaults

- public site remains anonymous by default
- auth begins only in the workspace
- `Keystatic` remains canonical for public content
- workspace V1 starts with `docs + databases`
- public publishing from workspace content is `manual export/curation first`
- role model starts with `public / member / steward`

### Platform defaults

- `greenpill.network` on `Vercel` for the public Astro site
- `app.greenpill.network` on `Vercel` for the workspace frontend
- `api.greenpill.network` and `realtime.greenpill.network` on `Fly`
- `Fly Postgres` as the default database
- `Tigris` as the default object storage provider
- launch regions: `IAD` primary, `FRA` secondary
- repo posture: explicit monorepo `apps/` + `packages/`

### Auth defaults

- `Privy-first`
- login methods at V1:
  - email
  - social
  - passkey
  - wallet
- wallet is a first-class login option on the workspace login screen

## Success signals

- a new visitor can explain what Greenpill is in one sentence after visiting the homepage
- a chapter organizer can find a clear next action without leaving the website immediately
- the website has internal destinations for the current top Charmverse entry points
- implementation can proceed from the canonical docs and manifest without inventing routes, entities, or hosting assumptions

## Operating cadence

- weekly public progress update
- biweekly steward review against the active delivery plan
- monthly milestone review that can adjust scope, sequence, or defaults if needed
