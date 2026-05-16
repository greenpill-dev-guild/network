# Greenpill Website V2

This folder is now consolidated into three canonical human docs plus one machine handoff artifact.

## Canonical Set

- `v2-brief.md`
  - goals, audiences, locked defaults, and success signals
- `v2-architecture.md`
  - domain model, hosting split, auth/content boundaries, monorepo posture, and infrastructure defaults
- `v2-delivery-plan.md`
  - phase plan, acceptance criteria, and Charmverse migration mapping
- `ai-build-manifest.yaml`
  - machine-oriented implementation handoff derived from the canonical docs

## Supporting Artifacts

- `workshop-runbook.md`
  - workshop facilitation guide
- `workshop-notes-template.md`
  - workshop capture template
- `prompts/`
  - synthesis and repo-refinement prompts

## Current Defaults

- public site on Vercel
- workspace frontend on Vercel
- API, auth, realtime, and Postgres on Fly
- Tigris for uploads and media
- Keystatic as canonical public content
