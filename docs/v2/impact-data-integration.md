# Chapter Impact Data Integration

This contract lets chapter pages show public impact activity from KarmaGAP and Green Goods without turning Keystatic into an operational database.

## Boundary

- Chapter pages are the first impact surface. Stories remain curated editorial posts, not automatic activity feeds.
- Keystatic stores only public-safe source bindings: chapter slug, optional Karma identifiers, optional Green Goods garden address, and an `impactEnabled` flag.
- The public site publishes `/impact-sources.json` so the agent/cache worker can sync source bindings without scraping repo files.
- The Fly agent service owns ingestion, normalization, cache freshness, and `GET /impact/chapters/:slug`.
- The browser must never call Karma write flows or `@show-karma/karma-gap-sdk`. That SDK is reserved for future steward/admin write flows that need wallet signing.

## Public Source Bindings

Chapter content can opt into impact data with:

```json
{
  "impactSources": {
    "impactEnabled": true,
    "greenGoodsGardenAddress": "0x...",
    "greenGoodsChainId": 42161,
    "karmaProjectUID": "",
    "karmaProjectSlug": "",
    "karmaCommunitySlug": ""
  }
}
```

`/impact-sources.json` returns enabled chapter bindings only:

```json
{
  "version": 1,
  "generatedAt": "2026-05-16T18:00:00.000Z",
  "chapters": [
    {
      "chapterSlug": "nigeria",
      "chapterName": "Nigeria",
      "chapterPath": "/chapters/nigeria",
      "sources": {
        "impactEnabled": true,
        "greenGoodsGardenAddress": "0x35722eEdf3F7566A23FA871f0a04267AEe78E0dB",
        "greenGoodsChainId": 42161,
        "karmaProjectUID": "",
        "karmaProjectSlug": "",
        "karmaCommunitySlug": ""
      }
    }
  ]
}
```

The first seeded Green Goods bindings are Brasil, Côte d'Ivoire, Kenya, London Ontario, and Nigeria. Karma project/community bindings stay empty until chapter-specific UIDs or slugs are curated.

## Server Cache Contract

The agent service should run a scheduled sync:

1. Read `https://greenpill.network/impact-sources.json`.
2. For each enabled chapter, fetch public Karma data when `karmaProjectUID`, `karmaProjectSlug`, or `karmaCommunitySlug` is present.
3. Query the Green Goods Envio GraphQL endpoint when `greenGoodsGardenAddress` is present.
4. Normalize into the public payload contract from `packages/shared/src/chapter-impact.js`.
5. Store the latest payload and source status in Fly Managed Postgres.

Suggested cache table:

```sql
create table chapter_impact_snapshots (
  chapter_slug text primary key,
  payload jsonb not null,
  source_status jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  stale_after timestamptz not null default now() + interval '6 hours',
  error_count integer not null default 0,
  last_error text
);
```

`GET https://agent.greenpill.network/impact/chapters/:slug` returns the latest cached payload. If a source is down, the endpoint should return stale cached data when available and mark that source as `unavailable`; it should not block the entire chapter section.

## Source Reads

KarmaGAP public reads:

- `GET https://gapapi.karmahq.xyz/v2/projects/{identifier}`
- `GET https://gapapi.karmahq.xyz/v2/projects/{identifier}/updates`
- `GET https://gapapi.karmahq.xyz/v2/projects/{identifier}/milestones`
- `GET https://gapapi.karmahq.xyz/v2/projects/{identifier}/grants`
- Optional community reads: `/v2/communities/{slug}/impact`, `/v2/impact-segments/{communityUIDOrSlug}`, and indicator endpoints when a community slug or UID is available.

Green Goods public reads:

- Envio garden metadata by garden address.
- Role counts from `gardeners`, `operators`, and `evaluators`.
- Aggregate action, assessment, and hypercert counts.
- `gapProjectUID` when present, but do not depend on it for v1 because current gardens may not have it populated.

## Public Payload Rules

Allowed:

- summary counts
- Karma project, milestones, updates, grants, and public proof links
- Green Goods garden name, location, address, chain, GAP UID when present, role counts, and aggregate activity counts
- source freshness/status

Forbidden:

- emails, private notes, moderation notes, IPs, rate-limit keys, spam metadata, or user agents
- raw EAS `decodedDataJson`
- raw Green Goods work feedback
- raw work media arrays
- pending private map/member submissions

The first chapter-page UI is scaffold-gated by `CHAPTER_IMPACT_UI_ENABLED` in `@greenpill/network-shared/chapter-impact`. Keep that flag false until the agent cache endpoint is deployed; `/impact-sources.json` can still publish source bindings for the worker.

## Validation

- `node --test scripts/chapter-impact-contract.test.mjs`
- `node scripts/plan-hub.mjs validate`
- `bun run build` for Astro schema and generated route validation

## References

- [KarmaGAP developer guide](https://docs.gap.karmahq.xyz/how-to-guides/developers)
- [Karma API docs](https://gapapi.karmahq.xyz/v2/docs/static/index.html)
- [Karma SDK package](https://www.npmjs.com/package/@show-karma/karma-gap-sdk)
- Green Goods indexer bridge: `packages/indexer/src/handlers/garden.ts` in the sibling repo
- Green Goods public data pattern: `packages/shared/src/hooks/public/usePublicGardens.ts` in the sibling repo
