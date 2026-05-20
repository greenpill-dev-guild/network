# Greenpill Network

Packages-first monorepo for the Greenpill Network public website, Fly-hosted agent service, shared public/private contracts, and future authenticated workspace.

## Package Layout

- `packages/website`: static Astro public website for `greenpill.network`, with Keystatic retained for editorial/site-composition content and approved operational content consumed from public snapshots.
- `packages/agent`: Hono service scaffold for `agent.greenpill.network`, local Postgres readiness, and future cache/intake jobs.
- `packages/admin`: self-hosted Directus admin service for `network-admin` / future `admin.greenpill.network`.
- `packages/shared`: reusable payload normalization and privacy-boundary contracts.
- `packages/workspace`: placeholder for the future authenticated workspace at `app.greenpill.network`.

## Repo Truth And Artifacts

- `.plans/` is the durable planning, research, handoff, and design-artifact surface.
- Runtime code, migrations, and shared contracts belong under `packages/`.
- Root-level `data/` is intentionally unused; graph research data lives with `.plans/backlog/knowledge-commons-graph-explorer/` until that backlog work becomes product code.
- Root `scripts/` should stay limited to active repo validation, migration, and package tooling. One-off plan generators belong beside the plan artifacts they produce.

## Requirements

- Bun `1.3.10` from the checked-in `packageManager` field.
- Node `>=22.12.0` for Astro and local agent commands.
- Docker Desktop or OrbStack for local Postgres and Directus containers.
- Fly CLI for validating and deploying the agent service.

## Install

```sh
bun install --frozen-lockfile
```

The root workspace owns the lockfile. Run installs from the repo root, not from an individual package.

## Website

```sh
bun run dev:website
bun run build:website
bun run preview:website
```

`bun run dev`, `bun run build`, and `bun run preview` delegate to the website package. The production static build emits to `packages/website/dist/`.

Keystatic is enabled only during local website development for editorial and site-composition authoring. It does not expose operational collections such as chapters, chapter initiatives, people, guilds, projects, or themes. There is no deployed Keystatic server, CMS API route, or public database connection in the website package.

Operational content for chapters, chapter initiatives, public steward profiles,
guilds, guild-owned projects, locations, and impact source bindings is
Directus/Postgres-owned after the one-time migration. Chapter initiatives are
local chapter-owned programs, campaigns, events, education series, cleanups,
Water Cup-style work, and impact efforts; guild `projects` remain
guild-owned tools, products, and workstreams. The static website consumes an
approved public snapshot at build time. By default local builds use
`packages/website/src/data/operational-content-snapshot.json`; production builds
can set `OPERATIONAL_CONTENT_SNAPSHOT_URL` to the agent route.
The seed JSON used for the one-time migration and local snapshot refresh lives in
`packages/website/src/data/operational-content-seed/`, outside Astro/Keystatic
editorial collections.

Public assets live in `packages/website/public/`. Generated public JSON routes include:

- `/locations.json` from the approved operational content snapshot.
- `/impact-sources.json` from approved snapshot chapter impact source bindings.

Useful operational content commands:

```sh
bun run content:snapshot
bun run content:migrate
bun run directus:content:setup
bun run directus:studio:setup
```

`content:snapshot` validates current operational content and refreshes the
static fallback snapshot. `content:migrate` is a one-time seed into the
`content` schema when `DATABASE_URL` or `DIRECT_DATABASE_URL` is set; it refuses
to run once operational rows exist unless `--allow-existing` is passed, and even
then it only inserts missing rows without overwriting Directus-owned conflicts.
`directus:content:setup` runs after Directus boots and applies the steward
editor, steward moderator, trusted publisher, and operator access model through
the Directus API. `directus:studio:setup` applies the Data Studio labels,
field ordering, interfaces, displays, and hidden technical collections that make
the same schema usable for steward editing.

The current public site deployment can remain on GitHub Pages. Because this is a monorepo, do not use the branch/folder picker to look for `packages/website/dist`; GitHub Pages branch publishing only supports the repository root or `/docs`. In repository settings, set Pages source to **GitHub Actions**. The `.github/workflows/github-pages.yml` workflow installs from the checked-in Bun lockfile, runs `bun run build:website`, and publishes `packages/website/dist`.

If we later migrate the public site to Vercel, use the repo root as the project root, `bun install --frozen-lockfile` as install command, `bun run build:website` as build command, and `packages/website/dist` as output directory.

## Agent And Local Postgres

```sh
cp .env.example .env.local
bun run db:local:up
bun run db:migrate
bun run dev:agent
```

The local agent defaults to `http://127.0.0.1:8787` with the values in `.env.example`.

Useful checks:

```sh
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ready
curl http://127.0.0.1:8787/impact/chapters/nigeria
curl http://127.0.0.1:8787/content/public-snapshot
```

`/health` is process-level health. `/ready` checks `DATABASE_URL` connectivity. `/content/public-snapshot` exposes only published public-safe operational content, including approved chapter initiatives for chapter detail pages. `/impact/chapters/:slug`, `POST /map-nodes`, `GET /map-nodes/public`, `/map/state`, and the map-node edit-link/update-request routes remain behind the agent privacy boundary.

