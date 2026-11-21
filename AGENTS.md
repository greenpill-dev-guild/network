# Greenpill Network

The guide every coding agent reads in this repository: Codex reads it directly, and Claude Code reads it through `CLAUDE.md`. Shared rules for afo's machine are in `~/.agents/AGENTS.md`; this file adds what is specific to this repository, and cloud agents that never see the machine rules get everything they need here.

## Working Style

Respond in a manner that is friendly, grounded, realistic, rationale, encouraging, and engaged. Keep the inner optimism focused on solutions and the path forward.

## Project Overview

Greenpill Network is a packages-first monorepo for the public Astro website, Fly-hosted agent service, shared public/private contracts, and future authenticated workspace.

Canonical package boundaries:

- `packages/website`: static Astro public website for `greenpill.network`, with Keystatic retained for editorial/site-composition content and approved operational content consumed from public snapshots.
- `packages/agent`: Hono service for `agent.greenpill.network`, local Postgres readiness, and future cache/intake jobs.
- `packages/admin`: self-hosted Directus admin service for `network-admin` / future `admin.greenpill.network`.
- `packages/shared`: reusable payload normalization and privacy-boundary contracts.
- `packages/workspace`: scaffold for the future authenticated workspace at `app.greenpill.network`.

## Commands

Run installs and validation from the repo root.

- `bun run dev` - preferred repo-native full local stack: website `3301`, Directus `3302`, agent/API `3303`, and Postgres `3304`.
- In the isolated dev machine there is no Docker: start Postgres and Directus on the Mac with `docker compose` and keep `dm-ports` running, then `bun run dev` uses them (README, "In The Isolated Dev Machine").
- `bun install --frozen-lockfile` - install the checked-in workspace dependency graph.
- `bun run dev:website` - run only the Astro dev server (port `3301`) and local Keystatic authoring UI.
- `bun run build` or `bun run build:website` - build the static website into `packages/website/dist/`.
- `bun run preview` or `bun run preview:website` - preview the built website.
- `bun run dev:agent` - run the local Hono agent server.
- `bun run dev:admin` - run the local Directus admin service against local Postgres.
- `bun run db:local:up` / `bun run db:local:down` - start or stop local Postgres.
- `bun run db:migrate` - apply the local agent database baseline.
- `bun run content:snapshot` - validate the static seed files and rewrite the fallback snapshot from them; it does not read the database.
- `bun run content:snapshot:from-agent` - refresh the committed fallback snapshot from the live agent public snapshot (database-backed).
- `bun run content:migrate` - one-time seed current operational content into the Postgres `content` schema; it refuses to run after rows exist unless `--allow-existing` is passed for controlled missing-row recovery.
- `bun run directus:content:setup` - apply Directus roles, policies, and permissions for operational content and intake moderation after Directus boots.
- `bun run directus:content-access -- assign --input <tsv>` - create chapter/guild assignment rows from a TSV file. The assignment row IS the grant: the role-level dynamic policy scopes access via `$CURRENT_USER`, and deleting a row (CLI or Directus UI) revokes immediately.
- `bun run directus:content-access -- verify` - read-only report of assignment rows, steward role status, and leftover legacy per-slug policies (`sync` is a deprecated alias).
- `bun run directus:content-access -- cleanup-legacy` - delete legacy per-slug scoped policies after `directus:steward:smoke` verifies the dynamic model.
- `bun run directus:studio:setup` - apply steward-friendly Directus Data Studio collection and field metadata.
- `bun run directus:local:bootstrap` - wait for local Directus, then apply local roles/permissions and Data Studio metadata; this local path ignores root `.env.local` to avoid production Directus admin settings.
- `bun run directus:steward:smoke` - create a temporary steward user and verify scoped Directus editing behavior.
- `bun run test:agent`, `bun run test:chapter-impact`, `bun run test:content`, `bun run test:map-nodes`, `bun run plans:validate` - focused contract checks.
- `bun run ui:check` - source-only website CSS guardrails; no build, browser, or screenshots.
- `bun run ui:verify <route>` - heavier website build + rendered browser proof at 375 / 1024 / 1440.

## Rules And Their Enforcers

Each rule names what enforces it. "Review only" means nothing fails automatically: the author and the reviewing agent hold it. CI jobs run on every pull request unless noted.

