# Greenpill Charmverse Transition

Research snapshot assembled on March 26, 2026.

Current adopted default note:

- This document preserves the earlier transition exploration.
- References below to a public `/workspace` route are historical and exploratory, not the current canonical plan.
- The active V2 decision now uses `app.greenpill.network` as the workspace entrypoint and keeps current stack context in `.plans`.

This memo assumes Greenpill has a confirmed Charmverse sunset timeline from direct communication. As of March 26, 2026, I did not find a clear public shutdown notice in Charmverse's public docs during this pass, so I am treating the one-month timeline as trusted network context.

## Executive recommendation

Do not try to rebuild all of Charmverse inside the current homepage in one pass.

Instead:

1. Use the current website as the public knowledge commons and network entry point.
2. Add a dedicated `/workspace` layer for member, chapter, guild, and steward operations.
3. Replace Charmverse in phases:
   - first for content, onboarding, and chapter/guild pages
   - then for wallet identity and token gating
   - then for proposals, allocations, credentials, and reputation
4. Keep the design language for now and expand the component system rather than redesigning everything at once.
5. Treat peer-to-peer storage as a publication and backup layer first, not as the initial primary database.

My strongest recommendation is a hybrid architecture:

- public site and content model in Astro + Keystatic
- custom React workspace inside the same repo or adjacent app
- wallet auth and token gating with SIWE + wagmi + RainbowKit + viem
- proposal and execution bridge with Snapshot + Safe + Allo
- attestations with EAS
- Postgres + object storage as the operational backend
- IPFS/Helia snapshots for decentralized publishing and backups once the workflows are stable

If Greenpill needs the fastest rescue path for docs before the custom workspace exists, use a self-hosted knowledge base as a temporary bridge, not as the long-term system of record.

## What the current repo already gives you

The repo is not starting from zero. It already has several pieces that can become the transition foundation:

- Astro with React and Keystatic integration in `packages/website/astro.config.mjs`
- structured public content collections for chapters and books in `packages/website/src/content` and `packages/website/keystatic.config.ts`
- research artifacts in the relevant `.plans` hubs
- graph research data in `data/greenpill-graph/`, with public graph-explorer implementation deferred into `.plans/backlog/knowledge-commons-graph-explorer/`
- a simple but usable design language in `packages/website/src/styles/global.css`

That means the website can credibly become:

- the public knowledge commons
- the canonical network map
- the onboarding surface
- the index of chapters, guilds, pods, projects, and stories
- the place where gated member tooling begins

## What the current site does not cover yet

The current site is still mainly a one-page public brochure with external links.

Key repo-level gaps:

- Charmverse is still the operational backend for multiple flows:
  - beginner onboarding links in `packages/website/src/components/ParticipateSection.astro`
  - guild entry links in `packages/website/src/components/ParticipateSection.astro`
  - explore CTA links in `packages/website/src/components/ExploreSection.astro`
  - chapter links in `packages/website/src/content/chapters/*.json`
  - social links in `packages/website/src/content/social-links.json`
- there is no member auth layer
- there is no wallet session layer
- there is no token/NFT gating layer
- there is no notion-like document workspace
- there is no proposal or approval workflow
- there is no payout or multisig execution flow
- there is no credential or reputation system
- there is no content model yet for guilds, pods, projects, resources, proposals, or attestations

The good news is that the existing site already points to the replacement priorities very clearly: anything still hard-linked to Charmverse is a P0 migration target.

## What Charmverse functionally covered for Greenpill

Based on your description and Charmverse's public product pages, the platform was combining several distinct jobs:

| Capability | Why it mattered to Greenpill | Replacement target |
| --- | --- | --- |
| Workspace pages and databases | Chapter, guild, and onboarding docs lived there | Website content model + workspace docs layer |
| Wallet-native identity | Wallet sign-in, member identity, Web3-native participation | SIWE session + wallet profile model |
| Token/NFT gating | Role and access gating for spaces and actions | Server-side gate policy + contract reads |
| Proposals and comments | Governance and structured decision making | Proposal app + Snapshot voting |
| Allocation flows | Funding and grant-style routing | Allo pools/strategies or equivalent |
| Multisig execution | Real transactions and payout approvals | Safe Protocol Kit + Transaction Service |
| Credentials and attestations | Steward, contributor, or role signals | EAS-backed credential layer |
| Community navigation | Members found chapters, guilds, workstreams | Website IA + member directory + graph explorer |

