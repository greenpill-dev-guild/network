# Private Node Intake Scaffold

This contract keeps `greenpill.network` anonymous and public by default while allowing visitors to add themselves to the map without exposing private contact data.

## Boundary

- `Astro + Keystatic` remains canonical for curated public content: books, translations, chapters, guilds, projects, stories, people/stewards, and themes.
- `Fly Managed Postgres` stores user-submitted map/member nodes, private emails, moderation state, spam metadata, and steward review history.
- The public site reads only approved public projections. It never reads the private intake tables directly.
- The first implementation should keep this CMS-agnostic. The admin layer can be Directus, Payload, NocoDB, Baserow, Strapi, or a later custom workspace surface.

## Public Content Contracts

- `themes` is the shared public taxonomy for books, chapters, projects, stories, people/stewards, and approved submitted nodes.
- `people` stores reusable public steward profiles only: display name, role, avatar, bio, public links, and themes.
- `books` can now carry optional `sections`, `themeSlugs`, `relatedStorySlugs`, and `relatedProjectSlugs` while preserving existing PDFs and translations.
- Chapter map data is generated from the `chapters` collection through `/locations.json`; a checked-in public `locations.json` file is no longer a hand-maintained source of truth.

## Private Intake Data

The SQL contract lives in `docs/v2/private-map-node-schema.sql`.

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

## Local Optimistic UX

- After a successful submission, the browser stores only a public-safe pending node in `localStorage` under `greenpill.pendingMapNodes.v1`.
- The map listens for `greenpill:pending-map-node` so a future form can refresh the local pending marker immediately after saving.
- The visitor sees their own pending node immediately.
- Other visitors do not see it until a steward approves it and it enters the public projection.
- Local pending storage must not contain email, raw note, IP, spam metadata, or review notes.

## CMS/Admin Options

| Option | Strengths | Tradeoffs | Fit |
| --- | --- | --- | --- |
| Directus | SQL/Postgres-first, strong data studio, field/item permissions, flows, good steward review fit | Adds a separate service and Directus-specific config to operate | Leading candidate for first evaluation |
| Payload | Code-first, Postgres adapter, strong custom access control, good app integration | More engineering-heavy for non-engineer admin setup | Best if private intake becomes part of a custom app quickly |
| NocoDB | Familiar spreadsheet-style UI, self-hostable, can connect to SQL data, accessible for teams | Permission depth and workflow shape are less CMS-native | Good lightweight Airtable-style review surface |
| Baserow | Friendly no-code database UI, self-hostable, PostgreSQL-backed state | More separate from app-owned schema/agent route contracts | Good for simple internal tables, weaker as the canonical agent surface |
| Strapi | Mature CMS, Postgres support, admin roles, content APIs | Less aligned because Keystatic remains public CMS; not ideal for an existing external schema | Possible, but not the default direction |

## Decision Default

Evaluate Directus first for the private steward moderation layer, but do not couple the intake schema to Directus. Keep Postgres and the approved-only projection as the durable source of truth.