| Rule | Enforcer | Where |
| --- | --- | --- |
| Packages and scripts type-check; the site builds inside the Pages size budget | CI `PR checks` | `.github/workflows/pr-checks.yml` |
| Public agent routes use exported route constants and shared payload contracts | test, CI `PR checks` (`test:agent`) | `scripts/agent-contract.test.ts` |
| Public projections never expose emails, raw notes, IPs, user agents, spam metadata, steward notes, pending submissions or raw upstream feedback | tests, CI `PR checks` (`test:content`, `test:map-nodes`); review for new fields | `scripts/public-content-contract.test.ts`, `scripts/map-node-contract.test.ts` |
| Plan hubs follow the hub contract | CI `PR checks` (`plans:validate`) | `scripts/plan-hub.ts` |
| No em dashes in website copy | CI `Em dashes in website copy` | `.github/workflows/website-copy.yml` |
| Installs stay on the frozen lockfile and the release-age gate; workflow and guidance changes are audited | CI `audit / Supply-chain guardrails` | `.github/workflows/supply-chain-guardrails.yml` |
| `CLAUDE.md` imports this file, one skills folder, valid policy files, PR template, CODEOWNERS | CI `agents-doctor / Agents doctor` | `.github/workflows/agents-doctor.yml` |
| Guidance names only repository paths that exist; skills live in one folder | tests, CI `PR checks` | `scripts/guidance-paths.test.ts`, `scripts/repo-skill-discovery.test.ts` |
| Fly deploys, production migrations and Directus permission syncs are afo's to run | shared guards ask first (local); review only for cloud agents | `.agents/policy.json` |
| Changes to critical and sensitive paths follow the merge tiers | review only (no merge gate check) | `.agents/merge-policy.json` |
| Website CSS uses `--gp-*` tokens and the Modern CSS Standard | `bun run ui:check` locally; review only in CI | `scripts/ui-verify.ts` |
| Greenpill-owned migrations live only in `packages/agent/migrations`; Directus is never the public API; the website stays static | review only | this file |
| Install or upgrade no dependency without approval in the current task | review only | this file |

## Merge Tiers

Every merge into `main` redeploys the public website through GitHub Pages and is live within minutes; the rollback is a revert. Agents merge every tier on proof, by the tier rules in `.agents/merge-policy.json`, and record the tier and its proof in the pull request's Verification section. afo's approval sits at production promotion: the manual Fly deploys of the agent and the Directus admin, migrations applied to the production database, and Directus permission syncs against production. Agents never run those.

## Skills

Repository skills are in `.agents/skills` (`.claude/skills` links to it). `greenpill-ui` is this repository's UI skill. The shared `review`, `debug`, `plan`, `ship` and `research` skills come from the dev-surfaces kit and read `.agents/adapter.md` for this repository's commands, tiers and review lenses.

## Linear And Plan Hubs

Linear (workspace `greenpill-dev-guild`; teams Product `PRD` / Research `RESR`) is the durable backlog. GitHub Issues are not used for backlog work. `.plans` remains the execution truth for feature hubs, and Linear mirrors should carry `source:plans`. Agent work is labeled `ai:codex` (Codex), `ai:claude` (interactive Claude Code) or `ai:routine` (scheduled writes).

**Plan Hub Linear Mirror Policy**: scoped `.plans/ideas` and `.plans/backlog` hubs get one parent Linear issue for visibility. Do not create lane child issues, delegate agents, or treat scoped lane sketches as implementation specs until the human explicitly starts implementation or the hub moves to active execution. When implementation starts, create child issues only for the `.plans` lanes that are actionable at that time. If a scoped plan drifts before implementation, update the hub and parent issue first; do not rewrite a stale child tree.

When dispatched from a Linear issue, that issue is your spec: read it in full, plus this file and any `.plans/<feature>/` lane it references.

- **Ready gate.** Implement only if the issue gives clear acceptance criteria, a named surface (`website`, `agent`, `admin`, `shared` or `workspace`), and validation (explicit, or the relevant commands above). If anything is missing, the scope is ambiguous, or it needs a cross-package or architecture decision, stop and comment on the issue instead of guessing.
- **Executor, not orchestrator.** Implement only the scoped unit, in the smallest package boundary. Do not expand past the acceptance criteria or make sequencing decisions that belong to the human.
- **Branch and PR.** One issue per PR, and the PR body links it (`Closes PRD-NNN` or `Linear: PRD-NNN`). Merge by the tier rules above.
- **Before the PR**, run the matching validation (`bun run typecheck`, the focused `bun run test:*` for the surface, `bun run agentic:check` for website/UI work, then `bun run build`) and record the evidence, not "should work". Honor the Privacy Boundary below.

