# Public Website Design Implementation Spec

## Goal

Build the next public Greenpill Network website experience in `packages/website` using the checked-in high-fidelity design package, existing Astro + Keystatic foundation, and package-based repo structure.

## Current State

- `packages/website` owns the public Astro + Keystatic site.
- `packages/shared` owns reusable public/private payload contracts.
- `packages/agent` owns Fly-hosted backend/service scaffolding.
- Temporary V2 docs, prompts, research, and design handoffs now live inside this hub instead of a root `docs/` folder.
- The current design package is stored in `artifacts/hifi/` and should be treated as the visual/reference artifact for this implementation phase.

## Scope

- Port the design tokens and global visual system into the website package.
- Rebuild shell primitives and public page components in idiomatic Astro.
- Reconcile high-fidelity placeholder content with real Keystatic content.
- Implement public pages in a staged sequence: home, chapters, chapter detail, library, stories, guild, and garden/onboarding surfaces.
- Keep visual acceptance proof tied to the high-fidelity artifacts at desktop, tablet, and mobile widths.

## Constraints

- `.plans/` carries planning, research, handoffs, readiness, and evolving implementation context.
- Runtime contracts that code depends on belong under `packages/`, not planning docs.
- This repo starts with manual plan updates plus validation, not automation claiming.
- Keep `status.json` taxonomy current enough for future filtering and dependency checks.
- Preserve public/private boundaries: no private node-intake fields, review notes, pending submissions, raw upstream feedback, or database credentials in the public website.

## Open Questions

- Which parts of the high-fidelity package should be adapted to preserve useful live-site texture, imagery, or logo treatments?
- Should stories and people remain empty until real content exists, or should the first design pass seed real entries?
- Which visual acceptance workflow should become the default: screenshots only, browser automation, or a side-by-side review checklist?
