# qa-guilds handoff

Session `qa-guilds`, Linear PRD-1411, findings 13 to 16. The template PR is open (not merged). The Directus change set is proposed and waits for Afo's approval; nothing has been written to production.

## Changed

PR: https://github.com/greenpill-dev-guild/network/pull/36 (not merged).

Template, `packages/website/src/pages/guilds/[slug].astro` (both guild pages):

- **Breadcrumb**: "← Library / Dev Guild", linking to `/library#guilds` (was "← Garden / Guild / Dev Guild"). The header now marks Library as the current section, so breadcrumb and nav agree (September audit F4).
- **Hero**: overline "Guild · Active · Founded 2023" (the founded segment drops when the year is empty), the one-liner, up to three theme chips with theme names instead of slugs, and a **key-links row** of pills from the guild's `links` (mono glyph plus label; wraps at 375). The two hero buttons and the repeated summary are gone.
- **Mandate**: paragraphs at 18px, capped at 65ch, next to numbered principles.
- **Published by the guild**: `outputs` render as cards with kind and date, summary, a contributor credit line (`contributors`), and a link that names its destination ("Read the PDF", "carboncopy.news").
- **Projects**: active projects only (`status` = `active`), highest featured weight first, with tech stack and links named by destination ("GitHub", "greengoods.app"). No `href="#"` cards.
- **Media and appearances** replaces "Public proof". It reads `media.appearances` (`kind`, `source`, `title`, `href`, `date`, `people`): the first item is a lead card ("Listen on Libsyn"), the rest are rows. Renders only when there is at least one item.
- **Hats**: a grouped list from the guild's `stewards` field (`group`, `role`, `name` or `holders`, optional `href`); "Open hat" when nobody holds a role. Renders only when data exists.
- **People**: `publicMembers` as an initials-avatar grid with name and role, 4 / 3 / 2 columns at 1440 / 1024 / 375 (the DESIGN.md guild row). Bios are no longer shown.
- **Body text**: every reading paragraph uses the `--gp-body-lg` token (18px), as the July call asked.
- Dates print as words ("Jan 2026"), never raw. No em dashes. No hand-set `target` or `rel` attributes (the old output and proof cards had them; the site-wide rule is `qa-brand-shell`'s).
- The call-to-action band uses `color-mix()` from tokens instead of raw rgba and a gradient, so the six `scripts/data/ui-source-baseline.tsv` rows for this file were pruned (guild rows only).

Hub files: this handoff, `artifacts/qa-guilds-change-set.json`, and four preview screenshots in `artifacts/qa-guilds/`.

Not changed: the guild seed files under `src/data/operational-content-seed/guilds/`. They follow the change set once Afo approves it.

## Evidence

- `bun run ui:check`: 0 hard, 0 warn.
- `bun run build:website`: 47 pages built. `astro check`: 0 errors, 0 warnings, 5 hints (none in this file).
- `bun run ui:verify`: **blocked**. Bun runs inside the network dev machine, which has no Chrome or Chromium, and CI does not run `ui:verify`. Its layout checks were run by hand in Brave instead.
- Brave QA (Claude in Chrome, Afo's profile) against my dev server on port 3324. Brave's window ignores resizing on this laptop (1014px viewport), so each width ran in a same-origin iframe of exactly 375, 1024 and 1440px, as `qa-home-garden` and `qa-map-data` did. Both guild pages were checked with today's production content and with the change set applied to a local copy of the snapshot (never committed):
  - No horizontal overflow, no wrapped pills or arrow links, at every width on both pages.
  - Contributors 2 / 3 / 4 columns, published work 1 / 2 / 2, projects 1 / 2 / 3, media lead card above its rows below 980px.
  - Touch targets at 375: no control under 44px in both dimensions. The key-link pills are 36px tall on a desktop pointer (warn); the `Chip` primitive raises them to 44px under `pointer: coarse`, and a one-letter label keeps the pill at least 44px wide.
  - Heading outline: one h1, an h2 per section, h3 per card or group.
- Production values: the guild and project rows in `https://agent.greenpill.network/content/public-snapshot` (generatedAt 2026-11-06T23:42:53Z) match the committed fallback snapshot field for field (SHA-256 per field), so "current" in the change set is the production value.

## Sources

Checked in Brave by this session unless marked "(agent)", which means a research subagent of this session opened it with WebFetch or `gh`.

Writers Guild:

- Self-description, mission, newsletter, books, translation work, Carbon Copy plans, X and Charmverse links: https://www.karmahq.org/project/greenpill-writers-guild/about
- Karma activity, created 2025-04-02: "Produce the Greenpill Network Newsletter", "Co-Authored Onchain Capital Allocation Handbook: Explorers Edition" (about half the team; project management, research, writing, editing, diagrams), "Authored On-Chain Impact Networks" (about 14 people): https://www.karmahq.org/project/greenpill-writers-guild
- X `@GreenpillWrites` ("Curating and creating educational content...", joined November 2024): https://x.com/GreenpillWrites
- Guild Hub thread, December 2024 ("The Writers Guild will be restarting the Greenpill Network newsletter"; "our late friend Izzy who helped lead the Writers Guild"; "We made a twitter account and Charmverse"): https://hub.regencoordination.xyz/t/greenpill-writers-guild/159
- Earliest dated mention, 2024-05-15 ("join our writer's guild within our Discord"): https://hub.regencoordination.xyz/t/welcome-to-greenpill-network/5
- Newsletter publication "Greenpill Network" with issues "Greenpill 2024: A Year in Review" (2024-12-31) and "Greenpill Q1 2025: Laying The Groundwork" (2025-04-30): https://paragraph.com/@greenpill. Author tags Sarah Smith, Matt, Afo; the guild's GG23 application calls the Year in Review "our latest newsletter"; the Karma API dates the guild's newsletter work from 2023-10-17 (agent).
- On-Chain Impact Networks, "A GreenPill Network Writer's Guild Publication", "written, published, and designed by the GreenPill Networks writer's guild", second version of Impact DAOs (April 2022). Credits: editor Riley Blackwell; writers and researchers Sarah Smith, Kate Goheen, Ifeanyi Princewill, Lana Dingwall, Trinity Morphy, Matt Strachman, Anthony Amio, Eunice Eyo, Rayne Leach, Cauê Tomaz; designers Anthony Luong, Ashna Srivastava, Sarah Smith; project leads Lana Dingwall, Izzy Lawernce-Onwuzurike (as printed). PDF created 2024-08-05: https://greenpill.network/pdf/onchain-impact-networks.pdf (read from the repo copy, same file)
- Onchain Capital Allocation Handbook, Explorers Edition: author Kevin Owocki; editors Feems, Mathilda DV, Riley Blackwell; writers Sarah Smith (lead writer), Matt Strachman, Trinity Morphy, Feems; researchers Sejal Rekhan, Izzy Lawrence, Ornella Vallana, Matt Strachman; design Anya Biarozka. PDF created 2025-06-16: https://greenpill.network/pdf/onchain-capital-allocation-v2.pdf. Guild credits on this book are the people also credited in the guild's own book (Sarah Smith, Matt Strachman, Trinity Morphy, Riley Blackwell, Izzy Lawrence); that is an inference for Afo to confirm. The guild's Hub thread confirms the book was "collaboratively written by members of the Guild along with other public greats".
- Web3 Tooling Series, "a joint initiative by CARBON Copy and Greenpill Network Writers Guild", from interviews, surveys and case studies: https://carboncopy.news/content/web3-tooling-series. Parts bylined "Greenpill Writers Guild": The Data (2026-01-26) https://carboncopy.news/content/web3-tooling-series/the-data, The Experience (2026-02-02) https://carboncopy.news/content/web3-tooling-series/the-experience, The Recommendation (2026-02-09) https://carboncopy.news/content/web3-tooling-series/the-recommendation
- Matt: "Matt Strachman - Steward of the Greenpill Network, NYC Chapter and Writers Guild. Greenpill Dev Guild Lead and treasury manager." (2025-11-12): https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363. "Matt (Matty Compost)" on the Greenpill podcast (2026-11-05). July's "Sarah" and "Matty" are Sarah Smith and Matt Strachman.
- Not the guild's: the Greenpill Podcast, announced by Kevin Owocki on 2022-02-16 "through the Bankless network": https://sites.libsyn.com/400481/announcing-the-green-pill-podcast-kevin-owocki
- Not attributed: no translation PDF on the site credits the guild. Greenpill book translations date from 2022 and 2023, before the guild's earliest dated work. The 2024 Year in Review says the guild "joined forces with Greenpill Japan to translate Mycofi into Japanese", but Greenpill Japan's post credits translators Hiromi and marmelo (agent). The page therefore says the guild does translation work but lists no translation as its own.
- Unpublished draft: https://paragraph.com/@greenpill/preview/rN8MvIeOa4RGvE8kJN9L ("The Road Ahead: Governance, Gardens, and the 2026 Vision", shows "EDITORIAL NOTE: Cover image placeholder"). The current Writers Guild record links it; the change set removes it.

Dev Guild:

- Self-description ("Since October 2023 ... weekly meetings ... workshops ... grant rounds with Grant Ships, Gitcoin, and the Allo Alliance") and links (X, GitHub, Discord, LinkedIn): https://www.karmahq.org/project/greenpill-dev-guild and /about. Latest Karma activity 2026 (Green Goods v2 milestones).
- GitHub organization (description "We're a collective of regen developers building tools for Greenpill chapters and regen communities.", `twitter_username: greenpilldevs`): https://github.com/greenpill-dev-guild. X `@greenpilldevs` is also linked from the March 2026 PGSP post and the guild's Linktree (agent).
- LinkedIn company page "Greenpill Dev Guild": https://www.linkedin.com/company/greenpilldevguild
- Green Goods app: https://greengoods.app (redirects to www.greengoods.app, title "Green Goods")
- `luma.com/greenpilldevguild` redirects to the Green Goods calendar ("Join community calls, demos, and workshops"; next event "A Year of Growth - Green Goods", 2026-12-11): https://luma.com/greengoods. Last Builder Space #24 on 2026-06-26; no Builder Space has a recording link (agent, Luma API).
- Media: "Greenpill IRL: Building a Coordi-Nation with Kevin Owocki, Matt & Afolabi" (2026-11-05; "Afolabi walks through Green Goods"; timestamp 35:35 "Green Goods: origins and evolution"): https://128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com/greenpill-irl-building-a-coordi-nation-with-kevin-owocki-matt-afo
- Media: "The Public Goods Staking Protocol v0", by Afo, Matt and Trinity Morphy, 2026-03-23: https://paragraph.com/@greenpilldevguild/the-public-goods-staking-protocol-v0
- Media: "Trailblazers of Octant Episode 4 - Greenpill Dev Guild" (2024-12-28; "Afo, Coi, and Matt from the Greenpill Dev Guild"): https://www.cryptoaltruists.com/blog/trailblazers-of-octant-episode-4-greenpill-dev-guild-scaling-the-regen-movement-with-web3-coordination-tools
- Media: "Greenpill Hypercerts Workshop Highlights" (Greenpill Network YouTube channel), linked from the Dev Guild 2024 recap: https://www.youtube.com/watch?v=5zf9ynSXppE
- Media: the Q1 2025 newsletter says the Dev Guild "launched the first of many workshop videos and shorts on YouTube" and links the channel's playlists: https://paragraph.com/@greenpill/q1-2025-laying-the-groundwork, https://www.youtube.com/@GreenpillNet/playlists
- Dev Guild 2024 recap, 2024-12-17 ("Initiated integration of Hats Protocol on Optimism"; signed "Afo - Greenpill Dev Guild Steward"): https://hub.regencoordination.xyz/t/greenpill-dev-guild-2024-recap/162
- Roles, 2025-11-12: Afolabi Aiyeloja "Core Steward of the Greenpill Network and Dev Guild"; Caue Tomaz "Lead at the Dev Guild"; Matt Strachman "Greenpill Dev Guild Lead and treasury manager": https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363
- Protocol leads, 2025-11-13 ("Leads: Afolabi Aiyeloja, Matt Strachman, Trinity Murphy" for the staking protocol; "Leads: Afolabi Aiyeloja, Wasabi, Irthu" for the impact framework): https://hub.regencoordination.xyz/t/regen-protocols/364
- Team, 2024-08-22: Afo steward, Coi business development lead, Marcin product lead, Matt community lead, Leo community lead (social media), Marcus and Nansel designers, BitBeckers, Tarun, Athus and Steve engineers: https://discuss.octant.app/t/greenpill-dev-guild-regeneration-through-collaboration/456
- Guild.xyz: 34 members, 13 role names created 2025-09-17, no public holders: https://api.guild.xyz/v2/guilds/greenpill-dev-guild (agent)
- GreenWill in 2026 ("GreenWill, the badge and recognition layer we're designing for Green Goods", 2026-04-06): https://hub.regencoordination.xyz/t/growing-the-greenpill-impact-framework/411
- Grant Ships, "the innovative 'evolutionary grants game' in development by the DAO Masons", dev log 2023-12-20 to 2024-08-13, topic archived: https://forum.arbitrum.foundation/t/grant-ships-weekly-dev-log/20191
- Cookie Jar: `cookies.greenpill.app` (repository homepage) does not load; `cookies.greengoods.app` is one jar ("Green Goods Stipend Jar"), so the card keeps only its GitHub link.

Project activity judgement (GitHub API and the sources above, read 2026-11-06):

| Project | Evidence | Judgement |
| --- | --- | --- |
| Green Goods | repo pushed 2026-11-06; release v2.0.1 on 2026-10-15 | active |
| Greenpill Network website | `network` repo pushed 2026-11-04 | active |
| Cookie Jar | repo pushed 2026-10-10 | active |
| Public Goods Staking Protocol | Paragraph post 2026-03-23; Builder Space #23 "1st Cohort" 2026-05-29 (agent) | active |
| Greenpill Impact Framework | Hub thread 2026-03-25 and 2026-04-06; Builder Space #21 2026-03-27 (agent) | active |
| GreenWill | repo archived 2025-01-23, but redesigned in 2026 as Green Goods' badge layer (Hub 2026-04-06) | active, with new summary and links |
| Grant Ships | DAO Masons project; dev log ends 2024-08-13; last guild mention 2024-12 | inactive |
| Impact Reef | repo archived, last push 2026-05-27; no 2025-2026 activity found (agent) | archived |
| Greenpill Podcast | not a guild project | row archived |

## Production change set

**Not approved; nothing has been applied.** Exact values for every row, including each full current value, are in [`artifacts/qa-guilds-change-set.json`](../artifacts/qa-guilds-change-set.json) (40 field changes). Rows marked * wait for a specific confirmation from Afo, listed under "Decisions needed". When approved: apply in Directus (or through the admin API with `DIRECTUS_ADMIN_TOKEN`), let the hourly build pick it up, then update `src/data/operational-content-seed/guilds/*` to match (this session), and ask `qa-system-pass` to update the project seed files and refresh the fallback snapshot.

Preview screenshots of the proposed content (Brave, local dev server with the change set applied to a copy of the snapshot): `artifacts/qa-guilds/dev-guild-1440-hero-proposed.jpg`, `dev-guild-1440-media-hats-proposed.jpg`, `dev-guild-375-media-proposed.jpg`, `dev-guild-375-hats-hero-proposed.jpg`.

| # | Record | Field | Current | Proposed | Source |
| --- | --- | --- | --- | --- | --- |
| 1 | guilds/dev-guild | `links` | 3: GitHub; Dev Guild Paragraph; Octant proposal | 5: GitHub; Karma GAP; Green Goods; @greenpilldevs; Calls and workshops | [github.com](https://github.com/greenpill-dev-guild)<br>[www.karmahq.org](https://www.karmahq.org/project/greenpill-dev-guild)<br>[greengoods.app](https://greengoods.app)<br>[luma.com](https://luma.com/greengoods)<br>docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 2 | guilds/dev-guild | `connect_links` * | 3: GitHub; Dev Guild Paragraph; Builder spaces | 4: GitHub; Dev Guild Paragraph; Calls and workshops; LinkedIn | [luma.com](https://luma.com/greengoods)<br>[www.karmahq.org](https://www.karmahq.org/project/greenpill-dev-guild)<br>[www.linkedin.com](https://www.linkedin.com/company/greenpilldevguild) |
| 3 | guilds/dev-guild | `summary` | The engineering arm of Greenpill Network, building open-source coordination tools for chapters, funders, and regenerative communities. | A collective of regen developers building open-source tools for Greenpill chapters and regen communities. | [github.com](https://github.com/greenpill-dev-guild) |
| 4 | guilds/dev-guild | `mandate_paragraphs` | 3: The Dev Guild is the engineering arm of Greenpill Network. It designs and ships open-source software that helps chapters and allied communities co… | 1: The Dev Guild is a community of builders making open-source tools, guides and workshops for Greenpill chapters and regen communities, focused on i… | [www.karmahq.org](https://www.karmahq.org/project/greenpill-dev-guild/about)<br>[github.com](https://github.com/greenpill-dev-guild) |
| 5 | guilds/dev-guild | `description` | The Dev Guild ships public tooling for impact measurement, capital allocation, community governance, reputation, and public network surfaces. Public … | A community of builders making open-source tools, guides and workshops for Greenpill chapters and regen communities. | [www.karmahq.org](https://www.karmahq.org/project/greenpill-dev-guild/about) |
| 6 | guilds/dev-guild | `cadence` | format: Builder spaces and public async work, summary: Public sources confirm recurring builde… | format: Builder spaces and public async work | (internal note removed) |
| 7 | guilds/dev-guild | `outputs` | 5: Impact verification; Capital allocation; Reputation primitives; Public goods staking; Public writing | `[]` | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 8 | guilds/dev-guild | `proof_signals` | 3: Octant Community Fund grant; Octant proposal; Regenerative stack | `[]` | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 9 | guilds/dev-guild | `media` | image fields unchanged; no appearances | image fields unchanged; appearances 5: Greenpill IRL: Building a Coordi-Nation with Kevin Owocki, Matt & Afolabi; The Public Goods Staking Protocol v… | [128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com](https://128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com/greenpill-irl-building-a-coordi-nation-with-kevin-owocki-matt-afo)<br>[paragraph.com](https://paragraph.com/@greenpilldevguild/the-public-goods-staking-protocol-v0)<br>[www.cryptoaltruists.com](https://www.cryptoaltruists.com/blog/trailblazers-of-octant-episode-4-greenpill-dev-guild-scaling-the-regen-movement-with-web3-coordination-tools)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-dev-guild-2024-recap/162)<br>[paragraph.com](https://paragraph.com/@greenpill/q1-2025-laying-the-groundwork) |
| 10 | guilds/dev-guild | `stewards` * | `[]` | 5: Afolabi Aiyeloja; Caue Tomaz; Matt Strachman; Public Goods Staking; Greenpill Impact Framework | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/regen-protocols/364)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-dev-guild-2024-recap/162) |
| 11 | guilds/dev-guild | `public_members` * | 2: Afo (Afolabi Aiyeloja); Matt (mattycompost) | 12: Afolabi Aiyeloja; Caue Tomaz; Matt Strachman; Trinity Morphy; Marcin; Leo; Marcus; Nansel; BitBeckers; Tarun; Athus; Steve | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/regen-protocols/364)<br>[paragraph.com](https://paragraph.com/@greenpilldevguild/the-public-goods-staking-protocol-v0)<br>[discuss.octant.app](https://discuss.octant.app/t/greenpill-dev-guild-regeneration-through-collaboration/456) |
| 12 | guilds/writers-guild | `links` | 2: Greenpill Paragraph; Greenpill Podcast | 4: Newsletter; @GreenpillWrites; Regen Hub; Karma GAP | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-writers-guild/159)<br>[x.com](https://x.com/GreenpillWrites)<br>[www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild)<br>[paragraph.com](https://paragraph.com/@greenpill)<br>docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 13 | guilds/writers-guild | `connect_links` | 2: Greenpill Paragraph; Greenpill Podcast | 3: Greenpill Network newsletter; X; Regen Hub | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-writers-guild/159)<br>[x.com](https://x.com/GreenpillWrites)<br>[paragraph.com](https://paragraph.com/@greenpill) |
| 14 | guilds/writers-guild | `proof_signals` | 3: Greenpill Paragraph; Podcast archive; Carbon Copy collaboration | `[]` | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 15 | guilds/writers-guild | `outputs` | 4: Field reports; Translations; Publication surfaces; Tooling research | 4: On-Chain Impact Networks; Onchain Capital Allocation Handbook: Explorers Edition; Greenpill Network newsletter; Web3 Tooling Series | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about)<br>[www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild)<br>[greenpill.network](https://greenpill.network/pdf/onchain-impact-networks.pdf)<br>[greenpill.network](https://greenpill.network/pdf/onchain-capital-allocation-v2.pdf)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-writers-guild/159)<br>[paragraph.com](https://paragraph.com/@greenpill)<br>[carboncopy.news](https://carboncopy.news/content/web3-tooling-series) |
| 16 | guilds/writers-guild | `public_members` * | `[]` | 14: Sarah Smith; Matt Strachman; Riley Blackwell; Lana Dingwall; Izzy Lawrence; Trinity Morphy; Anthony Amio; Anthony Luong; Ashna Srivastava; Cauê T… | [greenpill.network](https://greenpill.network/pdf/onchain-impact-networks.pdf)<br>[greenpill.network](https://greenpill.network/pdf/onchain-capital-allocation-v2.pdf)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-writers-guild/159) |
| 17 | guilds/writers-guild | `mandate_paragraphs` | 3: The Writers Guild makes the network legible. It turns local experiments, chapter practice, books, podcasts, and builder work into public stories p… | 1: The Writers Guild is an open collective of researchers, writers, editors, translators and designers. It makes books, newsletters, articles and doc… | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 18 | guilds/writers-guild | `principles` | 3: Source-backed storytelling; Field-first writing; No private drafts in public content | `[]` | (internal note removed) |
| 19 | guilds/writers-guild | `summary` | Publishing, storytelling, research, and public sensemaking across the Greenpill network. | Books, newsletters and research from an open collective of writers, editors, translators and designers. | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 20 | guilds/writers-guild | `oneliner` | Stories, translations, field reports, and public knowledge work for the network. | Books, newsletters, research and translations from the network's writers. | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 21 | guilds/writers-guild | `description` | The Writers Guild supports essays, field reports, translations, publishing workflows, and editorial work across chapters and guilds. Public sources s… | An open collective of researchers, writers, editors, translators and designers producing books, newsletters, articles and documentation about the reg… | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 22 | guilds/writers-guild | `founded_year` * | 2024 | (none) | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/welcome-to-greenpill-network/5)<br>[greenpill.network](https://greenpill.network/pdf/onchain-impact-networks.pdf) |
| 23 | guilds/writers-guild | `cadence` | format: Editorial working group, summary: Public sources confirm Writers Guild ac… | format: Editorial working group | (internal note removed) |
| 24 | guilds/writers-guild | `seo` | title: Writers Guild · Greenpill Network, noindex: false, ogImage: /images/guilds/writers-guild-greenpill-…, description: The Greenpill Writers Guild… | title: Writers Guild · Greenpill Network, noindex: false, ogImage: /images/guilds/writers-guild-greenpill-…, description: The Greenpill Writers Guild… | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 25 | projects/greenpill-podcast | `publication_status` | published | archived | [sites.libsyn.com](https://sites.libsyn.com/400481/announcing-the-green-pill-podcast-kevin-owocki)<br>[www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 26 | projects/greenwill | `summary` | Public-good reputation and pay-it-forward activity tooling. | The badge and recognition layer the guild is designing for Green Goods. | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/growing-the-greenpill-impact-framework/411) |
| 27 | projects/greenwill | `description` | GreenWill is described in the research source inventory as an open Farcaster mini-app for accumulating Greenpill and ReFi reputation from pay-it-forw… | GreenWill began as a mini-app for Greenpill and ReFi reputation. In 2026 the guild is redesigning it as the badge and recognition layer for Green Goo… | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/growing-the-greenpill-impact-framework/411)<br>[github.com](https://github.com/greenpill-dev-guild/greenwill) |
| 28 | projects/greenwill | `repo_url` | https://github.com/greenpill-dev-guild/greenwill | "" | [github.com](https://github.com/greenpill-dev-guild/greenwill) |
| 29 | projects/greenwill | `live_url` | "" | https://hub.regencoordination.xyz/t/growing-the-greenpill-impact-framework/411 | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/growing-the-greenpill-impact-framework/411) |
| 30 | projects/greenwill | `tech_stack` | 3: Farcaster; Reputation; Public goods | 3: Badges; Reputation; Green Goods | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/growing-the-greenpill-impact-framework/411) |
| 31 | projects/impact-reef | `entity_status` | experimental | archived | [github.com](https://github.com/greenpill-dev-guild/impact-reef) |
| 32 | projects/grant-ships | `entity_status` | active | inactive | [forum.arbitrum.foundation](https://forum.arbitrum.foundation/t/grant-ships-weekly-dev-log/20191)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-dev-guild-2024-recap/162) |
| 33 | projects/green-goods | `live_url` | https://docs.greengoods.app/community/why-we-build | https://greengoods.app | [github.com](https://github.com/greenpill-dev-guild/green-goods)<br>[greengoods.app](https://greengoods.app) |
| 34 | projects/public-goods-staking-protocol | `description` | The Public Goods Staking Protocol is a Greenpill Dev Guild workstream sourced from the Dev Guild Paragraph series. Public sources describe a path whe… | The Public Goods Staking Protocol coordinates validator squads to create long-term funding for public goods, drawing on validator infrastructure, Dap… | [paragraph.com](https://paragraph.com/@greenpilldevguild/the-public-goods-staking-protocol-v0) |
| 35 | projects/greenpill-impact-framework | `description` | The public companion thread frames the Greenpill Impact Framework as a way to connect Green Goods v1, impact, strategy, measurement, coordination, an… | A framework connecting Green Goods with impact strategy, measurement, coordination and capital formation. Work in 2026 starts with GreenWill badges i… | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/growing-the-greenpill-impact-framework/411) |
| 36 | projects/greenpill-v2-website | `name` | Greenpill Network V2 Website | Greenpill Network website | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 37 | projects/greenpill-v2-website | `summary` | Public front-door rebuild for chapters, Library, Stories, Guilds, Garden, map, and impact surfaces. | Public front door for chapters, Library, Stories, Guilds, and the map. | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 38 | projects/greenpill-v2-website | `repo_url` | https://github.com/greenpill-dev-guild | https://github.com/greenpill-dev-guild/network | [github.com](https://github.com/greenpill-dev-guild/network) |
| 39 | projects/greenpill-v2-website | `live_url` | https://hub.regencoordination.xyz/t/greenpill-network-website-revamp/414 | https://greenpill.network | [greenpill.network](https://greenpill.network) |
| 40 | projects/greenpill-v2-website | `tech_stack` | 4: Astro; Keystatic; Public agent routes; Source-backed content | 3: Astro; Directus; Hono | [github.com](https://github.com/greenpill-dev-guild/network) |

Notes on specific rows:

- **Hats (`stewards`)**: no public Hats tree ID exists. The Dev Guild's 2024 recap says Hats integration was "initiated" on Optimism, and the guild's `.github` routines doc says "The guild-level Hats tree lives on Optimism", but neither gives the tree. The draft list uses the roles people state publicly: Afolabi Aiyeloja "Core Steward of the Greenpill Network and Dev Guild", Caue Tomaz "Lead at the Dev Guild", Matt Strachman "Greenpill Dev Guild Lead and treasury manager" (Hub, 2025-11-12), and the protocol leads in "Regen Protocols" (Hub, 2025-11-13). Guild.xyz lists 13 role names (Lead, Engineering Lead, Capital Manager, Partner, Community Contributor, Social Contributor, Biz Dev Lead, Community Lead, Treasury Manager, Contributor, Product Lead, Steward, Member) but no holders. Do not apply this row until Afo confirms it or sends the tree.
- **Dev Guild contributors (`public_members`)**: 12 people. Roles come from the 2025 Hub posts where they exist (Afolabi, Caue, Matt, Trinity), otherwise from the August 2024 Octant proposal (Marcin product lead, Leo social media lead, Marcus and Nansel designers, BitBeckers, Tarun, Athus and Steve engineers). First names are as written in that proposal.
- **Writers Guild contributors**: the 14 people on the credits page of On-Chain Impact Networks. Izzy, who helped lead the guild, has died (Hub, December 2024: "our late friend Izzy who helped lead the Writers Guild"); Afo decides how Izzy is credited. The two books spell the surname differently.
- **GreenWill stays active**: the repository is archived, but in April 2026 Afo described it as "the badge and recognition layer we're designing for Green Goods". The row updates its summary and links instead of hiding it.
- **Greenpill Podcast**: the project row is archived, not deleted, and the podcast stays in the Library. Kevin Owocki announced the show in February 2022 "through the Bankless network"; no guild source claims it.
- **`founded_year` for the Writers Guild**: no source states it. The hero simply drops "Founded" when the field is empty.

## Open items and decisions needed

Decisions for Afo (also asked in the session):

1. Approve the change set, all of it or with edits. Rows marked * need the specific answer below first.
2. LinkedIn and the unmaintained website (input I2): the Dev Guild's Karma profile links `https://www.linkedin.com/company/greenpilldevguild`, which the change set adds to the Dev Guild's Connect links. Which "website" link is no longer maintained? Candidates found: the Writers Guild's Charmverse (`app.charmverse.io/greenpill-writers-guild`, listed as its website on Karma; did not resolve for the research agent), the GreenSci site (`greensci.pages.dev`), or `hub.greenpill.network` in `content/social-links.json`. No network-level Greenpill LinkedIn page was found; `qa-brand-shell` needs that URL for the footer.
3. Dev Guild hats: confirm the draft roles, or send the Optimism Hats tree link.
4. Contributors: confirm both lists (names, current roles, and that people are happy to be listed), how to credit Izzy, and whether you want yourself credited on the newsletter (you appear in its author tags).
5. Writers Guild founding year: keep 2024 only if you can confirm it.
6. Coop (`greenpill-dev-guild/coop`, last push 2026-06-19) is not a project row. Add it to the Dev Guild?

Requests to other sessions (sent as messages too):

- `qa-home-garden`: the home Dev Guild tile prints `{outputs.length} public outputs`; the change set empties Dev Guild outputs, so it would read "0 public outputs". Use a static label.
- `qa-library`: keep `id="guilds"` on the guild cards (the breadcrumb target); `guildFootLabel()` counts `proofSignals` ("N proof sources"), which the change set empties for both guilds; `content/resources/writers-guild-carbon-copy-web3-tooling.json` links an unpublished Paragraph draft (`/preview/rN8MvIeOa4RGvE8kJN9L`, shows "EDITORIAL NOTE: Cover image placeholder"), use `https://carboncopy.news/content/web3-tooling-series`; `resources/greenpill-podcast.json` lists `writers-guild` in `relatedGuildSlugs` (not rendered today).
- `qa-stories`: `stories/greenpill-2026-thesis.json` cites the same draft preview as S071.
- `qa-system-pass`: after the change set is applied, update the project seed files (`src/data/operational-content-seed/projects/*`, not in this session's files) and refresh the fallback snapshot.
- Whoever owns `scripts/directus-studio-setup.ts`: the guild `stewards` field note says "Public steward cards"; it now also drives the Hats list (`group`, `role`, `name` or `holders`, optional `href`), and `media` now holds `appearances` (`kind`, `source`, `title`, `href`, `date`, `people`). Field notes would help stewards.

Other open items:

- `ui:verify` is blocked locally: the dev machine has no Chrome and CI does not run it. Brave QA covered the same checks by hand.
- No embedded YouTube player: July asked for a lead video, but no Builder Space recording exists, and an embed would add third-party requests. The lead card links out instead. Revisit if a recording is published.
- The external-link rule (new tab, `rel`, hint) is `qa-brand-shell`'s; this PR removed the hand-set `target` and `rel` attributes from the guild cards, so until that rule lands those links open in the same tab, like most links on the site today.
- Process note: a dev server started with `NETWORK_WEBSITE_PORT=3324` bound 3301 because the dev-machine shim does not pass environment variables (see the shared notes). It was stopped; pass `--port` to `astro dev` instead.
