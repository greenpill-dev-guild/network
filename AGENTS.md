# AGENTS.md

This file gives Codex guidance for working in this repository.

## Working Style

Respond in a manner that is friendly, grounded, realistic, rationale, encouraging, and engaged. Keep the inner optimism focused on solutions and the path forward.

## Codex Permission Policy

- Keep the default local Codex posture at `sandbox_mode = "workspace-write"` and `approval_policy = "on-request"`.
- Keep `approvals_reviewer = "auto_review"` and the `balanced` default permissions profile enabled unless the user explicitly asks to change them.
- Do not add project-level `sandbox_mode = "danger-full-access"` or `approval_policy = "never"` overrides unless the user explicitly requests that exception.
- Prefer exact trusted project roots over broad home-directory trust entries.

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
- `bun install --frozen-lockfile` - install the checked-in workspace dependency graph.
- `bun run dev:website` - run only the Astro dev server and local Keystatic authoring UI.
- `bun run build` or `bun run build:website` - build the static website into `packages/website/dist/`.
- `bun run preview` or `bun run preview:website` - preview the built website.
- `bun run dev:agent` - run the local Hono agent server.
- `bun run dev:admin` - run the local Directus admin service against local Postgres.
- `bun run db:local:up` / `bun run db:local:down` - start or stop local Postgres.
- `bun run db:migrate` - apply the local agent database baseline.
- `bun run content:snapshot` - validate current operational content and refresh the static fallback snapshot.
- `bun run content:migrate` - one-time seed current operational content into the Postgres `content` schema; it refuses to run after rows exist unless `--allow-existing` is passed for controlled missing-row recovery.
- `bun run directus:content:setup` - apply Directus roles, policies, and permissions for operational content and intake moderation after Directus boots.
- `bun run directus:content-access` - assign Directus users to chapter or guild editing scopes from a TSV file.
- `bun run directus:studio:setup` - apply steward-friendly Directus Data Studio collection and field metadata.
- `bun run directus:local:bootstrap` - wait for local Directus, then apply local roles/permissions and Data Studio metadata; this local path ignores root `.env.local` to avoid production Directus admin settings.
- `bun run directus:steward:smoke` - create a temporary steward user and verify scoped Directus editing behavior.
- `bun run test:agent`, `bun run test:chapter-impact`, `bun run test:content`, `bun run test:map-nodes`, `bun run plans:validate` - focused contract checks.
- `bun run ui:check` - source-only website CSS guardrails; no build, browser, or screenshots.
- `bun run ui:verify <route>` - heavier website build + rendered browser proof at 375 / 1024 / 1440.

## Architecture Notes

The public website remains static. Keystatic is enabled only during local website dev for editorial and site-composition content; there is no deployed Keystatic server or public website database connection.

Operational content for chapters, chapter initiatives, public steward profiles,
guilds, guild-owned projects, locations, and impact source bindings is
Directus/Postgres-owned after the one-time migration. Chapter initiatives are
chapter-owned local programs, campaigns, events, impact efforts, education
series, cleanups, and Water Cup-style work; `projects` remain guild-owned
tools, products, and workstreams. The website consumes the approved public snapshot from
`packages/website/src/data/operational-content-snapshot.json` by default, or
from `OPERATIONAL_CONTENT_SNAPSHOT_URL` during production builds.

Website source and config live under `packages/website`:

- `packages/website/src/pages/index.astro` - homepage.
- `packages/website/src/content/` - file-backed editorial content collections and singletons.
- `packages/website/src/data/operational-content-snapshot.json` - static fallback for approved operational content.
- `packages/website/src/content/config.ts` - Astro content schema validation.
- `packages/website/keystatic.config.ts` - local Keystatic config.
- `packages/website/src/scripts/` - browser interaction scripts.
- `packages/website/src/styles/gp-tokens.css` - canonical global design tokens and base styles.