That matters because "replace Charmverse" is not one feature. It is really five smaller systems:

1. Content and workspace
2. Identity and permissions
3. Governance and funding
4. Credentials and reputation
5. Search, mapping, and network legibility

## Recommended platform model

## 1. Public layer

Keep the main Greenpill site as the public front door.

This layer should own:

- homepage narrative
- chapters
- guilds
- pods
- projects and protocols
- stories and field reports
- learn resources
- impact and reputation summaries
- graph explorer and ecosystem mapping

This is the best use of Astro and the current design system.

## 2. Workspace layer

Add a `/workspace` area for member operations.

This layer should own:

- chapter spaces
- guild spaces
- steward docs
- shared playbooks
- proposal drafting
- comments and review
- gated resources
- member dashboard
- credential display

This should not stay a pile of external links. It should become a proper app surface.

## 3. Protocol layer

Keep chain-specific functions modular rather than burying them in page logic.

This layer should own:

- wallet authentication
- NFT/token gating
- attestations
- voting
- allocation strategies
- multisig execution

That separation will keep the public site easy to edit while preserving Web3-native capability where it actually matters.

## Recommended open-source stack

## Core website and public content

| Concern | Recommendation | Why |
| --- | --- | --- |
| Public site shell | Astro | Already in repo, fast, content-first, easy to keep design stable |
| Non-engineer public editing | Keystatic | Already configured in repo; good fit for chapters, stories, resources, site settings |
| Search and mapping | Current graph explorer + structured graph JSON | Greenpill already has meaningful graph work underway |

## Workspace editor and collaboration

| Concern | Recommendation | Why |
| --- | --- | --- |
| Block-style editor | BlockNote or Tiptap-based editor | Better fit than trying to fake a Notion clone from raw markdown |
| Realtime collaboration | Yjs | Mature CRDT collaboration layer and strong ecosystem |
| Collaboration backend | Hocuspocus or equivalent Yjs server | Lets you self-host collaboration state and auth hooks |

Recommendation:

- For the long-term Greenpill-native workspace, build around a block editor plus Yjs.
- This gives you a credible path to notion-like editing, comments, offline tolerance, and eventual peer-to-peer or replicated collaboration.

## Wallet identity and gating

| Concern | Recommendation | Why |
| --- | --- | --- |
| Wallet login | Sign-In with Ethereum | Standard wallet-auth pattern |
| Client wallet layer | wagmi + RainbowKit | Practical React wallet UX |
| Chain reads and writes | viem | Clean modern EVM client library |
| Gate evaluation | Server-side policy engine using contract reads and allowlists | More flexible than hardcoding gate logic in components |
| Private-content encryption | Optional Lit Protocol later | Useful if some gated content should stay encrypted, not just hidden in UI |

Recommendation:

- Start with access control based on wallet ownership, allowlists, chapter membership, and attestation flags.
- Only add encrypted content after the role model is stable.

## Governance, allocation, and execution

| Concern | Recommendation | Why |
| --- | --- | --- |
| Proposal discussion and routing | Website-native proposal records | Lets Greenpill keep context, comments, and steward UX in-house |
| Voting | Snapshot | Open, proven, lighter-weight than immediate onchain governance |
| Allocation mechanics | Allo Protocol | Already aligned with Greenpill's ecosystem and allocation use cases |
| Multisig execution | Safe Protocol Kit + Safe Transaction Service | Best fit for multisig approvals and execution |

Recommendation:

- Do not try to rebuild end-to-end governance from scratch first.
- Keep proposal authoring and member context on the website, then bridge execution-critical steps to tools that are already strong at voting, allocation, and Safe transaction flow.

## Credentials, reputation, and impact

| Concern | Recommendation | Why |
| --- | --- | --- |
| Attestations | Ethereum Attestation Service | Strong primitive for contributor and steward credentials |
| Reputation model | Aggregate attestations + contribution records + public graph data | More legible than a single opaque score |
| Public impact display | Derived website pages and graph views | Keeps impact understandable for partners and newcomers |

Recommendation:

- Do not start with a "global reputation score."
- Start with clear credentials and contribution evidence:
  - chapter steward
  - guild contributor
  - program participant
  - proposal author
  - funded project maintainer

