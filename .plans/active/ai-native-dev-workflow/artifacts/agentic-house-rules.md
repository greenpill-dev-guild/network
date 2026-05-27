# Agentic House Rules

This repo already has a clear operating base. These rules make that base explicit for agent work so future runs do not invent parallel structures.

| Area | Repo Decision | Required Proof |
|---|---|---|
| Database schema | Greenpill-owned schema lives in `packages/agent/migrations`; Directus can edit records and metadata but does not own the schema. | Migration diff plus `bun run db:migrate` or a focused migration test when schema changes. |
| Shared types | Public/private projections live in `packages/shared`; website and agent code import those contracts instead of duplicating filters. | Focused shared, agent, or content contract tests for the touched payload. |
| Validation | No new validation library in this hardening pass. Astro content keeps `z`; shared runtime contracts keep TypeScript interfaces plus normalizers/assertions. | Existing tests must prove public-safe assertions reject private fields and pending or unapproved data. |
| Routing and auth | Public website routes stay static. Agent routes own public API and private runtime concerns. Workspace auth is blocked until the workspace/auth decision pack is reviewed. | Route constant, shared payload contract, public-safe assertion, and contract test for every new public agent route. |
| CSS and UI | `packages/website/src/styles/gp-tokens.css` is the canonical global stylesheet. UI work starts from `packages/website/DESIGN.md`, tokens, and existing primitives. | `bun run ui:check`; use `bun run ui:verify <route>` only when rendered UI changes. |
| Client/server communication | The public website consumes static snapshots and approved public agent routes. No website database access, hidden Directus fetches, or ad hoc API response shapes. | Source review plus route/content tests for any data-flow change. |
| Folder homes | `.plans` carries planning truth. `packages` carries runtime code. Root `scripts` stays limited to active validation, migration, and package tooling. | `bun run plans:validate` after plan-hub edits; focused test for any script behavior change. |
| Proof and closeout | A lane cannot be marked complete unless status, spec/plan, ledger, scorecard, closeout, and validation evidence agree. | Agent Run Ledger entry, Workflow Scorecard entry, Closeout Gate note, and exact validation commands. |

## Defaults For Future Agents

- Prefer the existing shared normalizer/assertion style over introducing dependencies.
- Treat auth/provider choice as a planning decision, not an implementation detail.
- Keep public-safe payload work allowlist-first and explicit about `not_configured` or `unavailable` states.
- Record proof limits when a pass only changes plans, docs, or source-only guardrails.