## Website Design Guardrails

Before UI or CSS work in `packages/website`, load the design system sources in this order:

- `packages/website/DESIGN.md`, including the Modern CSS Standard and route reflow matrix.
- `packages/website/src/styles/gp-tokens.css`.
- The relevant primitives in `packages/website/src/components/ui/*`.

Use `bun run ui:check` as the fast static guardrail for source CSS drift. Use
`bun run ui:verify <route>` when the rendered surface must be proven in-browser.

## Agentic Modern Web Standard

- Baseline target: Baseline Widely Available. Before frontend, UI, CSS, accessibility, browser proof, or web-design changes in `packages/website`, search and retrieve current Chrome Modern Web Guidance, then apply `packages/website/DESIGN.md` and the website token system.
- Prefer semantic HTML, native controls, platform CSS, and browser primitives before custom JavaScript. Keep landmarks, headings, links, forms, accessible names, focus states, touch targets, empty/error/loading states, and reduced-motion behavior clear in the rendered DOM and accessibility tree.
- Run `bun run agentic:check` for the advisory source proof path (`plans:validate` plus `ui:check`). Use `bun run agentic:browser-proof <route>` (same rendered lane as `agentic:verify`) when layout, interaction, motion, or public routes need browser proof at the repo's 375 / 1024 / 1440 viewport loop.
- For local human/agent browser walkthroughs, WebMCP validation, and DevTools MCP proof, prefer Brave with an isolated/non-default profile. Keep the repo commands Chrome/Chromium-compatible for contributors and CI unless a task explicitly requires Brave-only WebMCP validation.
- WebMCP has an explicitly approved public read-only runtime pilot in `packages/website/src/scripts/webmcp.ts`. Keep tools visible, page-scoped, and public-safe; do not expose Directus private state, database credentials, pending intake, steward notes, hidden admin actions, destructive operations, or background-only actions.
- For June website work and MCP/tool selection, use `docs/agentic-mcp-tooling-runbook.md` as the role map before adding tools, changing proof lanes, or expanding WebMCP.

Generated public JSON routes include `/locations.json` and `/impact-sources.json`, derived from the approved operational content snapshot. Keep those outputs public-safe.

The agent package owns private runtime concerns. `/health` is process health, `/ready` checks `DATABASE_URL`, `/content/public-snapshot` exposes the approved operational snapshot, and the impact/map-node routes preserve public/private projection contracts.

Every new public agent route must have an exported route constant, a shared public payload contract in `packages/shared`, a public-safe normalizer or assertion, and a focused contract test. Do not add ad hoc website fetch shapes, public database access, or route-local privacy filters.

For local stack proof after `bun run dev` is running, validate
`http://localhost:3302/server/ping`, `http://localhost:3303/ready`, and
`http://localhost:3303/content/public-snapshot` before assuming Directus,
Postgres, and the API are connected. The repo-native dev path seeds missing
published operational content and runs the local Directus bootstrap so the admin
UI is useful, not just reachable.

The admin package owns the self-hosted Directus deployment surface. Directus may
manage `directus_*` system tables, roles, permissions, and Data Studio views, but
Greenpill-owned schema migrations remain in `packages/agent/migrations`.
Directus can edit the Greenpill-owned `content`, `intake`, and `impact` schemas
only through role-scoped admin access configured by
`bun run directus:content:setup`; `bun run directus:studio:setup` owns the
Data Studio labels, field ordering, interfaces, displays, and hidden technical
collections that make the schema usable for stewards. Directus must not become
the public API.

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
- Treat `package.json`, lockfiles, package-manager config, `.github/workflows/**`, `AGENTS.md`, `CLAUDE.md`, `.codex/**`, and `.claude/**` as security-sensitive surfaces. Call out changes to them in final summaries.
- Keep dependency installs on the checked-in Bun lockfile path and preserve the `bunfig.toml` release-age gate configuration.
