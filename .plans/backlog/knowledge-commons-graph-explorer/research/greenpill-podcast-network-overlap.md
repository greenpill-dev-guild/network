# GreenPill Podcast x Network Overlap

Research date: March 9, 2026

Primary outputs from this pass:

- [podcast overlap graph](../artifacts/greenpill-graph/podcast/greenpill-podcast-network-overlap.graph.json)
- [podcast overlay graph](../artifacts/greenpill-graph/podcast/greenpill-podcast.graph.json)
- [expanded network graph](../artifacts/greenpill-graph/greenpill-network-expanded.graph.json)

Primary public sources:

- [GreenPill podcast RSS feed](https://rss.libsyn.com/shows/400481/destinations/3304589.xml)
- [Network Onboarding Revamp](https://hub.regencoordination.xyz/t/network-onboarding-revamp/87)
- [Bringing Greenpill.network On-Chain & Proving Out Revenue in 2025](https://hub.regencoordination.xyz/t/bringing-greenpill-network-on-chain-proving-out-revenue-in-2025/172)
- [Greenpill Garden - Season One](https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363)
- [Greenpill Dev Guild 2024 Recap](https://hub.regencoordination.xyz/t/greenpill-dev-guild-2024-recap/162)
- [Greenpill 2024: A Year in Review](https://paragraph.com/@greenpill/2024-a-year-in-review)
- [Greenpill Network Community Call - March 2025](https://lu.ma/0v7yjr7x)
- [Greenpill Network Community Call - April 2025](https://lu.ma/a4ryjiuf)
- [Greenpill Network Community Call - June 2025](https://lu.ma/mcov9pim)

## Bottom line

The podcast does **not** map strongly to the current Greenpill network if the test is:

- are active chapters named directly
- are guilds named directly
- does the feed mirror the current org chart

It **does** map strongly if the test is:

- does the podcast feed people into onboarding
- does it reflect the live tool and partner stack
- does it surface the same public-goods, localism, and funding infrastructure that current Greenpill work depends on

The cleanest framing is:

> The podcast is less a mirror of Greenpill's current org chart and more a bridge layer between Greenpill's internal network and the ecosystems, tools, and narratives it actively operates through.

## Quantified overlap

From the current datasets:

- main network graph nodes: `55`
- podcast overlay nodes: `512`
- direct shared node ids: `2`
  - `greenpill-network`
  - `greenpill-podcast`
- shared labels across the two graphs: `7`
- meaningful shared labels beyond the network/podcast roots: `5`
  - `Gitcoin`
  - `Allo Capital`
  - `Gardens`
  - `Karma GAP`
  - `Kevin Owocki`

Direct internal naming inside feed metadata is weak:

- named chapter hits across current chapter roster: `0`
- named guild hits: `0`
- generic `chapter` / `chapters` hits: `7`
- raw `guild` term hits: `4`
  - but these are mostly false positives such as `Protocol Guild`, not Greenpill guild references

Important caveat:

- `239` feed entries contain recurring Greenpill CTA boilerplate such as `Get the GreenPilled Book`, `Subscribe to the Green Pill Podcast`, or `Join a local chapter`
- that boilerplate can make internal overlap look much stronger than it really is
- the overlap graph therefore focuses on `substantive overlap`, not just string matching

## Chapters

Chapter overlap is weak at the direct label level.

No active chapter names like `Greenpill Brasil`, `Greenpill Nigeria`, `Greenpill Toronto`, or `Greenpill Kenya` show up in feed metadata. That means the podcast is not currently functioning as a chapter-reporting layer.

But there is still a real chapter bridge in three ways:

- the [Network Onboarding Revamp](https://hub.regencoordination.xyz/t/network-onboarding-revamp/87) says `Taking The Greenpill` includes the history of the podcast and notable episodes, then moves into `an overview of Chapters and Guilds`
- several recent episodes explicitly tell listeners to `Join a local chapter`, especially the JournoDAO episodes such as [Season 9. Episode 1: Building Community in Times of Transition](https://128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com/season-9-episode-1-building-community-in-times-of-transition) and [Season 9. Episode 4: Knowledge Gardens: Cultivating Digital Resilience](https://128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com/season-9-episode-4-knowledge-gardens-cultivating-digital-resilience)
- the [Ethereum Localism episode](https://128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com/season-8-ep-1-localism-w-macks-josh) lines up with Greenpill's local-organizing logic even when it does not name specific chapters

So the chapter mapping is best described as:

- weak direct representation
- moderate thematic support
- strong onboarding relevance

## Guilds

Guild overlap is also weak at the naming layer.

Neither `Greenpill Dev Guild` nor `Greenpill Writers Guild` appears directly in feed metadata. But the guild overlap becomes much clearer once the podcast is read as infrastructure rather than as org-chart reporting.

The strongest evidence sits around the Dev Guild:

- [Network Onboarding Revamp](https://hub.regencoordination.xyz/t/network-onboarding-revamp/87) says the onboarding effort `started as a Dev Guild project`
- [Greenpill Dev Guild 2024 Recap](https://hub.regencoordination.xyz/t/greenpill-dev-guild-2024-recap/162) shows the guild is working on tools and workshops that overlap heavily with podcast entities and themes: `Hypercerts`, `Karma Gap`, `Allo Yeeter`, `Grant Ships`, `Allo Builders`, and public goods funding

The Writers Guild overlap is more indirect but still real:

- [Greenpill 2024: A Year in Review](https://paragraph.com/@greenpill/2024-a-year-in-review) was assembled by the Writers Guild
- [April 2025 community call](https://lu.ma/a4ryjiuf) shows the Writers Guild publishing books onchain while the podcast continues serving as Greenpill's audio narrative surface
- the JournoDAO arc on the podcast strengthens the media, journalism, and sensemaking adjacency even though it is not the same org as the Writers Guild

So the guild mapping is:

- weak direct naming
- strong Dev Guild stack overlap
- moderate Writers Guild narrative overlap

## Active People

The podcast maps better to active individuals than to chapters or guilds, but the overlap is concentrated in a small internal cohort.

Reliable metadata hits across a curated active-people list:

- `Kevin Owocki`: `10`
- `Sejal`: `5`
- `Lana Dingwall`: `2`
- `Afolabi Aiyeloja / Afo`: `1`
- `Izzy`: `1`
- `Elliot Bayev`: `2`
- `Matt Strachman`: `0`
- `Caue Tomaz`: `0`

The strongest person-level bridge is clearly Kevin.

After that, the biggest overlap is concentrated around one internal cluster:

- [Season 3 - Ep. 10 - Greenpill.Network in 2024](https://128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com/season-3-ep-10-greenpillnetwork-in-2024)
  - `Lana`
  - `Sejal`
  - `Onboarding with Izzy`
  - `Lana pivots to chapters`
  - `Elliott Bayev`
- [GG24: Inside the First Funding Round of Gitcoin 3.0 — Funding What Matters](https://128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com/gg24-inside-the-first-round-of-gitcoin-30-funding-what-matters)
  - includes `Afo`

That creates an important asymmetry:

- the podcast does surface some people who are actively involved in Greenpill
- but it does **not** yet function as a broad reflection of the current steward cohort

## Shared Operating Stack

This is where the mapping becomes strong.

The podcast and the active network repeatedly touch the same stack:

- `Gitcoin`: `32` feed hits
- `Allo Capital`: `10`
- `Ethereum Localism`: `5`
- `Hypercerts`: `5`
- `JournoDAO`: `4`
- `Gardens`: `3`
- `Karma GAP`: `1`
- `Cookie Jar`: `1`

Those same entities also show up in current network operations:

- [On-Chain & Revenue in 2025](https://hub.regencoordination.xyz/t/bringing-greenpill-network-on-chain-proving-out-revenue-in-2025/172) frames Greenpill's public strategy around `Allo.Capital`, `Gitcoin`, and the podcast itself as a revenue and reach surface
- [Greenpill Garden - Season One](https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363) ties active work to `Gardens`, `Karma GAP`, `Gitcoin`, and active stewards including `Afolabi Aiyeloja`, `Matt Strachman`, and `Caue Tomaz`
- [March](https://lu.ma/0v7yjr7x), [April](https://lu.ma/a4ryjiuf), and [June 2025 community calls](https://lu.ma/mcov9pim) keep surfacing the same cluster: `Allo`, `Gardens`, `Gitcoin`, `KarmaGAP`, `Dev Guild`, `Writers Guild`, `chapter demo days`, and `Greenpill Garden`

This is the strongest single conclusion from the research:

The podcast maps to Greenpill today most accurately through its `shared operating stack`, not through direct chapter-by-chapter or guild-by-guild reporting.

## Implications for the Knowledge Graph

For the graph explorer, the podcast should be modeled in two layers:

1. `direct internal overlap`
   - internal people
   - explicit network episodes
   - onboarding connections

2. `indirect but high-signal overlap`
   - Gitcoin
   - Allo Capital
   - Gardens
   - Karma GAP
   - Ethereum Localism
   - JournoDAO
   - Hypercerts

That is why this pass adds the [podcast overlap graph](../artifacts/greenpill-graph/podcast/greenpill-podcast-network-overlap.graph.json).

It gives us a browser-friendly structure for showing:

- what is directly mapped
- what is only thematically aligned
- which active people bridge podcast and network
- which capital flows move through the shared stack

## Recommended framing for stewards

If this is presented tomorrow, the cleanest statement is:

`The podcast is not yet a strong mirror of Greenpill's live chapter and guild structure. It is much stronger as a bridge into Greenpill's tool stack, partners, funding ecosystem, onboarding, and a smaller internal cohort of active people.`