## Storage and decentralization

| Concern | Recommendation | Why |
| --- | --- | --- |
| Operational database | Postgres | Practical, queryable, reliable |
| Asset storage | S3-compatible object storage | Simple and portable |
| Local-first collaboration | Yjs document state | Good path toward offline and sync resilience |
| Decentralized publishing/backups | IPFS via Helia | Good for immutable snapshots and mirrored public knowledge |
| Decentralized app data network | Ceramic/ComposeDB only if clearly needed later | Powerful, but adds network and data-model complexity |

Recommendation:

- Do not make a pure peer-to-peer network the primary write path in month one.
- Use a pragmatic hybrid:
  - Postgres for operations
  - object storage for files
  - IPFS snapshots for resilience and public knowledge portability

That gets you real ownership without making every workflow depend on experimental infra from day one.

## Workspace foundation options

## Option A: Temporary self-hosted docs bridge

Candidates:

- [Docmost](https://docmost.com/)
- [AFFiNE](https://affine.pro/)
- [AppFlowy](https://appflowy.com/)

Use this option if the immediate problem is "Charmverse is disappearing and we need docs somewhere stable fast."

Pros:

- fastest content landing zone
- self-hostable
- lower engineering lift in the first month

Cons:

- still a second product to integrate
- web3 identity, gating, governance, and credentials remain custom work
- risks replacing one platform dependency with another

My take:

- best as a bridge
- weak as the final Greenpill operating system

## Option B: Greenpill-native workspace app

Use Astro for the public layer and add a React workspace for member operations.

Pros:

- matches Greenpill's specific chapter/guild/pod structure
- Web3 identity can be first-class rather than bolted on
- reputation, proposals, and impact can connect directly to the graph work
- avoids long-term dependency on another all-in-one workspace vendor

Cons:

- more engineering effort
- needs a tighter scoped phase plan

My take:

- this is the right long-term move
- pair it with a temporary bridge if the content migration clock is tight

## Priority feature map

## P0: Must replace before Charmverse sunset

- chapter pages
- guild and pod landing pages
- onboarding flows like `Taking the Greenpill`
- workspace home / member navigation
- public docs and resources currently living only in Charmverse
- URL inventory and migration map

## P1: First website-native operational layer

- wallet sign-in
- role model for public, member, chapter, guild, steward
- token/NFT gating
- gated resource pages
- chapter and guild homepages in the new content model
- member profiles with basic identity proofs

## P2: Coordination layer

- proposal drafts
- comments and review stages
- voting bridge
- allocation routing
- Safe transaction preparation and execution

## P3: Reputation and impact layer

- contributor credentials
- steward credentials
- public contribution trails
- chapter impact pages
- graph explorer overlays for roles, projects, and outcomes

## P4: Decentralization hardening

- IPFS snapshots of public docs and datasets
- local-first collaborative editing polish
- optional ComposeDB/Ceramic experiments only if there is a clear interoperability need

## Suggested migration phases

## Phase 0: Rescue and inventory

Timeline: 1-2 weeks

Deliverables:

- export every Charmverse space, page, database, asset, and credential-related record you can get
- create a migration spreadsheet:
  - old URL
  - content owner
  - content type
  - audience
  - target route
  - access level
  - status
- classify each item as:
  - public
  - member-only
  - chapter-only
  - guild-only
  - steward-only
- identify which content should become:
  - Astro content
  - workspace docs
  - archived reference
  - deleted noise

This phase is the difference between an orderly transition and a panic rebuild.

## Phase 1: Public website becomes the canonical network front door

Timeline: 2-4 weeks

Deliverables:

- create first-class routes for:
  - `/chapters`
  - `/guilds`
  - `/pods`
  - `/projects`
  - `/stories`
  - `/learn`
  - `/workspace`
- migrate chapter and guild landing content out of Charmverse
- replace all homepage Charmverse CTAs with website-native destinations
- expand the content schema for:
  - guilds
  - pods
  - projects
  - stories
  - resources
  - programs
- reuse the current aesthetic and add new card patterns instead of redesigning the brand layer

## Phase 2: Identity and gating

Timeline: 3-6 weeks

Deliverables:

- SIWE login
- wallet-connected profile
- chapter/guild membership roles
- NFT/token-gated routes
- steward-only or guild-only docs
- session handling for the workspace

This phase replaces Charmverse's Web3-native access model.

## Phase 3: Workspace and coordination

Timeline: 4-8 weeks

Deliverables:

- notion-like workspace pages
- shared editing
- comments and mentions
- proposal records
- proposal review states
- Snapshot voting bridge
- Allo allocation hooks where needed
- Safe execution hooks for multisig-triggered actions

This is where the website stops being just an entry point and becomes a true operating surface.

## Phase 4: Credentials, impact, and reputation

Timeline: 4-8 weeks

Deliverables:

- EAS credential issuance
- chapter and guild badges
- contributor history on profiles
- public impact dashboards
- graph overlays connecting people, projects, proposals, and outcomes

This is where Greenpill can make "reputation" legible without turning it into a gameified black box.

## Information architecture additions

To support this transition, the site should add a few durable content types and components.

## New content types

- `guild`
- `pod`
- `project`
- `program`
- `story`
- `resource`
- `proposal`
- `credential`
- `impact_case`

## New component families

- chapter story cards
- guild and pod cards
- project and protocol cards
- role-based onboarding cards
- workspace access cards
- proposal status cards
- credential chips
- impact evidence cards

These all fit the current design system. They do not require a brand reset.

## Suggested data model additions

At minimum, the app layer should eventually model:

- `member`
- `wallet`
- `chapter`
- `guild`
- `pod`
- `project`
- `resource`
- `document`
- `proposal`
- `vote`
- `allocation`
- `safe_transaction`
- `attestation`
- `reputation_event`

Important shared fields:

- `visibility`
- `membership_scope`
- `chain_id`
- `contract_address`
- `status`
- `source_url`
- `source_of_truth`
- `updated_at`

The current graph work already points toward a useful canonical entity model. That is an asset, not side work.

## Risks and what to avoid

Avoid these traps:

- rebuilding everything as a single giant Astro page
- replacing Charmverse with another opaque all-in-one dependency without a long-term exit plan
- making pure P2P infra the first blocker
- over-indexing on token gating before the content model and role model exist
- shipping a vague reputation score before contributor evidence is visible
- forcing public content, member ops, and governance execution into one undifferentiated interface

The practical rule is:

`public knowledge`, `member coordination`, and `onchain execution` should feel connected, but they should not be the same subsystem.

## Recommended first implementation slice in this repo

If the next step is to start building, I would begin here:

1. Expand the content model with `guilds`, `pods`, `projects`, and `stories`.
2. Create first-class public pages for those sections.
3. Replace Charmverse links on the homepage with internal routes.
4. Add a `/workspace` landing page that explains access tiers and upcoming migration.
5. Stand up SIWE and basic wallet sessions.
6. Add the first gated resource route.

That sequence gives Greenpill a visible win quickly while setting up the deeper system properly.

## Source appendix

Charmverse and adjacent platform references:

- [Charmverse overview](https://charmverse.io/)
- [Charmverse token gates](https://charmverse.io/token-gates)
- [Charmverse credentials](https://charmverse.io/credentials)
- [Charmverse pricing and export language](https://www.charmverse.io/blog/charmverse-pricing)

Identity, wallet, and protocol tooling:

- [Sign-In with Ethereum](https://docs.login.xyz/)
- [wagmi](https://wagmi.sh/)
- [RainbowKit](https://www.rainbowkit.com/)
- [viem](https://viem.sh/)
- [Lit Protocol](https://developer.litprotocol.com/)

Governance, allocation, and execution:

- [Snapshot docs](https://docs.snapshot.box/)
- [Allo Protocol docs](https://docs.allo.gitcoin.co/)
- [Safe Protocol Kit](https://docs.safe.global/sdk/protocol-kit)
- [Safe Transaction Service](https://docs.safe.global/api-service-architecture/safe-transaction-service)

Collaboration and decentralized data:

- [Yjs](https://yjs.dev/)
- [BlockNote](https://www.blocknotejs.org/)
- [IPFS / Helia](https://github.com/ipfs/helia)
- [Ceramic / ComposeDB](https://developers.ceramic.network/docs/introduction/intro)

Bridge-style self-hosted workspace candidates:

- [Docmost](https://docmost.com/)
- [AFFiNE](https://affine.pro/)
- [AppFlowy](https://appflowy.com/)
