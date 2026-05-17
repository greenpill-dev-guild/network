# Greenpill Graph Schema

This schema is designed for browser-based graph explorers first, while staying easy to import into Cytoscape, Graphology, D3, Neo4j, or Gephi.

Canonical dataset:

- [greenpill-network.graph.json](../artifacts/greenpill-graph/greenpill-network.graph.json)

## Design goals

- separate `what exists` from `what flows`
- preserve provenance
- make experimental nodes visible without overstating them
- support multiple visual modes from one file

## Data model

The graph JSON has five main sections:

- `meta`
- `capital_taxonomy`
- `sources`
- `nodes`
- `relationships`
- `capital_flows`

Some analysis-focused graph files may also add:

- `metrics`

Use that only when the graph needs to carry summary counts or overlap scores alongside the renderable node and edge data.

## Node schema

Each node uses this shape:

```json
{
  "id": "greenpill-network",
  "label": "Greenpill Network",
  "node_type": "network",
  "status": "active",
  "source_scope": "public_web",
  "cluster": "core",
  "visual_group": "core",
  "color": "#6EE7B7",
  "importance": 5,
  "description": "Short human-readable note",
  "url": "https://greenpill.network",
  "tags": ["regen", "public-goods"],
  "source_ids": ["src_live_site_2026"],
  "confidence": 0.98
}
```

Recommended node types:

- `network`
- `group`
- `guild`
- `chapter`
- `program`
- `project`
- `publication`
- `media_series`
- `episode`
- `event_series`
- `platform`
- `partner_org`
- `person`
- `resource`
- `topic_pod`
- `audience`

Important modeling rule:

- If a node is directly evidenced in public sources, use `source_scope: public_web`.
- If a node comes from repo files, use `source_scope: repo`.
- If a node comes from workshop artifacts or internal ideation, use `source_scope: workshop_artifact` and reduce confidence.

## Relationship schema

Structural relationships are for directly stated or strongly evidenced connections.

```json
{
  "id": "rel_gp_has_dev_guild",
  "relation": "has_guild",
  "source": "greenpill-network",
  "target": "greenpill-dev-guild",
  "status": "active",
  "source_ids": ["src_hub_onchain_revenue_2025"],
  "confidence": 0.95,
  "notes": "Directly discussed as part of network structure."
}
```

Recommended structural relationship types:

- `has_group`
- `has_guild`
- `has_chapter`
- `has_topic_pod`
- `runs_program`
- `hosts`
- `publishes`
- `offers_pathway`
- `uses_platform`
- `aligned_with`
- `builds`
- `supports`
- `stewards`
- `participates_in`
- `uses_framework`
- `features_guest`
- `references_entity`
- `explores_theme`

## Capital flow schema

Capital flows are directional and may be direct or inferred.

```json
{
  "id": "cap_devguild_to_gp",
  "source": "greenpill-dev-guild",
  "target": "greenpill-network",
  "capital_forms": ["technical", "knowledge", "coordination"],
  "mechanism": "Builder Spaces, open-source tools, tech support",
  "status": "live",
  "evidence_type": "inferred_from_sources",
  "source_ids": ["src_github_dev_guild_2026", "src_hub_greenpill_garden_2025"],
  "confidence": 0.89,
  "notes": "The Dev Guild contributes tools and implementation capacity into the wider network."
}
```

Important modeling rule:

- `relationships` answer: "What is connected to what?"
- `capital_flows` answer: "What value moves between them?"

## Capital taxonomy

This dataset uses a Greenpill-specific capital taxonomy tuned for network analysis.

It is inspired by the broader `8 forms of capital` lens, but adapted for graph use:

- `knowledge`
- `social`
- `technical`
- `financial`
- `reputational`
- `governance`
- `coordination`
- `cultural`
- `ecological`
- `operational`

Why not use only the canonical 8-form labels:

- browser explorers benefit from labels that are immediately legible
- Greenpill’s public materials repeatedly point to technical, governance, and coordination value as distinct flows
- these labels are easier to filter and explain in a steward session

## Confidence guidance

- `0.90 - 1.00`
  - directly evidenced by explicit public source language
- `0.70 - 0.89`
  - strongly implied by multiple public sources
- `0.50 - 0.69`
  - exploratory or workshop-derived

## Suggested explorer views

## 1. Structure view

Render only:

- `nodes`
- `relationships`

Use case:

- explain how Greenpill is organized

## 2. Capital view

Render:

- `nodes`
- `capital_flows`

Use case:

- explain how value moves through the network

## 3. Layered view

Render everything and allow filters by:

- `node_type`
- `cluster`
- `capital_forms`
- `source_scope`
- `status`
- `confidence`

## Rendering hints

- Color nodes by `visual_group`
- Size nodes by `importance`
- Draw solid edges for `relationships`
- Draw curved or glowing edges for `capital_flows`
- Use dashed lines for low-confidence or workshop-derived flows
- Add filter chips for `capital_forms`

## Next-pass opportunities

- add more person-level nodes once steward roles are confirmed
- add chapter-specific initiatives as project nodes
- add timestamps for active periods
- add evidence excerpts for each edge
- improve guest identity resolution for older podcast episodes
- export a second bundle in Cytoscape-native or Graphology-native format
