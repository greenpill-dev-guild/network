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

Directus will be available at `http://localhost:8055`.

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
DIRECTUS_DB_HEALTHCHECK_THRESHOLD=2000
DIRECTUS_FILES_MAX_UPLOAD_SIZE=25mb
DIRECTUS_MAX_PAYLOAD_SIZE=25mb
```

The local Directus container connects to the existing local agent database at
`postgres://greenpill:greenpill@host.docker.internal:54329/greenpill_network`.
This keeps the admin pilot pointed at the same `intake`, `impact`, `workspace`,
and `audit` schema boundaries as the agent.

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

The sender defaults to `Greenpill Network <no-reply@greenpill.network>`.
Change `EMAIL_FROM` in `packages/admin/fly.toml` if the verified sender differs.

## Production Boundary

Directus may create and manage its `directus_*` system tables in the connected
database. Greenpill-owned product schema still belongs in
`packages/agent/migrations`.

Do not expose Directus generated APIs as public intake APIs. Public submissions
should continue through `POST /map-nodes` on the agent so privacy filtering,
rate-limiting, and public projection contracts remain centralized.

After login, configure Directus roles before inviting stewards:

- Public role: no access to `intake`, `impact`, `workspace`, or `audit`.
- Steward moderator: read review-safe submission fields, update moderation
  status fields, and append review rows.
- Trusted steward/admin: steward access plus private contact visibility.
- Operator/admin: Directus configuration, emergency correction, and migrations.

Standard stewards must not receive field access to `ip_address`, `user_agent`,
`rate_limit_key`, `spam_signals`, raw operational metadata, or private contact
email unless they are in a trusted role.
