# Repository adapter: Greenpill Network

The kit skills (review, debug, plan, ship, research) read their own section here plus `## checks`. Field names follow the kit's `adapters/TEMPLATE.md`. Where a field points to a repository file, that file owns the rule: follow it when it and this summary differ.

## checks

### Guide
`.claude/context/validation-pipeline.md` owns the Review Readiness Gate and the surface-by-surface checks. `AGENTS.md` § Commands and § Rules And Their Enforcers summarize them.

### Base
The live PR base when one exists, otherwise `origin/main`. Fetch it before computing the change set. `main` is both the integration branch and the production website: there is no `develop`.

### Command rules
- Run everything from the repository root through the package scripts in `package.json` (`bun run <script>`). Focused test files run with `bun test scripts/<name>.test.ts` after `bun run build:packages` when they import a workspace package; the `test:*` scripts do that for you.
- Scripts that must not read a root `.env` run with `bun --no-env-file`, as the package scripts do.
- The dev machine shares one 8 GB VM with other repositories. The website build, `ui:verify`, the browser smokes (`test:*:browser`) and the database proofs (`test:*:db`) belong in CI; locally run one heavy step at a time, check `uptime` first, and wait while the one-minute load is above 12.
- Never run `db:migrate`, `content:migrate`, `directus:content:setup` or a mutating `directus:content-access` against production, and never `fly deploy`: those are afo's (`.agents/policy.json`).

### Selector
none. Choose tiers by hand from **Tiers**, then add every row of **Conditional checks** whose surface the change touches.

### Tiers
| Tier | Use | Command |
|---|---|---|
| targeted | the smallest proof of one changed behavior | `bun run build:packages && bun test scripts/<name>.test.ts`, or the focused `bun run test:<surface>` |
| style | path-scoped, non-mutating format and lint | `bun run ui:check` for website CSS and `bun run check:em-dashes` for website copy; no formatter or linter is configured yet |
| checkpoint | a coherent cross-package batch or shared-interface change | `bun run typecheck && bun run test:content && bun run test:agent && bun run test:map-nodes && bun run test:chapter-impact` |
| push | ready-for-CI gate on the committed tree before a push | the checkpoint tier plus `bun run plans:validate`; the build and size budget run in CI `PR checks` |
| readiness | explicit production-readiness review; non-mutating full local gate | **Guide** § Review Readiness Gate: `bun run typecheck`, `bun run plans:validate`, `bun run build`, plus every conditional check, each fresh |
| full | explicit full local gate | the readiness tier plus `bun --bun run --cwd packages/website check` |
| release | release gate | none: merges into `main` deploy the website; Fly deploys, production migrations and Directus permission syncs are afo's manual steps |

### Conditional checks
**Guide** § Review Readiness Gate lists them by surface. In short:
- Agent routes, readiness or moderation → `bun run test:agent`
- Operational content, Directus-owned public projections or snapshots → `bun run test:content`
- Chapter impact contracts → `bun run test:chapter-impact`
- Map/member node contracts → `bun run test:map-nodes`; map editing routes → `bun run test:map-edit`
- `.plans/**` or plan tooling → `bun run test:plans` and `bun run plans:validate`
- Steward permission model (`scripts/directus-content-access.ts`) → `bun test scripts/directus-content-access.test.ts`
- Agent guidance, skills or `.agents/**` → `bun test scripts/guidance-paths.test.ts scripts/repo-skill-discovery.test.ts`
- Website, UI or CSS → `bun run agentic:check`, then rendered proof per **Rendered proof**
- Full local stack → after `bun run dev`, `http://localhost:3302/server/ping`, `http://localhost:3303/ready` and `http://localhost:3303/content/public-snapshot`
- A production claim → live endpoint evidence (`https://agent.greenpill.network/ready`, the deployed page), never local inference

