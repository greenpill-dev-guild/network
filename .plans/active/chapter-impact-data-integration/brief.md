# Chapter Impact Data Integration

**Stage**: `backlog`

## Why This Exists

Chapter pages should show public evidence of local activity without turning stories into automatic feeds or putting operational data into Keystatic. KarmaGAP and Green Goods can provide public impact evidence, but the website needs a stable source-binding and cache contract before the agent and UI are expanded.

## Desired Outcome

Each chapter can opt into a public impact feed by mapping curated source IDs in Keystatic. A server-side cache reads those bindings, fetches KarmaGAP and Green Goods public data, normalizes it into a privacy-safe payload, and serves chapter pages through `agent.greenpill.network`.

## Non-Goals

- Do not make stories automatic activity feeds; stories remain curated articles and blog posts.
- Do not expose private node-intake fields, emails, raw notes, raw EAS feedback, or work media.
- Do not use the Karma SDK in public browsing; reserve it for future steward/admin write flows.