## Codex Permission Policy

- Keep the default local Codex posture at `sandbox_mode = "workspace-write"` and `approval_policy = "on-request"`.
- Keep `approvals_reviewer = "auto_review"` and the `balanced` default permissions profile enabled unless the user explicitly asks to change them.
- Do not add project-level `sandbox_mode = "danger-full-access"` or `approval_policy = "never"` overrides unless the user explicitly requests that exception.
- Prefer exact trusted project roots over broad home-directory trust entries.

## Architecture Notes

The public website remains static. Keystatic is enabled only during local website dev for editorial and site-composition content; there is no deployed Keystatic server or public website database connection.

Operational content for chapters, chapter initiatives, public steward profiles, guilds, guild-owned projects, locations, and impact source bindings is Directus/Postgres-owned after the one-time migration. Chapter initiatives are chapter-owned local programs, campaigns, events, impact efforts, education series, cleanups, and Water Cup-style work; `projects` remain guild-owned tools, products, and workstreams. The website consumes the approved public snapshot from `packages/website/src/data/operational-content-snapshot.json` by default, or from `OPERATIONAL_CONTENT_SNAPSHOT_URL` during production builds.

The public site never loads a chapter image from another host. The website build copies every remote chapter image, whether a Directus upload or an approved external URL, into the site through `packages/website/src/lib/chapter-image-copies.ts`, and pages read only the site-hosted path. Do not hotlink Directus `/assets/` URLs from website markup.

Website source and config live under `packages/website`:

- `packages/website/src/pages/index.astro` - homepage.
- `packages/website/src/content/` - file-backed editorial content collections and singletons.
- `packages/website/src/data/operational-content-snapshot.json` - static fallback for approved operational content.
- `packages/website/src/content.config.ts` - Astro content schema validation.
- `packages/website/keystatic.config.ts` - local Keystatic config.
- `packages/website/src/scripts/` - browser interaction scripts.
- `packages/website/src/styles/gp-tokens.css` - canonical design tokens and base styles (cascade layers, clamp() type).

## Website Design Guardrails

Before UI or CSS work in `packages/website`, load the design system sources in this order:

- `packages/website/DESIGN.md`, the UI standard, including the Modern CSS Standard and route reflow matrix. `packages/website/CLAUDE.md` is its always-loaded rule digest.
- `packages/website/src/styles/gp-tokens.css`.
- The relevant primitives in `packages/website/src/components/ui/*`.

Use `bun run ui:check` as the fast static guardrail for source CSS drift. Use `bun run ui:verify <route>` (`scripts/ui-verify.ts`: renders at 375/1024/1440 and runs axe) or the `greenpill-ui` skill when the rendered surface must be proven in-browser.

## Agentic Modern Web Standard

