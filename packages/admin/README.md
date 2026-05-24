# @greenpill-network/admin

Directus admin service for steward moderation and internal data operations.

This service is intentionally separate from the static website. The public site
stays at `greenpill.network`, the Hono API stays at `agent.greenpill.network`,
and Directus runs as the private admin surface for `network-admin` on Fly.

## Local Runtime

Start the local Postgres database and apply the Greenpill schema first:

```sh
bun run db:local:up
bun run db:migrate
```

Then start Directus:

```sh
bun run dev:admin
```

Directus will be available at `http://localhost:3302`.

Default local bootstrap credentials are:

- Email: `admin@greenpill.network`
- Password: `directus-local-password`

Override them in your shell or root `.env.local` before first boot if you want a
different local admin user. `bun run dev:admin` reads the root `.env.local` when
it exists and otherwise uses the Docker Compose defaults. See
`packages/admin/.env.example` for the supported local Directus variables.

```sh
DIRECTUS_ADMIN_EMAIL=you@example.com
DIRECTUS_ADMIN_PASSWORD=replace-with-a-local-password
DIRECTUS_SECRET=replace-with-a-local-random-value
DIRECTUS_DB_SEARCH_PATH=array:public,content,intake,impact,workspace,audit
DIRECTUS_DB_HEALTHCHECK_THRESHOLD=2000
DIRECTUS_FILES_MAX_UPLOAD_SIZE=25mb
DIRECTUS_MAX_PAYLOAD_SIZE=25mb
```

The local Directus container connects to the existing local agent database at
`postgres://greenpill:greenpill@host.docker.internal:54329/greenpill_network`.
This keeps the admin pilot pointed at the same `intake`, `impact`, `workspace`,
`content`, and `audit` schema boundaries as the agent.

After Directus has booted, apply the Greenpill operational content access model:

```sh
bun run directus:content:setup
```

This script logs in as the configured Directus admin, verifies the `content`
collections are visible through the configured Postgres search path, and
creates/updates the Steward Editor, Steward Moderator, Trusted Publisher, and
Operator roles/policies/permissions.

## Fly Deployment

The Fly app name is `network-admin`. Deploy from the repo root:

```sh
fly deploy --config fly.toml packages/admin
```

Before the first deploy, set production secrets:

```sh
fly secrets set --app network-admin \
  SECRET="$(openssl rand -hex 32)" \
  ADMIN_EMAIL="admin@greenpill.network" \
  ADMIN_PASSWORD="replace-with-a-strong-password"
```

Attach the existing Fly Managed Postgres cluster using Directus' expected
connection variable name:

```sh
fly mpg attach <cluster-id> \
  --app network-admin \
  --database greenpill_network \
  --variable-name DB_CONNECTION_STRING
```

If the database is an unmanaged Fly Postgres app instead, use:

```sh
fly postgres attach <postgres-app-name> \
  --app network-admin \
  --database-name greenpill_network \
  --database-user network_admin \
  --variable-name DB_CONNECTION_STRING
```

Prefer a direct Postgres URL for the first Directus bootstrap if the managed
cluster offers both pooled and direct URLs. The admin service is low-traffic, and
Directus owns its own system migrations on first boot.

### Upload Storage

Production uploads use Tigris through Directus' S3 storage adapter. Keep the
bucket private and serve files through Directus permissions/API routes rather
than exposing the raw bucket.

Create the bucket and copy the generated access key output immediately:

```sh
fly storage create \
  --app network-admin \
  --name greenpill-network-admin-uploads
```

`fly storage create` sets standard `AWS_*` secrets on the app, but Directus
expects storage-specific names. Set the Directus aliases from the command output:

```sh
fly secrets set --app network-admin \
  STORAGE_TIGRIS_BUCKET="greenpill-network-admin-uploads" \
  STORAGE_TIGRIS_KEY="<AWS_ACCESS_KEY_ID from fly storage create>" \
  STORAGE_TIGRIS_SECRET="<AWS_SECRET_ACCESS_KEY from fly storage create>"
```

The non-secret storage settings live in `packages/admin/fly.toml`:

