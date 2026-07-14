---
name: review
description: Production-readiness review for a bounded Greenpill Network change. Use for PRs, branch diffs, working-copy changes, package or file reviews, and cross-package verification. Proves regression safety, requirement closure, privacy-boundary safety, and fresh production-readiness evidence before APPROVE; remains read-only unless the user explicitly requests fixes.
---

# Review Skill

Run a read-only review unless the user explicitly asks for a fix pass. Answer three questions with
fresh evidence:

1. **Regression Safety** — did the change preserve behavior that must remain stable?
2. **Gap Closure** — does the bounded feature satisfy every authoritative requirement and applicable state?
3. **Production Readiness** — did the required validation and runtime or browser proof pass now?

`APPROVE` is a bounded, evidence-backed readiness verdict. It is not a claim that unrelated
repository or production failures are impossible.

## Invocation

Support slash or natural-language forms:

- `/review website`, `/review shared agent`, `/review #123`, `/review path/to/file`
- `/review --mode report_only`
- `/review --mode verify_only --scope cross-package`
- `/review --mode apply_fixes` only with explicit fix intent
- “review the agent changes in this diff”

Modes are `readiness` (default), `report_only`, `verify_only`, and `apply_fixes`.

## Resolve Scope First

Resolve scope in this order and state it before inspecting code:

1. explicit package, PR, or file arguments; multiple arguments form a union
2. natural-language scope
3. the merge-base diff when no scope was supplied

If the working-copy inference finds no changed files, ask what to review. If the resolved scope is
larger than 800 changed lines, declare review batches and maintain a ledger of `REVIEWED` and
`REMAINING` files. Any remaining batch prevents `APPROVE`.

Valid package scopes:

| Scope | Paths |
|---|---|
| `website` | `packages/website/**` |
| `agent` | `packages/agent/**` |
| `admin` | `packages/admin/**` |
| `shared` | `packages/shared/**` |
| `workspace` | `packages/workspace/**` |
| `plans` | `.plans/**` |
| `docs` | `docs/**`, root guidance files |

`--scope cross-package` restricts findings to package boundaries and affected consumers. A PR
scope uses the PR diff. A file scope is the narrowest scope.

## Establish Authoritative Requirements

After resolving code scope, establish the baseline in this order:

1. the user’s current request and acceptance criteria
2. the PR description and linked Linear issue
3. the Linear issue parsed from a conventional branch name
4. a referenced `.plans/` hub or lane, including `brief.md`, `spec.md`, `plan.todo.md`, and
   `status.json` when present
5. directly applicable package, architecture, design, deployment, or runbook documentation

Record the sources that were available. If authoritative requirements cannot be established, or a
required source is unavailable, continue with useful findings but return `COMMENT_ONLY`; do not
claim that no gaps remain.

When the branch matches `<user>/<team-key>-<id>-<slug>`, load the linked Linear issue and surface
its title, acceptance criteria, and relevant labels. If the branch does not parse to a Linear ID,
skip this step without blocking the review.

## Readiness Boundary

Plain `/review` runs strict `readiness` mode. Inspect the bounded feature path and run the
non-mutating Review Readiness Gate in
[`validation-pipeline.md`](../../context/validation-pipeline.md).

The bounded feature path includes:

- changed implementation, migrations, configuration, and tests
- direct callers and downstream package consumers of changed public behavior or data shapes
- applicable loading, error, empty, permission, privacy, offline, responsive, accessibility,
  migration, destructive-operation, recovery, localization, and deployment states

Do not expand this into a whole-repo audit. Default mode remains read-only.

## Risk Lenses

Scan the diff before producing findings. Declare which lenses fired and why.

### Architecture and boundaries

Run this lens when the change introduces or moves a public contract, crosses package boundaries,
adds a public agent route, changes content ownership, moves schema ownership, or touches at least
three packages. Check the canonical boundaries in `AGENTS.md` and `CLAUDE.md`.

Hard Network invariants include:

- the website stays static and consumes only approved public snapshots
- public agent routes use exported route constants and shared public payload contracts
- public/private projection and privacy filtering live in `packages/shared`
- Greenpill-owned migrations remain in `packages/agent/migrations`
- Directus remains an admin surface, not the public API

### Principles and reliability

Run this lens for silent catches, hidden user-affecting fallbacks, moved permission checks,
multi-concern functions, nested conditionals, one-off wrappers, retry changes, or comments that
duplicate implementation instead of explaining a decision.

### Testing

Run this lens when public APIs or payloads change, a bug is fixed, a state transition changes, a
migration changes, or existing assertions are removed. A behavior-changing bug fix without a
regression test is a hard signal.

### Supply chain and operations

Run this lens for package or lockfile changes, environment-variable changes, Fly or GitHub Actions
changes, public export removals, migrations, backfills, delivery scripts, or destructive commands.
Treat package-manager, workflow, guidance, `.codex/**`, and `.claude/**` changes as
security-sensitive surfaces.

### Website design and accessibility

Run this lens for frontend, UI, CSS, content interaction, accessibility, or responsive changes.
Read `packages/website/DESIGN.md`, `packages/website/src/styles/gp-tokens.css`, the relevant UI
primitives, and [`greenpill-ui`](../greenpill-ui/SKILL.md). Retrieve Modern Web Guidance as required
by the repo contract. Visible UI requires authenticated Brave proof; isolated browser profiles and
clean-room proof commands cannot substitute for local authenticated QA.

## Judgment Routing

