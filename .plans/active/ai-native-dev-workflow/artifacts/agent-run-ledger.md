# Agent Run Ledger

Use one entry per meaningful delegated run. Keep private prompts, secrets, raw tokens, private source bodies, and sensitive user data out of this file.

## Entry Template

| Field | Value |
|---|---|
| Date | YYYY-MM-DD |
| Feature |  |
| Repo | Greenpill Network |
| Agent role |  |
| Human goal |  |
| Context packet |  |
| Assigned scope |  |
| Files touched |  |
| Commands run |  |
| Failures or retries |  |
| Verification cost |  |
| Human judgment callouts |  |
| Follow-up rule updates |  |
| Outcome | pending |

## First Required Adoption

The first measured lane is the `ai-native-dev-workflow` scaffold-hardening pass. `public-website-design-implementation` remains the default public-site candidate for the next adoption step.

## Recorded Entries

### 2026-05-24 - Scaffold Hardening

| Field | Value |
|---|---|
| Date | 2026-05-24 |
| Feature | `ai-native-dev-workflow` |
| Repo | Greenpill Network |
| Agent role | Codex plan-hardening reviewer/implementer |
| Human goal | Address review findings so the plan hub is production-quality as a `.plans` operating artifact. |
| Context packet | Google I/O AI-native workflow transcript, user-approved six-week plan, prior review findings, Network plan validator, public-safe payload guidance. |
| Assigned scope | `.plans/active/ai-native-dev-workflow` only; no website, shared, agent, admin, Directus, or package files. |
| Files touched | `status.json`, `plan.todo.md`, `eval.md`, `handoffs/README.md`, `artifacts/*.md`, `reports/*.md`. |
| Commands run | `bun run plans:validate` |
| Failures or retries | Review found template-only evidence, all primary lanes queue-visible as ready, and validation commands that mixed commands with prose. |
| Verification cost | One plan-hub validation pass; browser and public contract proof intentionally deferred because this pass touched only the plan hub. |
| Human judgment callouts | The scaffold-hardening lane is the first measured lane; public website adoption remains future work and must use public-safe proof when touched. |
| Follow-up rule updates | `None` for repeated agent failures. Local eval wording was tightened so commands are copy-runnable and conditions live outside command text. |
| Outcome | completed |

### 2026-05-26 - Agentic Flow Hardening

| Field | Value |
|---|---|
| Date | 2026-05-26 |
| Feature | `ai-native-dev-workflow` with `public-website-design-implementation` as the first measured adoption surface |
| Repo | Greenpill Network |
| Agent role | Codex repo-hardening implementer |
| Human goal | Implement the Syntax-inspired hardening plan without runtime behavior changes or new validation dependencies. |
| Context packet | Repo audit findings, approved Agentic Flow Hardening Plan, existing `.plans` contract, website design guardrails, public API route tests, and workspace scaffold boundary. |
| Assigned scope | `.plans` artifacts, root guidance, route-constant guardrail test, stylesheet guidance check, and workspace/auth decision-pack planning. |
| Files touched | `AGENTS.md`, `CLAUDE.md`, `README.md`, `packages/agent/src/app.ts`, `scripts/agent-contract.test.ts`, `scripts/public-content-contract.test.ts`, `.plans/active/ai-native-dev-workflow/**`, `.plans/backlog/workspace-auth-routing-decision-pack/**`. |
| Commands run | `bun run plans:validate`, `bun run test:plans`, `bun run test:agent`, `bun run test:content`, `bun run ui:check` |
| Failures or retries | None in the required validation suite; one ad hoc `rg` lookaround check failed because the default regex engine does not support lookahead, and it was replaced with focused source review. |
| Verification cost | Source-only guidance and contract tests; no browser proof because no rendered website UI changes. |
| Human judgment callouts | `public-website-design-implementation` is the first measured adoption surface, but no public UI implementation was changed in this pass. Workspace/auth code remains blocked until its decision pack is reviewed. |
| Follow-up rule updates | Public route rule and canonical stylesheet guidance were added to repo guidance and backed by focused tests. |
| Outcome | completed; `bun run plans:validate`, `bun run test:plans`, `bun run test:agent`, `bun run test:content`, and `bun run ui:check` passed. |
