# Content Private Node Scaffold

**Stage**: `active`

## Why This Exists

Greenpill V2 now needs a clean split between public website content and private map/member intake. The public site should remain Astro + Keystatic, while visitor-submitted nodes, emails, moderation state, spam metadata, and steward review need a private Postgres-backed data plane.

This hub tracks the contracts-first scaffold and the remaining CMS/admin decision work so it does not get buried inside general V2 docs or the steward narrative decision pack.

## Desired Outcome

- Keystatic can model richer public content without private fields.
- Chapter map data comes from chapter content, not a duplicate public JSON file.
- Private node intake has a Postgres schema, public projection contract, agent route contract, and privacy tests.
- The team has a clear comparison of Directus, Payload, NocoDB, Baserow, and Strapi before choosing the private admin layer.

## Non-Goals

- Do not deploy the private CMS/admin layer in this hub.
- Do not add workspace auth or member login to the public site.
- Do not implement full map submission UI beyond local pending-node contracts.
- Do not move public content out of Keystatic.