### Criticality
`.agents/merge-policy.json` owns the tiers and their paths.
- Critical: `packages/agent/migrations/**`, `scripts/directus-content-access.ts`, `scripts/directus-operational-content-setup.ts`, both `public-content.ts` projections, both `fly.toml` files, `.github/workflows/**`. Read every touched line; merge on the full gate plus a fresh agent's adversarial review naming the head SHA.
- Sensitive: the rest of `packages/agent/src`, `packages/shared/src`, `packages/admin`, `scripts/directus-*`. Merge on the required checks plus that review.
- Routine: everything else. Merge on the required checks.

### CI
GitHub Actions. Required at the PR's current head SHA (`.agents/merge-policy.json` `requiredChecks`): `PR checks`, `Em dashes in website copy`, `audit / Supply-chain guardrails`, `agents-doctor / Agents doctor`. CI owns the website build, the Pages size budget and Astro's type check; a local run never stands in for pending CI.

### Rendered proof
`AGENTS.md` § Agentic Modern Web Standard owns the rules. Label every capture with its engine and session. Local QA of visible UI uses the authenticated Brave profile; `bun run ui:verify <route>` and `agentic:browser-proof` are clean-room proof and are never reported as authenticated. If authenticated Brave cannot be reached, record that proof as blocked, not passed.

## review

### Scopes
`website`, `agent`, `admin`, `shared`, `workspace` → `packages/<name>/**`; `plans` → `.plans/**`; `scripts` → `scripts/**`; `docs` → `docs/**` plus root guidance (`AGENTS.md`, `CLAUDE.md`, `README.md`); `guidance` → `.agents/**`, `.claude/**`, `AGENTS.md`, `CLAUDE.md`, `packages/website/CLAUDE.md`.

### Special scopes
none beyond the skill's `--scope cross-package`, which here pays special attention to public/private projections, public agent route contracts, approved operational snapshots, migration ownership, and the rule that Directus is not the public API.

### Dependency order
`shared` → `agent` and `admin` → `website` and `workspace`.

### Requirement sources
- The PR description and the Linear issue it links (`Closes PRD-NNN`, `Linear: PRD-NNN`).
- A referenced `.plans/<stage>/<slug>/` hub: `brief.md`, `spec.md`, `plan.todo.md`, `eval.md`, `status.json`.
- Directly applicable package, architecture, design, deployment or runbook docs (`packages/website/DESIGN.md`, `packages/admin/STEWARD_GUIDE.md`, `README.md`).

### Invariants
`AGENTS.md` keeps the durable list (§ Architecture Notes, § Privacy Boundary, § Rules And Their Enforcers). Check every diff for:
- the website stays static and consumes only the approved public snapshot; no public database access;
- public agent routes use exported route constants, a shared public payload contract in `packages/shared`, a public-safe normalizer and a focused contract test;
- public/private projection and privacy filtering live in `packages/shared`, never route-local;
- Greenpill-owned migrations stay in `packages/agent/migrations`; Directus is an admin surface, never the public API;
- chapter images are served from the site, never hotlinked from Directus `/assets/`;
- privacy boundary, inspected whenever public data, map/member intake, Directus content, impact data or agent routes are involved: public output never exposes emails, raw notes, IP addresses, user agents, spam metadata, steward notes, pending submissions or raw upstream feedback.

### Quality bar
`AGENTS.md` and the shared pragmatic-programming rules in `~/.agents/AGENTS.md` where present. Judge against them; do not restate textbook principles.

### Architecture guide
none.

### State lens
Triggers: map node moderation and approval, chapter update requests and their children, the snapshot alert episodes, newsletter and email outbox delivery, and any migration that changes a status column. Matrix: none; build it from the migration and its integration test (`scripts/*.integration.ts`).

### Critical lenses
- Migrations → schema lens: forward-only, tolerant of the currently deployed agent (deploy tolerant code first, then migrate), and covered by an integration proof.
- Steward permission model and Directus setup scripts → permissions lens: what a steward can read, create, edit and publish, scoped by assignment rows through `$CURRENT_USER`; the content-access test pins it.
- Public projections (`public-content.ts`) → privacy lens: allowlisted fields only; nothing private reaches a public payload.
- Fly configs and workflows → deploy and supply-chain lens: required check names stay stable, actions are pinned, no secret reaches the website build.
- Website UI → design and accessibility lens: `packages/website/DESIGN.md`, `gp-tokens.css`, the `greenpill-ui` skill and Modern Web Guidance.

