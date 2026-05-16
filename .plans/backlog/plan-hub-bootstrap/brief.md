# Plan Hub Bootstrap

**Stage**: `backlog`

## Why This Exists

`network-website` needed a repo-local execution-truth surface for later follow-up work without overloading `docs/v2/`, which should stay focused on product and architecture direction.

This hub defines the first-pass planning contract for the repo:

- a durable `.plans/` layout
- a lightweight feature-hub template
- a small local scaffold and validation helper
- a separate backlog hub that proves the shape against real follow-up work

## Desired Outcome

The repo gains a planning surface that is small, clear, and reusable:

- `docs/v2/` remains canonical for product and IA work
- `.plans/` holds execution sequencing, readiness, handoffs, and later follow-up packs
- the initial helper is enough to scaffold new hubs and catch structural drift

## Non-Goals

- introducing Linear sync
- introducing branch-trigger orchestration
- introducing automation claiming or scheduler behavior in v1
- replacing `docs/v2/` as the product/architecture source of truth
