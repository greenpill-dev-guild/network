# qa-guilds handoff

Session `qa-guilds`, Linear PRD-1411, findings 13 to 16. The template PR is open (not merged). Afo approved the Directus change set on 2026-11-06; it is applied after the PR merges. Nothing has been written to production yet.

## Changed

PR: https://github.com/greenpill-dev-guild/network/pull/36 (not merged).

Template, `packages/website/src/pages/guilds/[slug].astro` (both guild pages):

- **Breadcrumb**: "← Library / Dev Guild", linking to `/library#guilds` (was "← Garden / Guild / Dev Guild"). The header now marks Library as the current section, so breadcrumb and nav agree (September audit F4).
- **Hero**: overline "Guild · Active · Founded 2023" (the founded segment drops when the year is empty), the one-liner, up to three theme chips with theme names instead of slugs, and a **key-links row** of pills from the guild's `links` (mono glyph plus label; wraps at 375). The two hero buttons and the repeated summary are gone.
- **Mandate**: paragraphs at 18px, capped at 65ch, next to numbered principles.
- **Published by the guild**: `outputs` render as cards with kind and date, summary, a contributor credit line (`contributors`), and a link that names its destination ("Read the PDF", "carboncopy.news"). Outputs in the older shape (no `kind`) keep the heading "Public outputs", so today's content is not labelled as published work before the change set is applied.
- **Projects**: active projects only (`status` = `active`), highest featured weight first, with tech stack and links named by destination ("GitHub", "greengoods.app"). No `href="#"` cards.
- **Media and appearances** replaces "Public proof". It reads `media.appearances` (`kind`, `source`, `title`, `href`, `date`, `people`): the first item is a lead card ("Listen on Libsyn"), the rest are rows. Renders only when there is at least one item.
- **Hats**: a grouped list from the guild's `stewards` field (`group`, `role`, `name` or `holders`, optional `href`); "Open hat" when nobody holds a role. Renders only when data exists.
- **People**: `publicMembers` as an initials-avatar grid with name and role, 4 / 3 / 2 columns at 1440 / 1024 / 375 (the DESIGN.md guild row). Bios are no longer shown. The initials are hidden from assistive technology here and in the Hats list, so screen readers announce each name once (Codex review).
- **Body text**: every reading paragraph uses the `--gp-body-lg` token (18px), as the July call asked.
- Dates print as words ("Jan 2026"), never raw. No em dashes. No hand-set `target` or `rel` attributes (the old output and proof cards had them; the site-wide rule is `qa-brand-shell`'s).
- The call-to-action band uses `color-mix()` from tokens instead of raw rgba and a gradient, so the six `scripts/data/ui-source-baseline.tsv` rows for this file were pruned (guild rows only).

Directus field notes, `scripts/directus-studio-setup.ts` (guild fields only): `stewards`, `outputs` and `media` now describe the shapes the page reads, and `proof_signals` says it is not shown on the guild page (Codex review). They reach Data Studio only when `bun run directus:studio:setup` runs against production.

Hub files: this handoff, `artifacts/qa-guilds-change-set.json`, and three preview screenshots in `artifacts/qa-guilds/`.

Seed files: the Dev Guild and Writers Guild seeds and the seven affected project seeds (`src/data/operational-content-seed/projects/`) now hold the approved values, so local seeding and `content:snapshot` match what production will have. `projects/greenpill-podcast.json` is removed: seeds have no archived state, and `content:snapshot` publishes every seed file, so keeping it would put the podcast back on the Writers Guild page in seed-based builds (CodeRabbit review). The Directus row is archived, not deleted. The committed fallback snapshot is unchanged; `qa-system-pass` refreshes it from the agent after the change set is applied.

## Evidence

Gate (AGENTS.md), on the final commit:

- `bun run typecheck`: exit 0.
- `bun run test:content`: 33 pass, 0 fail (it validates the guild seed files).
- `bun run agentic:check`: exit 0 (Modern Web Guidance, browser-verification policy, `plans:validate` 11 hubs, `ui:check` 0 hard and 0 warn).
- `bun run build` (`build:website`): 47 pages. `astro check`: 0 errors, 0 warnings, 5 hints (none in this file).
- `bun run test:agent`: not needed; the agent's guild projection is unchanged.
- `bun run ui:verify`: **not run**. Bun runs inside the network dev machine, which has no Chrome or Chromium, so the command skips every channel, and CI does not run it. The rendered proof is the Brave check below.
- The other `ui:verify` channels, run by hand in Brave instead: the site was built in the machine with the approved change set applied to a temporary copy of the snapshot (restored afterwards), exported with `dm-export`, served on the Mac with `python3 -I -m http.server` on 127.0.0.1:3324, and checked in same-origin iframes at 375, 1024 and 1440. On both guild pages, at every width:
  - axe-core (`runOnly: ['wcag2a', 'wcag2aa', 'best-practice']`, the same rules `ui:verify` uses): 0 violations.
  - Cumulative layout shift over load: 0.
  - Accessibility basics: one `main`, one `h1`, every `nav` labelled (Primary, Mobile primary, Breadcrumb, and the four footer groups), and no link or button without an accessible name.
- Second pass after the Codex fixes (dda5b41), same setup, to cover every `ui:verify` channel:
  - Channels 1 and 4: `ui:verify`'s own in-page assertion script (`DOM_ASSERTIONS`, extracted unchanged from `scripts/ui-verify.ts`) evaluated in each iframe. It covers page and element overflow, 44px targets, wrapped pills and arrow links, off-token colours, non-semantic controls, focusable SVGs, unlabelled inputs and layout shift. Result: 0 findings on both pages at 375, 1024 and 1440.
  - Channel 2 equivalent (the CDP accessibility tree is not reachable from Brave): one `main` and 6 or 7 navigation landmarks, and every rendered control has an accessible name by axe's name computation (key links read "GitHub", "Karma GAP" and so on, with the glyphs hidden). The only empty names are the four links inside the shared header's closed `<details>` mobile menu, which browsers keep out of the accessibility tree until it opens.
  - Channel 3: axe-core again 0 violations.
  - Not reproducible this way: `ui:verify`'s own screenshot files. The Brave screenshots in `artifacts/qa-guilds/` stand in for them.
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
- Hats list: the guild's Linear workspace (team membership read 2026-11-06), used at Afo's direction; names only, nothing else from Linear is published.
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

**Approved by Afo on 2026-11-06 in this session. Not applied yet: apply after PR #36 and PR #34 merge.** The old guild template would render the new links as two "Visit" buttons, and until #34 merges the home Dev Guild tile counts `outputs`, which the change set empties ("0 public outputs"). The breadcrumb's `#guilds` target ships in PR #38; without it the link still opens the Library, just not at the guild cards. Exact values for every row, with each full current value, are in [`artifacts/qa-guilds-change-set.json`](../artifacts/qa-guilds-change-set.json) (42 field changes). Afo approved all of them: as drafted, except the nine marked †, which his answers settled, changed or added (recorded per row in `afoDecision`). Two of those, on Grant Ships, clear the dead `checker.gitcoin.co` link; the orchestrator asked for them after the first approval and Afo said "Yes, clear it".

How to apply: change only the listed fields, in Directus or with targeted PATCH requests to `/items/guilds/<slug>` and `/items/projects/<slug>` using the admin token. **Before writing each field, read it and compare it with the recorded `current` value.** If it differs, a steward edited it after 2026-11-06: skip that field, merge by hand (for example, keep an appearance a steward added to `media`), and confirm with Afo or the steward before writing. Never PATCH a whole record from a stale copy. Directus has no conditional (compare-and-set) update, so before the first read, get everyone who can edit these guild and project records (the people in `content.guild_editor_assignments`, plus admins) to confirm they will not edit them until you finish. Keep that pause from the first read through the final write, apply each record in one short pass, and re-read every field afterwards to confirm it holds the approved value. Do not use `scripts/directus-operational-enrichment.ts` for this: it re-sends every field of all three guilds and every visible chapter initiative from the seed files, which would overwrite steward edits made since. The website picks the changes up on the next hourly build. The guild and project seed files already match the approved values (this PR); the fallback snapshot is for `qa-system-pass`.

Preview screenshots (Brave, local dev server with the approved change set applied to a copy of the snapshot): `artifacts/qa-guilds/dev-guild-1440-hero.jpg`, `dev-guild-1440-hats.jpg`, `dev-guild-375-media.jpg`.

| # | Record | Field | Current | Proposed | Source |
| --- | --- | --- | --- | --- | --- |
| 1 | guilds/dev-guild | `links` | 3: GitHub; Dev Guild Paragraph; Octant proposal | 5: GitHub; Karma GAP; Green Goods; @greenpilldevs; Calls and workshops | [github.com](https://github.com/greenpill-dev-guild)<br>[www.karmahq.org](https://www.karmahq.org/project/greenpill-dev-guild)<br>[greengoods.app](https://greengoods.app)<br>[luma.com](https://luma.com/greengoods)<br>docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 2 | guilds/dev-guild | `connect_links` † | 3: GitHub; Dev Guild Paragraph; Builder spaces | 4: GitHub; Dev Guild Paragraph; Calls and workshops; LinkedIn | [luma.com](https://luma.com/greengoods)<br>[www.karmahq.org](https://www.karmahq.org/project/greenpill-dev-guild)<br>[www.linkedin.com](https://www.linkedin.com/company/greenpilldevguild) |
| 3 | guilds/dev-guild | `summary` | The engineering arm of Greenpill Network, building open-source coordination tools for chapters, funders, and regenerative communities. | A collective of regen developers building open-source tools for Greenpill chapters and regen communities. | [github.com](https://github.com/greenpill-dev-guild) |
| 4 | guilds/dev-guild | `mandate_paragraphs` | 3: The Dev Guild is the engineering arm of Greenpill Network. It designs and ships open-source software that helps chapters and allied communities co… | 1: The Dev Guild is a community of builders making open-source tools, guides and workshops for Greenpill chapters and regen communities, focused on i… | [www.karmahq.org](https://www.karmahq.org/project/greenpill-dev-guild/about)<br>[github.com](https://github.com/greenpill-dev-guild) |
| 5 | guilds/dev-guild | `description` | The Dev Guild ships public tooling for impact measurement, capital allocation, community governance, reputation, and public network surfaces. Public … | A community of builders making open-source tools, guides and workshops for Greenpill chapters and regen communities. | [www.karmahq.org](https://www.karmahq.org/project/greenpill-dev-guild/about) |
| 6 | guilds/dev-guild | `cadence` | format: Builder spaces and public async work, summary: Public sources confirm recurring builde… | format: Builder spaces and public async work | (internal note removed) |
| 7 | guilds/dev-guild | `outputs` | 5: Impact verification; Capital allocation; Reputation primitives; Public goods staking; Public writing | `[]` | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 8 | guilds/dev-guild | `proof_signals` | 3: Octant Community Fund grant; Octant proposal; Regenerative stack | `[]` | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 9 | guilds/dev-guild | `media` | image fields unchanged; no appearances | image fields unchanged; appearances 5: Greenpill IRL: Building a Coordi-Nation with Kevin Owocki, Matt & Afolabi; The Public Goods Staking Protocol v… | [128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com](https://128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com/greenpill-irl-building-a-coordi-nation-with-kevin-owocki-matt-afo)<br>[paragraph.com](https://paragraph.com/@greenpilldevguild/the-public-goods-staking-protocol-v0)<br>[www.cryptoaltruists.com](https://www.cryptoaltruists.com/blog/trailblazers-of-octant-episode-4-greenpill-dev-guild-scaling-the-regen-movement-with-web3-coordination-tools)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-dev-guild-2024-recap/162)<br>[paragraph.com](https://paragraph.com/@greenpill/q1-2025-laying-the-groundwork) |
| 10 | guilds/dev-guild | `stewards` † | `[]` | 7: Afolabi Aiyeloja; Matt Strachman; Product; Research; Funding and partnerships; Community; Marketing | Linear workspace, team membership (internal, read 2026-11-06)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363) |
| 11 | guilds/dev-guild | `public_members` † | 2: Afo (Afolabi Aiyeloja); Matt (mattycompost) | 12: Afolabi Aiyeloja; Caue Tomaz; Matt Strachman; Trinity Morphy; Marcin; Leo; Marcus; Nansel; BitBeckers; Tarun; Athus; Steve | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/regen-protocols/364)<br>[paragraph.com](https://paragraph.com/@greenpilldevguild/the-public-goods-staking-protocol-v0)<br>[discuss.octant.app](https://discuss.octant.app/t/greenpill-dev-guild-regeneration-through-collaboration/456) |
| 12 | guilds/writers-guild | `links` † | 2: Greenpill Paragraph; Greenpill Podcast | 2: Newsletter; @GreenpillWrites | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-writers-guild/159)<br>[paragraph.com](https://paragraph.com/@greenpill)<br>[x.com](https://x.com/GreenpillWrites)<br>[www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild) |
| 13 | guilds/writers-guild | `connect_links` † | 2: Greenpill Paragraph; Greenpill Podcast | 2: Greenpill Network newsletter; X | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-writers-guild/159)<br>[paragraph.com](https://paragraph.com/@greenpill)<br>[x.com](https://x.com/GreenpillWrites) |
| 14 | guilds/writers-guild | `proof_signals` | 3: Greenpill Paragraph; Podcast archive; Carbon Copy collaboration | `[]` | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 15 | guilds/writers-guild | `outputs` | 4: Field reports; Translations; Publication surfaces; Tooling research | 4: On-Chain Impact Networks; Onchain Capital Allocation Handbook: Explorers Edition; Greenpill Network newsletter; Web3 Tooling Series | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about)<br>[www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild)<br>[greenpill.network](https://greenpill.network/pdf/onchain-impact-networks.pdf)<br>[greenpill.network](https://greenpill.network/pdf/onchain-capital-allocation-v2.pdf)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-writers-guild/159)<br>[paragraph.com](https://paragraph.com/@greenpill)<br>[carboncopy.news](https://carboncopy.news/content/web3-tooling-series) |
| 16 | guilds/writers-guild | `public_members` † | `[]` | 14: Sarah Smith; Matt Strachman; Riley Blackwell; Lana Dingwall; Izzy Lawrence; Trinity Morphy; Anthony Amio; Anthony Luong; Ashna Srivastava; Cauê T… | [greenpill.network](https://greenpill.network/pdf/onchain-impact-networks.pdf)<br>[greenpill.network](https://greenpill.network/pdf/onchain-capital-allocation-v2.pdf)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/greenpill-writers-guild/159) |
| 17 | guilds/writers-guild | `mandate_paragraphs` | 3: The Writers Guild makes the network legible. It turns local experiments, chapter practice, books, podcasts, and builder work into public stories p… | 1: The Writers Guild is an open collective of researchers, writers, editors, translators and designers. It makes books, newsletters, articles and doc… | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 18 | guilds/writers-guild | `principles` | 3: Source-backed storytelling; Field-first writing; No private drafts in public content | `[]` | (internal note removed) |
| 19 | guilds/writers-guild | `summary` | Publishing, storytelling, research, and public sensemaking across the Greenpill network. | Books, newsletters and research from an open collective of writers, editors, translators and designers. | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 20 | guilds/writers-guild | `oneliner` | Stories, translations, field reports, and public knowledge work for the network. | Books, newsletters, research and translations from the network's writers. | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 21 | guilds/writers-guild | `description` | The Writers Guild supports essays, field reports, translations, publishing workflows, and editorial work across chapters and guilds. Public sources s… | An open collective of researchers, writers, editors, translators and designers producing books, newsletters, articles and documentation about the reg… | [www.karmahq.org](https://www.karmahq.org/project/greenpill-writers-guild/about) |
| 22 | guilds/writers-guild | `founded_year` † | 2024 | 2023 | [gapapi.karmahq.xyz](https://gapapi.karmahq.xyz/projects/greenpill-writers-guild)<br>[hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/welcome-to-greenpill-network/5) |
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
| 33 | projects/grant-ships | `live_url` † | https://checker.gitcoin.co/public/project/show/greenpill-dev-guild | "" | [forum.arbitrum.foundation](https://forum.arbitrum.foundation/t/grant-ships-weekly-dev-log/20191) |
| 34 | projects/grant-ships | `proof_signals` † | 2: Gitcoin project; Allo Alliance article | 1: Allo Alliance article | [paragraph.com](https://paragraph.com/@greenpilldevguild/the-allo-alliance-innovating-capital-allocation-on-chain) |
| 35 | projects/green-goods | `live_url` | https://docs.greengoods.app/community/why-we-build | https://greengoods.app | [github.com](https://github.com/greenpill-dev-guild/green-goods)<br>[greengoods.app](https://greengoods.app) |
| 36 | projects/public-goods-staking-protocol | `description` | The Public Goods Staking Protocol is a Greenpill Dev Guild workstream sourced from the Dev Guild Paragraph series. Public sources describe a path whe… | The Public Goods Staking Protocol coordinates validator squads to create long-term funding for public goods, drawing on validator infrastructure, Dap… | [paragraph.com](https://paragraph.com/@greenpilldevguild/the-public-goods-staking-protocol-v0) |
| 37 | projects/greenpill-impact-framework | `description` | The public companion thread frames the Greenpill Impact Framework as a way to connect Green Goods v1, impact, strategy, measurement, coordination, an… | A framework connecting Green Goods with impact strategy, measurement, coordination and capital formation. Work in 2026 starts with GreenWill badges i… | [hub.regencoordination.xyz](https://hub.regencoordination.xyz/t/growing-the-greenpill-impact-framework/411) |
| 38 | projects/greenpill-v2-website | `name` | Greenpill Network V2 Website | Greenpill Network website | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 39 | projects/greenpill-v2-website | `summary` | Public front-door rebuild for chapters, Library, Stories, Guilds, Garden, map, and impact surfaces. | Public front door for chapters, Library, Stories, Guilds, and the map. | docs/design/claude-design-wireframe-prompts.md (Prompt 3 and appendix) |
| 40 | projects/greenpill-v2-website | `repo_url` | https://github.com/greenpill-dev-guild | https://github.com/greenpill-dev-guild/network | [github.com](https://github.com/greenpill-dev-guild/network) |
| 41 | projects/greenpill-v2-website | `live_url` | https://hub.regencoordination.xyz/t/greenpill-network-website-revamp/414 | https://greenpill.network | [greenpill.network](https://greenpill.network) |
| 42 | projects/greenpill-v2-website | `tech_stack` | 4: Astro; Keystatic; Public agent routes; Source-backed content | 3: Astro; Directus; Hono | [github.com](https://github.com/greenpill-dev-guild/network) |

Notes on specific rows:

- **Hats (`stewards`)**: Afo asked for the core team as recorded in the guild's Linear workspace (Afolabi, Matt, Nansel, Kit and Gui). Each work area is one of the guild's Linear teams with its members: Product (Afolabi, Matt, Gui), Research (Afolabi, Matt), Funding and partnerships, which is the Growth team (Afolabi, Matt, Kit), Community (Afolabi, Matt, Nansel), Marketing (Afolabi, Nansel, Kit). The two stewardship roles are the ones Afolabi and Matt state publicly (Hub, 2025-11-12). Names only; no emails. No public Hats tree ID was found; the 2024 recap says Hats integration was initiated on Optimism.
- **Dev Guild contributors**: 12 people, approved as drafted. Roles come from the 2025 Hub posts where they exist (Afolabi, Caue, Matt, Trinity), otherwise from the August 2024 Octant proposal. Kit and Gui appear in the Hats list; adding them to the contributors grid would need Afo's OK.
- **Writers Guild contributors**: the 14 people on the credits page of On-Chain Impact Networks, approved as drafted. Izzy is credited as "Helped lead the guild".
- **Writers Guild links**: Afo said the guild has no website, only its Paragraph, and asked for "Paragraph and X". The Regen Hub thread and Karma profile remain sources, not links.
- **Writers Guild founding year**: 2023, confirmed by Afo. It matches the guild's Karma profile, which dates its newsletter work from October 2023.
- **GreenWill stays active**: the repository is archived, but in April 2026 Afo described it as "the badge and recognition layer we're designing for Green Goods". The row updates its summary and links instead of hiding it.
- **Greenpill Podcast**: the project row is archived, not deleted, and the podcast stays in the Library. Kevin Owocki announced the show in February 2022 "through the Bankless network"; no guild source claims it.

## Open items and decisions needed

Afo's answers (2026-11-06):

1. Change set: approved as drafted, with the seven rows marked † settled by the answers below. Apply after PR #36 merges.
2. LinkedIn: add the Dev Guild page `https://www.linkedin.com/company/greenpilldevguild` to its Connect links. The unmaintained website link is `hub.greenpill.network`, which no longer exists; it is not a guild link (see the `qa-brand-shell` request below). GreenSci keeps its direct link to its site. No network-level LinkedIn URL was named, so the footer LinkedIn is still open for `qa-brand-shell`.
3. Hats: built from the Linear team (Afolabi, Matt, Nansel, Kit, Gui).
4. Contributors: both lists approved as drafted, including Izzy's credit.
5. Writers Guild: links are the Paragraph newsletter and X; founding year 2023.
6. Grant Ships: clear its `live_url` and the proof signal that link `checker.gitcoin.co`, which no longer resolves ("Yes, clear it").

Still open:

- Coop (`greenpill-dev-guild/coop`, last push 2026-06-19) is not a project row. Asked Afo whether to add it to the Dev Guild.
- Applying the change set after PR #36 merges (production write, approved). Then `qa-system-pass` refreshes the fallback snapshot from the agent.

Requests to other sessions:

- `qa-brand-shell`: `content/social-links.json` still has `"hub": "https://hub.greenpill.network"`. Afo says it no longer exists, so remove it or point anything that reads it at `https://hub.regencoordination.xyz`. Afo has not named a network-level LinkedIn yet; the Dev Guild's own page is `https://www.linkedin.com/company/greenpilldevguild`.
- `qa-home-garden`: done in PR #34. The home Dev Guild tile now has a static label and no longer reads `outputs`.
- `qa-library` (sent, done in its branch per its reply): `id="guilds"` on the guild cards; a guild card label that doesn't count `proofSignals`; the Carbon Copy resource now links the published series; `writers-guild` removed from the podcast resource's `relatedGuildSlugs`.
- `qa-stories`: done in PR #37. `greenpill-2026-thesis` is now a draft, as Afo decided, because its only source was the unpublished Paragraph preview. qa-stories also removed the Garden Season One story's `relatedGuild: writers-guild` (the Hub thread only plans a Writers Guild recap); its handoff records that as a judgment call Afo can reverse. The Web3 Tooling Series is listed there as a story candidate.
- `qa-system-pass`: after the change set is applied, refresh the fallback snapshot with `bun run content:snapshot:from-agent`, then confirm its `projects` no longer include `greenpill-podcast` and that the Dev Guild record has empty `outputs` and `proofSignals`. The project seeds are already in step (done here after the CodeRabbit review, since no session owned them).
- Data Studio field notes: updated in this PR (no session owned `scripts/directus-studio-setup.ts`). To show them to stewards, run `bun run directus:studio:setup` against production together with the change set; it is a production write, so it needs Afo's OK at that time.

Other notes:

- `ui:verify` was not run (no Chrome in the dev machine, not in CI). Brave QA covered its layout checks by hand.
- No embedded YouTube player: no Builder Space recording exists, and an embed would add third-party requests. The lead card links out instead. Revisit if a recording is published.
- The external-link rule (new tab, `rel`, hint) is `qa-brand-shell`'s. This PR removed the hand-set `target` and `rel` attributes from the guild cards, so until that rule lands those links open in the same tab, like most links on the site today.
- Process note: a dev server started with `NETWORK_WEBSITE_PORT=3324` bound 3301, because the dev-machine shim does not pass environment variables (see the shared notes). It was stopped. Pass `--port` to `astro dev`, and run dev servers in a Terminal tab so Ctrl-C reaches the process in the machine.