Separate findings into:

- **Agent-Fix-Now** — mechanical or localized issues with an obvious safe fix, such as broken
  imports, type failures, missing nearby regression coverage, or clear invariant violations.
- **Human-Judge** — dependencies, auth or permissions, migrations and backfills, destructive
  operations, trust-boundary changes, retry/fallback policy, deployment behavior, and shared public
  API decisions.

Do not auto-resolve Human-Judge items.

## Three-Pass Workflow

### 1. Confirm scope

Start with:

```text
Review scope: [packages | PR | files | working tree]
Files in scope: [count] (packages touched: ...)
Review mode: readiness | report_only | verify_only | apply_fixes
Requirement sources: [request | PR | Linear | .plans | docs]
```

### 2. Pass One — Regression Safety

Identify:

- behavior intentionally changed
- behavior that must remain stable
- direct callers and downstream consumers
- regression tests proving the behavior boundary
- rendered, runtime, migration, or deployment journeys automation does not prove

For visible UI, begin from the rendered surface and use the authenticated Brave path.

### 3. Pass Two — Gap Closure

Map every authoritative requirement to implementation and evidence using `SATISFIED`, `MISSING`,
`BLOCKED`, or `OUT_OF_SCOPE`. Mark irrelevant states `N/A` with a short reason.

A `MISSING` requirement produces `REQUEST_CHANGES`. A `BLOCKED` requirement prevents approval and
produces `COMMENT_ONLY` unless another confirmed finding already requires changes.

Always inspect the privacy boundary when public data, map/member intake, Directus content, impact
data, or agent routes are involved. Public output must not expose emails, raw notes, IP addresses,
user agents, spam metadata, steward notes, pending submissions, or raw upstream feedback.

### 4. Pass Three — Production Readiness

Run the Review Readiness Gate and all scope-conditional checks from
[`validation-pipeline.md`](../../context/validation-pipeline.md) in this invocation. Do not reuse
stale proof. Use only `PASS`, `FAIL`, `BLOCKED`, or `N/A`.

A required `FAIL` produces `REQUEST_CHANGES`. A required `BLOCKED` produces `COMMENT_ONLY` unless a
confirmed finding already requires changes.

For local stack proof, verify the repo-owned surfaces relevant to the change. When the full stack
is in scope, include Directus ping, agent readiness, and the public content snapshot endpoint.
Production claims require live endpoint evidence rather than local inference.

### 5. Keep findings high-confidence

A finding must have a concrete file reference, a clear consequence, and a credible next step.
Drop speculative, preference-based, and low-confidence notes. Follow affected behavior beyond
changed lines, but do not review unrelated code.

## Output Contract

Use this exact order:

### Summary

State what changed, blast radius, requirement sources, scope trustworthiness, and triggered lenses.

### Requirements Coverage

Map each requirement to evidence with `SATISFIED`, `MISSING`, `BLOCKED`, or `OUT_OF_SCOPE`.

### Regression Coverage

State changed and preserved behavior, callers and consumers, regression proof, runtime or rendered
proof, and any remaining review batches.

### Severity Mapping

- `Critical|High -> must-fix`
- `Medium -> should-fix`
- `Low -> nice-to-have`

### Must-Fix

Include only high-confidence correctness, privacy, invariant, permission, migration, or reliability
issues.

### Should-Fix

Include meaningful production-quality issues worth fixing in this change.

### Nice-to-Have

Keep low-risk suggestions short or leave the section empty.

### Verification

Report each required check as `PASS`, `FAIL`, `BLOCKED`, or `N/A`, with the command or observable
proof. Never place future-tense “should run” evidence beside `APPROVE`.

### Recommendation

End with exactly one:

- `APPROVE` — all requirements are satisfied, bounded scope and consumers are fully reviewed, all
  required proof passes, and Must-Fix and Should-Fix are empty
- `REQUEST_CHANGES` — a requirement is missing, required proof failed, or a must-fix or should-fix
  production-quality gap remains
- `COMMENT_ONLY` — requirements, scope, human judgment, or required proof are unavailable or
  blocked, and no confirmed gap already requires changes

Format findings as:

```text
[Title]
- Severity: critical | high | medium | low
- Type: correctness | privacy | invariant | testing | dependency | permissions | migration | reliability
- Evidence: file:line
- Why it matters: ...
- Next step: ...
```

## Modes

- `readiness` — run all three passes. This is the only read-only mode that may return `APPROVE`.
- `report_only` — report requirements, regressions, and findings without requiring the readiness
  gate. A clean report ends `COMMENT_ONLY`; confirmed gaps end `REQUEST_CHANGES`.
- `verify_only` — focus on blast radius, dependency order, and consumers. A standalone green pass
  ends `COMMENT_ONLY`; only an enclosing readiness review may approve. Read
  [`cross-package-verify.md`](./cross-package-verify.md).
- `apply_fixes` — require explicit fix intent, address Agent-Fix-Now findings, then rerun the full
  readiness review. Read [`apply-fixes.md`](./apply-fixes.md).

Only post to GitHub when PR context exists. Return working-copy findings in chat.

## Anti-Patterns

- implying complete coverage for more than 800 changed lines without a finished batch ledger
- approving with missing requirements, remaining batches, unresolved human judgment, or blocked proof
- treating isolated browser evidence as authenticated Brave proof
- treating local success as production proof
- broadening a bounded review into an unrelated repo audit
- auto-fixing dependencies, permissions, migrations, or destructive operations
