# Plan Hub Bootstrap Spec

## Goal

Introduce a Green Goods-shaped but lighter-weight planning surface to this repo so future work can be saved, validated, and resumed from repo truth instead of chat-only context.

## Current State

- `docs/v2/` already carries the current website product and architecture direction
- the repo did not previously have a structured `.plans/` surface
- later follow-up work, including self-hosting and Git sovereignty planning, needed a durable home inside the repo

## Scope

- add `.plans/README.md` and the stage directories
- add a reusable feature template under `.plans/_templates/feature/`
- define the repo-specific lanes: `ui`, `content`, `platform`, `qa_pass_1`, `qa_pass_2`
- add `scripts/plan-hub.mjs` with only `scaffold` and `validate`
- save the self-hosting roadmap as a separate backlog hub under the new contract

## Contract Decisions

- `docs/v2/` stays canonical for website and product architecture
- `.plans/` is for execution sequencing, readiness, handoffs, and later follow-ups
- `status.json` is the machine-readable source of truth for hub state
- this repo starts with manual plan updates plus validation, not automation claiming
- the v1 helper validates root layout, templates, required hub files, lane names, lane status values, taxonomy shape, hub dependency references, and the stage-to-status contract

## Acceptance Bar

- `.plans/README.md` explains the contract clearly
- the template set is complete and reusable
- `node scripts/plan-hub.mjs validate` checks required files, root/template integrity, allowed lane/status values, and basic taxonomy integrity
- the separate self-hosting backlog hub validates cleanly under the same contract

## Non-Goals

- importing Green Goods lane names that do not fit this repo, especially `contracts`
- copying Green Goods automation prompts, branch triggers, or Linear integration
- moving older research or `docs/v2/` material into `.plans/`
