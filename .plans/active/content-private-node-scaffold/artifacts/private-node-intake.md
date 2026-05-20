# Private Node Intake Scaffold

This contract keeps `greenpill.network` anonymous and public by default while allowing visitors to add themselves to the map without exposing private contact data.

## Boundary

- `Astro + Keystatic` remains canonical for editorial/site-composition content: books, translations, stories, resources, page singletons, and long-form public copy.
- `Directus + Postgres` owns authenticated operational edits for themes, chapters, guilds, projects, public people/stewards, locations, and impact source bindings.
- `Fly Managed Postgres` stores user-submitted map/member nodes, private emails, moderation state, spam metadata, and steward review history.
- The public site reads only approved public projections and snapshots. It never reads Directus APIs, private intake tables, or database credentials directly.

## Public Content Contracts

- `themes` is the shared public taxonomy for books, chapters, projects, stories, people/stewards, and approved submitted nodes.
- `people` stores reusable public steward profiles only: display name, role, avatar, bio, public links, and themes.
- `books` can carry optional `sections`, `themeSlugs`, and `relatedStorySlugs` while preserving existing PDFs and translations. Project references belong to the operational snapshot/Directus boundary, not editorial book metadata.
- Chapter map data is generated from the approved operational content snapshot through `/locations.json`; a checked-in public `locations.json` file is no longer a hand-maintained source of truth.
- `GET /content/public-snapshot` is the agent-owned public snapshot route for published operational content. Static website builds can fetch that route or use the checked-in fallback snapshot.
- Public snapshot rows are assembled from explicit SQL allowlists and then checked by `@greenpill-network/shared/public-content`; raw editor JSON and workflow metadata are not part of the public projection.

## Private Intake Data

The SQL contract lives in `packages/agent/migrations/001_private_map_node_schema.sql`.

- `map_node_submissions`: public-safe submission body plus moderation/spam fields.
- `map_node_private_contacts`: email and consent, keyed separately from public fields.
- `map_node_reviews`: steward review history and private review notes.
- `public_map_nodes`: approved-only view with no email, raw note, IP, user agent, rate-limit key, spam signals, or review notes.

## Agent Route Contracts

`POST /map-nodes`

- Creates a pending submission.
- Accepts display name, place, latitude/longitude, role or intent, selected themes, optional public note, raw note, and private email.
- Writes email only to the private contact table.
- Returns a public-safe pending response suitable for local optimistic rendering.

`GET /map-nodes/public`

- Returns only rows from `public_map_nodes`.
- Must not include pending, rejected, archived, email, raw note, review note, IP, user agent, rate-limit key, or spam metadata.

Admin review endpoints

- Stay behind the chosen CMS/admin layer.
- Must be able to approve, reject, archive, and annotate submissions without exposing private fields to public consumers.

Operational content publishing

- Standard stewards draft or update scoped `content` records through Directus.
- Trusted publishers/operators approve records by setting `publication_status='published'`.
- Only published rows enter `content.public_*` views and `/content/public-snapshot`.
- `bun run directus:content:setup` applies the Directus roles, policies, and field permissions that keep Steward Editor users away from publish/review fields.
- Directus Flows may notify or trigger rebuilds, but public projection logic stays in SQL, `@greenpill-network/shared/public-content`, and the agent route.

## Local Optimistic UX

- After a successful submission, the browser stores only a public-safe pending node in `localStorage` under `greenpill.pendingMapNodes.v1`.
- The map listens for `greenpill:pending-map-node` so a future form can refresh the local pending marker immediately after saving.
- The visitor sees their own pending node immediately.
- Other visitors do not see it until a steward approves it and it enters the public projection.
- Local pending storage must not contain email, raw note, IP, spam metadata, or review notes.

## CMS/Admin Decision

Directus is the authenticated operational content and moderation surface. Do not
couple the Greenpill schema to Directus internals: keep Postgres migrations,
published views, and approved-only projections as the durable source of truth.
Payload, NocoDB, Baserow, and Strapi are no longer first-pass candidates for
this repo lane unless Directus fails a concrete operational requirement.
