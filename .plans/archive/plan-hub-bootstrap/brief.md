# Plan Hub Bootstrap

**Stage**: `archive`

## Why This Exists

`network` needed a repo-local execution-truth surface for later follow-up work without recreating a root docs folder that would become stale parallel truth.

This hub defines the first-pass planning contract for the repo:

- a durable `.plans/` layout
- a lightweight feature-hub template
- a small local scaffold and validation helper
- a separate backlog hub that proves the shape against real follow-up work

## Desired Outcome

The repo gains a planning surface that is small, clear, and reusable:

- `.plans/` holds execution sequencing, research context, readiness, handoffs, and follow-up packs
- runtime contracts and executable artifacts stay under `packages/`
- the initial helper is enough to scaffold new hubs and catch structural drift

## Non-Goals

- introducing Linear sync
- introducing branch-trigger orchestration
- introducing automation claiming or scheduler behavior in v1
- reintroducing root-level `docs/` as long-lived plan truth