- `STORAGE_LOCATIONS=tigris`
- `STORAGE_TIGRIS_DRIVER=s3`
- `STORAGE_TIGRIS_ENDPOINT=https://t3.storage.dev`
- `STORAGE_TIGRIS_REGION=auto`
- `STORAGE_TIGRIS_ROOT=directus`
- `FILES_MAX_UPLOAD_SIZE=25mb`

Local development intentionally keeps uploads on disk at
`packages/admin/uploads`.

### Email

Production email is configured for SMTP with Resend-compatible defaults:

- Host: `smtp.resend.com`
- Port: `587`
- Username: `resend`
- Security: STARTTLS (`EMAIL_SMTP_SECURE=false`)

After verifying the sending domain in Resend, set the SMTP API key as a Fly
secret:

```sh
fly secrets set --app network-admin \
  EMAIL_SMTP_PASSWORD="<resend-api-key>"
```

The sender defaults to `Greenpill Network <no-reply@mail.greenpill.network>`.
Change `EMAIL_FROM` in `packages/admin/fly.toml` if the verified sender differs.

## Production Boundary

Directus may create and manage its `directus_*` system tables in the connected
database. Greenpill-owned product schema still belongs in
`packages/agent/migrations`.

Keep `DB_SEARCH_PATH=array:public,content,intake,impact,workspace,audit` on the
Directus service. `public` stays first so Directus system tables remain in the
normal schema, while `content` and the private schemas are visible to Data
Studio for authenticated operational work.

Do not expose Directus generated APIs as public intake APIs. Public submissions
should continue through `POST /map-nodes` on the agent so privacy filtering,
rate-limiting, and public projection contracts remain centralized.

### Operational Content

Directus is the authenticated editing surface for operational public content:
chapters, public steward profiles, guilds, projects, chapter locations, and
chapter impact source bindings. These tables live in the Greenpill-owned
`content` schema and are migrated from `packages/agent/migrations`, not from
Directus schema drift.

Only `publication_status='published'` rows enter the agent's
`/content/public-snapshot` route. Standard stewards should draft or request
review; trusted publishers/operators approve and publish. The static website
then consumes the approved snapshot at build time.

Directus Flows may send notifications or trigger rebuilds, but privacy
projection logic stays in SQL, `@greenpill-network/shared/public-content`, and
the agent route.

### Live Onboarding Mode

Live Onboarding Mode is controlled by the singleton
`intake.map_node_intake_settings` row. Only trusted operator/admin roles should
be able to update `live_onboarding_enabled`, `updated_by`, or `updated_at`.

Default is `live_onboarding_enabled=false`. For a workshop or onboarding demo,
an operator can set it to `true`; while enabled, `POST /map-nodes` auto-approves
new submissions, writes a private `system:live-onboarding` review row, and makes
the approved public projection available through `/map/state`. Turn it off
manually after the session. Do not expose this toggle through public URLs,
query parameters, browser storage, or generated website content.

To let known stewards create steward nodes during a session without exposing
Directus user data publicly, set the agent secret
`MAP_NODE_STEWARD_EMAIL_ALLOWLIST` to a comma- or whitespace-separated list of
`email=chapter-slug` entries. Plain email entries still promote the role for
compatibility, but mapped entries also attach the trusted public `chapterSlug`
to the steward node. The public form still submits a normal member role; the
agent promotes matching owner emails to `steward` server-side. Non-allowlisted
submissions are normalized away from steward/organizer/coordinator roles.

Before inviting stewards, run `bun run directus:content:setup` and confirm the
generated roles:

- Public role: no access to `content`, `intake`, `impact`, `workspace`, or `audit`.
- Steward editor: draft/update scoped `content` records, but no publish access.
- Steward moderator: read review-safe submission fields, update moderation
  status fields, and append review rows without private contacts or request
  metadata.
- Trusted publisher/admin: publish `content` records, moderate submissions, and
  view private contact details.
- Operator/admin: Directus configuration, emergency correction, and migrations.

Standard stewards must not receive field access to `ip_address`, `user_agent`,
`rate_limit_key`, `spam_signals`, raw operational metadata, or private contact
email unless they are in a trusted role.
