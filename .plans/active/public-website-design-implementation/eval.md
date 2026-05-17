# Public Website Design Implementation Evaluation

## Acceptance Checks

- The root `docs/` folder is removed, with temporary planning material folded into `.plans`.
- The high-fidelity design package is tracked under this hub, not as a loose untracked root folder.
- Public website implementation work references this hub for design/research context.
- Runtime SQL and package contracts live under `packages/`.
- `status.json` matches the intended stage and lane state.
- Validation passes with `node scripts/plan-hub.mjs validate`.

## Proof

- `node scripts/plan-hub.mjs validate`
- Targeted stale-path scan for the former root V2 and research locations across README, root config, package scripts, and `.plans`.
- Targeted website build and visual checks once page implementation starts.