- Baseline target: Baseline Widely Available. Before frontend, UI, CSS, accessibility, browser proof, or web-design changes in `packages/website`, run repo-installed Modern Web Guidance with `bun run agentic:guidance`, then apply `packages/website/DESIGN.md` and the website token system.
- Prefer semantic HTML, native controls, platform CSS, and browser primitives before custom JavaScript. Keep landmarks, headings, links, forms, accessible names, focus states, touch targets, empty/error/loading states, and reduced-motion behavior clear in the rendered DOM and accessibility tree.
- Run `bun run agentic:check` for the hard guidance-readiness and advisory source proof path (`agentic:guidance`, `plans:validate`, plus `ui:check`). For local layout, interaction, motion, or public-route QA at the repo's 375 / 1024 / 1440 viewport loop, use the authenticated Brave QA profile through the live authenticated-browser path below. Treat `bun run agentic:browser-proof <route>` and the rendered `agentic:verify` lane as CI/clean-room proof only, and do not report them as local authenticated verification. `dev-surfaces` remains the cross-repo/global doctor for shared Modern Web Guidance cache refresh, Brave, and MCP readiness.
- Local agentic browser QA must use the authenticated Brave QA profile. Codex: use the Codex browser-extension path and claim the already-open Brave tab/window. Claude Code: use the Claude Code Chrome/Chromium extension path (`claude --chrome` or `/chrome`) and select the authenticated Brave profile/tab when it is installed, connected, and able to control the already-open Brave window. Do not fall back merely because the extension is branded Chrome. If the Brave extension path is unavailable or not connected, use Claude computer-use/visible desktop control of the already-open Brave window; if neither can reach authenticated Brave, report QA as blocked. Use this for admin, PWA, extension, wallet/passkey, staging-session, installed-app, and profile-dependent verification.
- Do not use isolated Browser, Playwright, or DevTools MCP profiles for local QA. Existing isolated browser-proof commands are CI/clean-room checks only and must not be reported as authenticated verification. If authenticated Brave access is blocked, stop and report QA as blocked.
- WebMCP has an explicitly approved public read-only runtime pilot in `packages/website/src/scripts/webmcp.ts`. Keep tools visible, page-scoped, and public-safe; do not expose Directus private state, database credentials, pending intake, steward notes, hidden admin actions, destructive operations, or background-only actions.
- For website work and MCP/tool selection, use `docs/agentic-mcp-tooling-runbook.md` as the role map before adding tools, changing proof lanes, or expanding WebMCP.

Generated public JSON routes include `/locations.json` and `/impact-sources.json`, derived from the approved operational content snapshot. Keep those outputs public-safe.

The agent package owns private runtime concerns. `/health` is process health, `/ready` checks `DATABASE_URL`, `/content/public-snapshot` exposes the approved operational snapshot, and the impact/map-node routes preserve public/private projection contracts.

Every new public agent route must have an exported route constant, a shared public payload contract in `packages/shared`, a public-safe normalizer or assertion, and a focused contract test. Do not add ad hoc website fetch shapes, public database access, or route-local privacy filters.

For local stack proof after `bun run dev` is running, validate `http://localhost:3302/server/ping`, `http://localhost:3303/ready`, and `http://localhost:3303/content/public-snapshot` before assuming Directus, Postgres, and the API are connected. The repo-native dev path seeds missing published operational content and runs the local Directus bootstrap so the admin UI is useful, not just reachable.

The admin package owns the self-hosted Directus deployment surface. Directus may manage `directus_*` system tables, roles, permissions, and Data Studio views, but Greenpill-owned schema migrations remain in `packages/agent/migrations`. Directus can edit the Greenpill-owned `content`, `intake`, and `impact` schemas only through role-scoped admin access configured by `bun run directus:content:setup`; `bun run directus:studio:setup` owns the Data Studio labels, field ordering, interfaces, displays, and hidden technical collections that make the schema usable for stewards. Directus must not become the public API.

## Deployment Notes

- The current public site can remain on GitHub Pages. If the project later migrates to Vercel, use repo root, `bun run build:website`, and `packages/website/dist`.
- Fly deploys should run from the repo root with `fly deploy --config packages/agent/fly.toml`.
- The Directus admin Fly app is `network-admin`; deploy it from the repo root with `fly deploy packages/admin --config packages/admin/fly.toml`.
- `DATABASE_URL` belongs only on private Fly services, starting with the agent app. Do not expose database credentials to the public website deploy, Keystatic content, generated JSON, browser bundles, or any future Vercel project.

## Privacy Boundary

Private map/member node intake must never expose emails, raw notes, IP addresses, user agents, spam metadata, steward review notes, pending submissions, or raw upstream EAS/Green Goods work and media feedback.

Use `packages/shared` contracts for public/private projections instead of duplicating privacy filters inside the website or agent.

## Supply Chain And Agent Safety

- Do not install or upgrade Bun, Python, or package-manager dependencies unless the user explicitly approves that install in the current task.
- Prefer existing repo tooling, checked-in lockfiles, and standard library options over adding new packages.
- Treat `package.json`, lockfiles, package-manager config, `.github/workflows/**`, `AGENTS.md`, `CLAUDE.md`, `.agents/**`, `.codex/**`, and `.claude/**` as security-sensitive surfaces. Call out changes to them in final summaries.
- Keep dependency installs on the checked-in Bun lockfile path and preserve the `bunfig.toml` release-age gate configuration.
