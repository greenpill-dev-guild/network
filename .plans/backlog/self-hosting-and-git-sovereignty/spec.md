# Self-Hosting and Git Sovereignty Spec

## Goal

Define a hybrid-first sovereignty roadmap for the Greenpill website and adjacent tooling that improves control and resilience without forcing premature production-ops burden.

## Current State

- the current website repo is an Astro public site with file-backed content
- the durable architecture direction in `docs/v2/` keeps the public site and workspace frontend managed, with backend-class services separated from the public site
- the current sovereignty interest starts with self-hosted Git and broader feasibility questions around self-hosting the public website origin

## Scope

### Phase 1: Git sovereignty first

- evaluate `Forgejo` vs `Gitea`
- define auth, backups, outward mirrors, runner isolation, collaborator workflow, and recovery requirements
- default recommendation: self-host Git first on the Mac Mini while retaining an outward mirror

### Phase 2: Website self-hosting feasibility

- evaluate serving the built Astro site from a home-hosted origin behind Cloudflare
- require a staging hostname and operational checklist before any production cutover
- cover DNS, TLS, caching, logs, health checks, backups, rollback, and home-network constraints

### Phase 3: Future app and backend boundary

- preserve the current managed-default posture for workspace and backend-class services
- keep the current Vercel and Fly style split as the baseline until there is a concrete reason to replace it
- define explicit exit criteria before planning self-hosted auth, Postgres, realtime, or object storage

## Decision Defaults

- hybrid-first, not all-self-hosted by default
- self-hosted Git is the first sovereignty candidate
- public website self-hosting is a staged proof path, not an immediate production cutover
- future app or backend self-hosting stays deferred behind stronger proof
- the Mac Mini is the initial server candidate; the Mac Studio stays optional as workstation or build runner

## Output Requirements

The finished hub should yield:

- a recommendation matrix
- go or no-go criteria for each phase
- an operational prerequisite list for the home-lab path
- explicit reasons to keep some surfaces intentionally managed
