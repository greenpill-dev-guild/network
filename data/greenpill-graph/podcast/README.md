# GreenPill Podcast Graph Data

Files in this folder:

- [greenpill-podcast-feed.json](greenpill-podcast-feed.json)
  - normalized feed catalog with episode metadata and base themes
- [greenpill-podcast-theme-summary.json](greenpill-podcast-theme-summary.json)
  - theme and series summary derived from the feed catalog
- [greenpill-podcast.graph.json](greenpill-podcast.graph.json)
  - graph overlay with series, episodes, guests, curated entities, and podcast-specific capital flows
- [greenpill-podcast-entity-index.json](greenpill-podcast-entity-index.json)
  - flattened guest/entity index for quick filtering, legend building, and analysis
- [greenpill-podcast-network-overlap.graph.json](greenpill-podcast-network-overlap.graph.json)
  - focused overlap graph showing how the podcast maps to Greenpill chapters, guilds, active people, and the shared operating stack

Generator:

- [build_greenpill_podcast_graph.py](../../../scripts/build_greenpill_podcast_graph.py)
- [build_greenpill_podcast_network_overlap.py](../../../scripts/build_greenpill_podcast_network_overlap.py)

Notes:

- the overlay graph is designed to be merged with the main network graph through shared node ids such as `greenpill-network` and `greenpill-podcast`
- guest extraction is heuristic
- external entity extraction is curated on purpose to keep the graph readable
- the overlap graph is smaller and more interpretive: it separates direct internal overlap from indirect overlap through tools, themes, and public operating infrastructure