Public map-node submissions require an owner email. The agent stores that email only in `intake.map_node_private_contacts` so future owner updates can use one-use email magic links. Configure email sending on the agent with `RESEND_API_KEY`, `MAP_NODE_EMAIL_FROM`, `MAP_NODE_EMAIL_REPLY_TO`, and `MAP_NODE_EDIT_BASE_URL`; do not expose those values to the static website, Keystatic, generated JSON, or browser bundles. Map magic-link replies should route to the monitored map mailbox on the verified sending subdomain, currently `Greenpill Network <map@mail.greenpill.network>`. Missing or failing email provider configuration still returns the same neutral public edit-link response.

For steward onboarding sessions, set `MAP_NODE_STEWARD_EMAIL_ALLOWLIST` on the
agent to a comma- or whitespace-separated list of steward emails. Matching
submissions are projected as `steward` nodes by the server; non-allowlisted
public submissions cannot self-claim steward, organizer, or coordinator roles.
Pair this with Live Onboarding Mode when steward nodes should appear publicly
during the session.

Resend delivery webhooks post to `https://agent.greenpill.network/webhooks/resend` and require `RESEND_WEBHOOK_SECRET`. Set `RESEND_WEBHOOK_RECIPIENT_HASH_SECRET` so recipient hashes are keyed rather than dictionary-searchable. Subscribe only to operational email events such as `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.failed`, `email.bounced`, `email.complained`, `email.suppressed`, and `email.received`; do not enable open/click tracking for map magic-link emails. The webhook route verifies Svix signatures and stores provider metadata only, not message bodies, subjects, sender addresses, raw recipient addresses, or free-form provider diagnostic messages.

Run `bun run db:cleanup:map-node-edit-flow` from a private environment with `DATABASE_URL` set to delete expired edit-token rows after their grace period and scrub retained private edit-link/update-request metadata.

## Directus Admin

Directus is self-hosted as a separate admin service, not as part of the public
Astro website.

```sh
bun run db:local:up
bun run db:migrate
bun run dev:admin
bun run directus:content:setup
bun run directus:studio:setup
```

The local Directus service runs at `http://localhost:8055` and connects to the
same local Postgres database as the agent. Use it for steward moderation,
authenticated operational content edits, owner-update review, and internal data
review only; keep public intake and public API traffic behind the agent routes.
Standard steward moderators see review-safe map-node submission/update fields.
Token rows, owner emails, IP/user-agent fields, rate-limit metadata, and raw
request metadata are reserved for trusted publisher/operator access.

Invite stewards without using the Directus UI by preparing a local TSV file with
`email`, `name`, `location`, and optional `role` columns:

```sh
bun run directus:users:invite -- --input /path/to/stewards.tsv
```

The default role is `Greenpill Steward Editor`. Use `--admin <email>` only for
the small number of users who should receive the admin-access
`Greenpill Operator` role.

Scope steward editing to assigned chapters and guilds with a local TSV file:

```sh
bun run directus:content-access -- assign --input /path/to/content-access.tsv
```

The TSV columns are `email`, `kind`, and `slug`, where `kind` is `chapter` or
`guild`. `Greenpill Steward Editor` users can read published operational
content, edit only assigned draft/pending chapter or guild content, and create
chapter initiatives or guild projects only under assigned parent records.
Publishing remains reserved for trusted publishers and operators.

After changing roles, permissions, assignment data, or Directus metadata, run a
temporary steward-session smoke test:

```sh
bun run directus:steward:smoke
```

The smoke test creates a temporary Steward Editor user, assigns it to one
chapter and one guild, verifies assigned create/update behavior and forbidden
unassigned creates through that user's token, then removes the temporary
records.

If Docker Desktop is installed but `docker` is not on your shell PATH, the local
Docker scripts fall back to Docker Desktop's bundled CLI path on macOS. If
OrbStack is installed, the same wrapper uses OrbStack's Docker/Compose binaries
and socket.

## Fly Deployment

Run Fly commands from the repo root so the workspace lockfile and package manifests are in Docker context.

```sh
fly config validate --config packages/agent/fly.toml
fly deploy --config packages/agent/fly.toml
```

The agent Dockerfile is `packages/agent/Dockerfile`. The production database direction is Fly Managed Postgres attached to the Fly agent app so `DATABASE_URL` is available only as a private Fly secret.

The Directus admin app is `network-admin` and deploys from `packages/admin`:

```sh
fly deploy --config fly.toml packages/admin
```

Attach the Fly Postgres connection to Directus as `DB_CONNECTION_STRING`, not as
`DATABASE_URL`, because Directus reads `DB_CONNECTION_STRING` for PostgreSQL
connection-string configuration.

Do not expose `DATABASE_URL` or direct database credentials to the public website deploy, Keystatic content, generated JSON, browser bundles, or any future Vercel project.

## Validation

```sh
bun run test:agent
bun run test:chapter-impact
bun run test:content
bun run test:map-nodes
bun run test:plans
bun run plans:validate
bun run build
```

The contract tests verify that agent routes, chapter impact payloads, public
operational snapshots, public map payloads, SQL projections, and plan hubs
preserve the public/private boundary.

## Privacy Boundary

Private map/member node intake must not expose emails, raw notes, IP addresses, user agents, spam metadata, steward review notes, pending submissions, or raw upstream EAS/Green Goods work and media feedback.

Public website data should stay static and public-safe. Directus-authenticated
operational edits must pass through the `content` schema, published views, and
shared snapshot guard before reaching the public website. Private intake, impact
cache state, migrations, and future authenticated operations belong behind the
Fly agent/workspace boundary.
