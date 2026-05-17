# Plan Hub

`.plans/` is the repo-local planning surface for later execution work in `network`.

`docs/v2/` remains the canonical product, information architecture, and hosting-direction surface. Use `.plans/` for execution sequencing, readiness state, handoffs, and future follow-up packs that should live beside the code.

## Layout

```text
.plans/
  ideas/              # rough concepts and exploratory notes
  backlog/            # approved follow-up hubs that are not active yet
  active/             # live implementation or review hubs
  archive/            # completed, paused, or superseded hubs
  reviews/            # recurring review outputs
  audits/             # point-in-time audits
  _templates/         # scaffold source for feature hubs
  _automation/        # reserved for future prompt or scheduler sources
```

## Feature Hub Contract

Each feature hub lives under `.plans/{stage}/{feature-slug}/` and includes:

```text
brief.md
spec.md
plan.todo.md
eval.md
status.json
handoffs/README.md
reports/
artifacts/
```

Required validation files:

- `brief.md`
- `spec.md`
- `plan.todo.md`
- `eval.md`
- `status.json`
- `handoffs/README.md`
- `reports/README.md`
- `artifacts/README.md`

`status.json` is the machine-readable source of truth for hub state.

The Markdown files are the human-readable context:

- `brief.md`: one-page intent and outcome
- `spec.md`: product and technical scope, constraints, and judgment points
- `plan.todo.md`: sequencing and implementation checklist
- `eval.md`: acceptance checks and proof expectations
- `handoffs/`: lane or pass handoff notes
- `reports/`: durable review outputs and recommendation summaries
- `artifacts/`: supporting evidence that should stay near the plan

## Repo Truth and Memory

`.plans/` is the durable repo-truth surface for feature state, follow-up plans, handoffs, and evaluation context.

- Tool-local memory and chat summaries can help an agent resume work, but they do not outrank a hub.
- When a hub and a local note disagree, update the hub or record the blocker in the hub.
- Do not create another repo-level memory surface unless a future plan explicitly defines freshness, ownership, and validation rules.

## Repo-Specific Lanes

This repo uses a lighter lane set than Green Goods:

| Lane | Default owner | Purpose |
| --- | --- | --- |
| `ui` | `claude` | page layout, component polish, visual refinements |
| `content` | `claude` | copy, content-model, route-copy, and documentation edits tied to the feature |
| `platform` | `codex` | hosting, build, deploy, infra, scripts, and operational decisions |
| `qa_pass_1` | `claude` | first pass review of UX, content, and flow |
| `qa_pass_2` | `codex` | second pass validation of regressions and implementation integrity |

Initial lane dependency contract:

- `qa_pass_1` depends on `ui`, `content`, and `platform`
- `qa_pass_2` depends on `qa_pass_1`
- unused lanes should be marked `n/a`

## V1 Posture

This first pass is intentionally small:

- manual plan updates plus `validate`
- a local scaffold helper
- no Linear sync
- no branch-trigger orchestration
- no automation claiming or scheduler behavior

If later work needs those behaviors, extend the contract through a dedicated plan hub rather than inventing a parallel planning surface.

## Validation Posture

Use the fastest honest validation loop for the touched surface:

- `node scripts/plan-hub.mjs validate` for hub and lane-state changes
- `node --test scripts/plan-hub.test.mjs` when touching the helper or templates
- `bun run build` only when the changed work touches the runtime website

The helper validates:

- required root README and stage files
- required template files
- required hub files
- stage and workflow status consistency
- exact lane names and lane dependencies
- allowed lane statuses and owners
- basic taxonomy shape and hub dependency references

## Backlog Quality Bar

Backlog is for realistic follow-up candidates, not general storage.

- Keep strategy or research broad only when it is expected to become a concrete decision pack.
- Move rough concepts to `ideas/`.
- Keep accepted execution candidates in `backlog/`.
- Move live work to `active/` only when it is ready for implementation or review.
- Archive shipped, paused, or superseded hubs.

Every hub in `active/` or `backlog/` must include real content in `brief.md`, `spec.md`, `plan.todo.md`, and `eval.md`. Placeholder text is not enough for the live queue.

## CLI

Use the repo helper for scaffolding and validation:

```sh
node scripts/plan-hub.mjs scaffold my-feature --title "My Feature"
node scripts/plan-hub.mjs validate
```

## Lifecycle

1. Scaffold a new hub in `.plans/backlog/`
2. Fill in the human docs and `status.json`
3. Move the hub to `.plans/active/` when it is the next real execution pack
4. Archive the hub when the work is complete, paused, or superseded

## Legacy Compatibility

The foldered hub layout is the only supported planning surface in this repo. Do not create new flat plan files in `.plans/` or parallel planning folders unless a future bootstrap follow-up changes the contract.
