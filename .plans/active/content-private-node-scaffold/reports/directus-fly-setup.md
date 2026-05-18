# Directus Fly Setup

## Decision

Move the Directus pilot from managed Cloud to a self-hosted Fly app named
`network-admin`.

Directus remains a separate admin surface. It is not nested inside the static
Astro website and it does not replace the Hono agent as the public intake/API
boundary.

## Local Shape

- Directus runs from `packages/admin/docker-compose.yml`.
- Local URL: `http://localhost:8055`.
- Local database: the existing agent Postgres database on port `54329`.
- Local command: `bun run dev:admin`.

Run local database setup first:

```sh
bun run db:local:up
bun run db:migrate
```

## Production Shape

- Fly app: `network-admin`.
- Initial URL: `https://network-admin.fly.dev`.
- Future custom URL: `https://admin.greenpill.network`.
- Database env var: `DB_CONNECTION_STRING`.
- Directus image: `directus/directus:11.17.0`.

Required first-deploy secrets:

```sh
fly secrets set --app network-admin \
  SECRET="$(openssl rand -hex 32)" \
  ADMIN_EMAIL="admin@greenpill.network" \
  ADMIN_PASSWORD="replace-with-a-strong-password"
```

Attach Fly Managed Postgres with Directus' expected connection-string variable:

```sh
fly mpg attach <cluster-id> \
  --app network-admin \
  --database greenpill_network \
  --variable-name DB_CONNECTION_STRING
```

## Safety Notes

Back up or snapshot the production database before the first Directus boot.
Directus will create its own `directus_*` system tables in the connected
database.

Greenpill-owned schema remains canonical in `packages/agent/migrations`.
Directus may configure Data Studio displays, roles, policies, and workflows, but
it should not become the source of truth for product schema changes.

Do not expose Directus generated APIs as public submission APIs. Public map-node
intake stays on the agent route so privacy filtering and public projection
contracts stay centralized.