### Judgment routing
Separate findings into Agent-Fix-Now (mechanical or local with an obvious safe fix: broken imports, type failures, missing nearby regression coverage, a clear invariant violation) and Human-Judge (dependencies, auth or permissions, migrations and backfills, destructive operations, trust-boundary changes, retry or fallback policy, deployment behavior, shared public API decisions). Human-Judge items go under Human Call-Outs and are never auto-resolved, under `--fix` either.

### Test budget
none.

### Deep pass
The harness's built-in `/code-review`; say so and use it rather than hand-rolling depth.

### Gap shapes
- A touched view or route missing one of its states: loading, error, empty, permission, privacy, offline, responsive, accessibility, migration, destructive-operation, recovery, localization or deployment.
- A new public agent route or payload field without its shared contract and contract-test update.
- A Directus collection or field change without the matching `directus:studio:setup` metadata or steward guide update.
- A command, environment variable or path renamed without updating `AGENTS.md`, `README.md` or the skills.

### Not findings
Isolated browser or headless captures labeled as clean-room proof are expected evidence, not a mislabel; only presenting them as authenticated proof is a finding.

### Immutable records
`.plans/audits/**` and `.plans/**/reports/**`.

### Tracker
Linear (workspace `greenpill-dev-guild`, team Product `PRD`); ask before creating anything.

## debug

### Context
`AGENTS.md`, `packages/website/CLAUDE.md`, `packages/website/DESIGN.md`, `README.md`, `packages/admin/STEWARD_GUIDE.md`.

### Reporters
Chapter stewards and guild leads (Directus users), site visitors, and the agent's own alert watchdog.

### Safety
Never run production migrations, Directus permission syncs or Fly deploys (`.agents/policy.json` asks first). Reads of the production database need afo's OK in the session. Prefer the local stack (`bun run dev`, ports 3301 to 3304) for reproduction.

### Real surface
`https://greenpill.network` (GitHub Pages, from `main`), `https://agent.greenpill.network` (Fly app `network-agent`), Directus at `network-admin` signed in as a steward in authenticated Brave.

### Layers
Triage: website build (static, snapshot-fed) → agent route (Hono) → Postgres views and tables → Directus admin. Data: committed fallback snapshot, live agent snapshot, Postgres `content`, `intake` and `impact` schemas. Extra evidence: the Pages deploy run for the commit, the agent's `/ready` and impact cache status.

### Data path
Page → `packages/website/src/data/operational-content-snapshot.json` or `OPERATIONAL_CONTENT_SNAPSHOT_URL` at build → agent `/content/public-snapshot` → `content` schema projection views → Directus edits. Map: home map → agent map state route → map node tables and moderation.

