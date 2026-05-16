# Greenpill Research Pack

This folder is a first-pass research and strategy pack for a Greenpill website refresh.

Research date: March 9, 2026

Current adopted default:

- The canonical V2 architecture decision now lives in `docs/v2`.
- Older references in this research pack to a public `/workspace` route are exploratory and no longer the active default.
- The active stack direction is `Vercel + Fly` with `app.greenpill.network` as the workspace entrypoint.

What is in here:

- `greenpill-current-state.md`
  - Public-source snapshot of what Greenpill looks like now.
- `greenpill-website-direction.md`
  - Audience, narrative, and information architecture directions for the next website.
- `greenpill-charmverse-transition.md`
  - Charmverse replacement strategy, feature priorities, tooling recommendations, and phased migration plan.
- `greenpill-ui-ux-audit.md`
  - Design audit, UX strategy, wireframes, component library extensions, migration UX, and prioritized front-end roadmap for the website refresh.
- `greenpill-knowledge-map.md`
  - A working knowledge graph connecting chapters, guilds, products, media, and themes.
- `greenpill-graph-schema.md`
  - Schema notes for the structured graph dataset.
- `greenpill-podcast-deep-dive.md`
  - Podcast-specific research pass and graph modeling notes.
- `greenpill-podcast-network-overlap.md`
  - Deeper overlap analysis for how the podcast maps to chapters, guilds, active people, and the shared operating stack.
- `greenpill-sources.md`
  - Source list with links and short notes on why each source matters.

Structured graph data:

- `data/greenpill-graph/greenpill-network.graph.json`
  - Canonical graph dataset with nodes, structural relationships, capital flows, and source provenance.
- `data/greenpill-graph/greenpill-network-expanded.graph.json`
  - Expanded graph dataset that merges the main network graph with the podcast layer.
- `data/greenpill-graph/podcast/greenpill-podcast.graph.json`
  - Podcast overlay with episodes, guests, external entities, and podcast-specific capital flows.
- `data/greenpill-graph/podcast/greenpill-podcast-network-overlap.graph.json`
  - Focused overlap graph for direct overlap, active people, and shared stack connections between the podcast and the live network.

How to use this:

1. Read `greenpill-current-state.md` to align on what Greenpill has become.
2. Use `greenpill-website-direction.md` to structure steward discussion.
3. Read `greenpill-charmverse-transition.md` for the historical transition analysis, then use `docs/v2` for the current adopted architecture.
4. Use `greenpill-knowledge-map.md` as the visual conversation piece.
5. Use `greenpill-podcast-deep-dive.md` to understand how the podcast expands the graph.
6. Use `greenpill-podcast-network-overlap.md` when discussing whether the podcast reflects today's chapters, guilds, and active operators.
7. Keep `greenpill-sources.md` open for follow-up verification and deeper digging.

Important framing:

- This pack separates `confirmed public signals` from `strategy/proposal signals`.
- Greenpill's current public footprint spans live programs, ongoing experiments, and network-design proposals.
- Some of the most interesting directions are real but still emerging, so they should be presented as `in motion`, not as fully settled.
