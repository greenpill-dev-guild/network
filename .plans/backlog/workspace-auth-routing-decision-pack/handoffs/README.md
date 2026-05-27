# Handoffs

Use this directory for lane handoffs related to this feature.

## Backlog Creation Handoff - 2026-05-26

- What changed: created the required workspace/auth decision-pack hub so agents cannot scaffold `packages/workspace` before auth, route, ownership, API, and privacy decisions are reviewed.
- Current status: backlog, planning-only.
- Implementation blocker: no workspace runtime code, auth middleware, dependencies, migrations, or public API wire-shape changes until this hub produces the reviewed decision pack.
- Validation: `bun run plans:validate`.