### Environment truth
The commit GitHub Pages last deployed, the deployed agent version (`fly status -a network-agent`, read-only), the migrations applied in production (`audit.agent_schema_migrations`, read with afo's OK), and whether the build used the live snapshot URL or the committed fallback.

### Boundary probes
Agent: `GET /health`, `GET /ready`, `GET /content/public-snapshot`. Directus: `GET /server/ping`. Database: the `test:*:db` integration scripts against local Postgres on 3304.

### Known errors
The first request to `network-admin` after idle answers 503 for about a minute: the app scales to zero. Retry before diagnosing.

### UI gotchas
Text overrides need `:global(.gp-text.x)` specificity, because `Text` and `Overline` carry no page scope. The home map needs the agent's CORS allowlist, so serve a built site on port 3301 when testing it locally.

### Known symptoms
| Symptom | Likely cause | Diagnostic |
|---|---|---|
| Site shows stale chapters | build used the committed fallback snapshot | the Pages run log for the snapshot source |
| Home map empty locally | page served from a port the agent does not allow | the browser console's CORS error |
| Directus 503 | cold start | retry after a minute |

### Evidence map
Agent entrypoint → `packages/agent/src/app.ts`; migrations → `packages/agent/migrations`; public contracts → `packages/shared/src`; Directus setup → `scripts/directus-*.ts`; website build → `packages/website/astro.config.mjs`.

### Telemetry
`fly logs -a network-agent` (read-only). No other telemetry.

### Known-failure notes
A Linear comment on the issue, or a new `PRD` issue when afo asks.

### Slices
none.

### Tracker
Linear stays read-only during debugging unless the user asks to file or update.

## plan

### Context
`AGENTS.md`, `.plans/README.md`, `packages/website/DESIGN.md`.

### Quality bar
`AGENTS.md`.

### Priorities
privacy boundary → static public site → steward usability → speed of change.

### Design sections
Privacy: which fields become public and through which shared contract.

### Architecture guide
none.

### Seam registry
none.

### Plan location
`.plans/{ideas,backlog,active,archive}/<feature-slug>/`; archive closed hubs under `.plans/archive/`.

### Plan files
`brief.md`, `spec.md`, `plan.todo.md`, `eval.md`, `status.json` (machine state), `handoffs/`, `reports/`, `artifacts/` (`.plans/README.md` § Feature Hub Contract). `bun run plans:validate` checks them.

### Lanes and proof
Lanes are named in `plan.todo.md`; proof is recorded in `eval.md` and `reports/`. No legacy exceptions.

### Dependency order
migrations → `shared` → `agent` and `admin` → `website`.

### Always-separate
A migration and the agent code that first depends on it ship in separate merges: tolerant code first, then the migration.

### Plan triggers
A new public payload field, a migration, a Directus permission change, or a change touching three or more packages.

### Start gate
`bun run plans:validate`.

### Tracker mirror
`AGENTS.md` § Linear And Plan Hubs: one parent Linear issue per scoped hub, labeled `source:plans`; child issues only for lanes actionable when implementation starts.

### Closeout
Every unchecked item, partly met eval check and open follow-up gets a Linear issue before a hub is archived; then move the hub to `.plans/archive/` and run `bun run plans:validate`.

### Lifecycle
Review active hubs monthly; notes go in the hub's `handoffs/`; `.plans/audits/**` and `reports/**` are immutable.

### Templates
`.plans/_templates/feature`.

### Teams
none.

## ship

### Branch check
none; branches are named `<agent>/<slug>` (for example `claude/trust-kit`).

### Protected branches
`main` (ruleset "Protect main": pull requests only, required checks).

### PR issue line
Link the Linear issue when one exists (`Closes PRD-NNN` or `Linear: PRD-NNN`); work without an issue needs none.

### Hooks
none.

### Commit format
Short imperative subject, often prefixed with the area (`Website: ...`, `CI: ...`). Signed commits; end with the co-author trailer and the `Agent-Model:` line from `~/.agents/evals/bin/agent-model` when it prints one.

### Push gate
none locally; CI is the gate.

### PR
`.github/pull_request_template.md` (Why, Measured, Verification, Not verified). Verification names the merge tier from `.agents/merge-policy.json` and the proof that tier needs.

### Merge
`.agents/merge-policy.json`: merge commits only. Routine auto-merges on green; sensitive and critical merge by hand with `gh pr merge --merge --match-head-commit <reviewed-sha>` once their review is addressed.

### After merge
Check the Pages deploy for the merge commit and the live page; close the Linear issue with a closeout comment.

### Report line
The PR URL with its state, and the Pages deploy result for website changes.

### Unattended
Draft PRs only, routine paths only, at most ten files.

## research

### Plan entry point
The hub's `brief.md`, then `status.json`.

### Neighbor skills
Website UI questions → `greenpill-ui`.

### Durable evidence
In the owning plan hub under `reports/` or `artifacts/`; never a new report file at the repository root.

### Mapping workflow
none.

### Tracker
Linear; no writes without a separate request.
