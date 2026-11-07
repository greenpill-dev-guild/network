# Handoff: qa-stories (PRD-1412)

## Changed

Pull request: https://github.com/greenpill-dev-guild/network/pull/37 (not merged; merge the plan hub PR #33 first, since this branch is cut from it).

- **All 16 published stories rewritten from their sources.** Every factual claim now traces to a public source opened on 2026-11-06 (see Sources). Internal-note copy is gone ("source-backed", "seed copy", "research artifact", "launch-safe", "should render as", "steward review"). Wrong dates fixed, unsupported claims removed, titles without em dashes, US spelling.
- **Two stories unpublished** (`status: draft`), as Afo decided on 2026-11-06 ("Unpublish until posted"): `greenpill-2025-year-in-review` and `greenpill-2026-thesis`. Their only source was an unpublished Paragraph draft preview (`/@greenpill/preview/...`); the thesis preview still opens with "EDITORIAL NOTE: Cover image placeholder". The Garden story no longer links that preview. Republish each story once its post is live on Paragraph and swap in the published URL.
- **Five new stories**, the set Afo picked on 2026-11-06 from two candidate lists: `greenpill-irl-building-a-coordi-nation`, `network-nations-podcast-series`, `greenpill-nigeria-global-pizza-party-2026`, `greenpill-cape-town-trash-to-treasure`, `escola-da-regeneracao-do-cacau`.
- **Three stories extended with newer sourced facts**, as Afo picked: Tech & Sun (hub activation on 2026-03-14, weekly learning days, June AI bootcamp, Heenal's essay), Earth Week (calendar events in Nigeria, Uganda, Kenya and Koh Phangan), Phangan (DeCleanup's 2026-08-17 update).
- **Template fixes** (`pages/stories/index.astro`, `pages/stories/[slug].astro`, new `pages/stories/_story-format.ts`):
  - "17 storyies" is now "N stories" (the caption pluralized by appending "ies").
  - No byline unless a story names a real author; the "GN · Greenpill Network research · Source-backed seed copy" byline is gone from every story.
  - Category labels instead of slugs in meta rows and cards ("Field report", not "field-report"), using the labels editors already pick from in `keystatic.config.ts`. Regions are capitalized. The story breadcrumb is now "All stories / title": at 375 px the shared Breadcrumb component let a non-link category crumb overlap the title ("Field repoTech & Sun"), and the category already sits in the meta line under the breadcrumb.
  - Dates formatted for people: "Mar 14, 2026", "Mar 2026", "2026".
  - Read time is computed from the body, so it cannot drift from the copy; it moved into the meta row.
  - "Proof links" with internal IDs (S048 and so on) became a **Sources** card: publisher, title, and author or date per source. A source without a URL renders as plain text instead of a link to `#`. The duplicate "## Sources" list of raw URLs at the end of every body is gone.
  - Related chips use public chapter and guild names from the operational snapshot ("Chapter · Greenpill Nigeria", not "Chapter · c te d ivoire"), and only render when that chapter or public guild page exists.
  - SEO titles match each h1 (the audit found five mismatches).
  - Index copy: hero dek and the "Contribute" card no longer describe Keystatic or a moderation queue that does not exist; "Featured source-backed story" caption removed; the featured story is the newest one (Greenpill IRL, Ep 1), and the rest sort by date.
- `stories-index.json`: unrendered sections, the topic spotlight and the translation note rewritten without internal language; internal source IDs replaced by publisher names.
- Image alt text corrected where it described something else (Earth Week's image is the Green Goods home page; Phangan's is a DeCleanup flyer; Brasil's shows people in a circle, not around a table). London Ontario's story image was a generic TechAlliance "Ecosystem Events" graphic; it now uses the site's own texture (see Images below).

No changes to `package.json`, the lockfile, workflows, `CLAUDE.md`, `AGENTS.md` or `.claude/**`.

## Evidence

- `bun install --frozen-lockfile` (approved by Afo for every QA session on 2026-11-06).
- `bun run agentic:guidance`: ran before UI work.
- `bun run ui:check`: 0 hard, 0 warn.
- `bun run test:content`: 33 pass, 0 fail. This suite requires every published story to have a local image with alt text and every story reference to point at a published story.
- `bun run build:website`: passes, 50 pages, 21 published stories.
- `bun run ui:verify` **did not run**: inside the isolated dev machine it prints "No Chrome/Chromium binary found ... Skipping" and exits 0. CI does not run it either.
- **Brave QA** (Afo's profile through Claude in Chrome, 2026-11-06). The build was exported with `dm-export` and served from the Mac on `127.0.0.1:3325`, following `side-session-notes/dev-machine-port-trap.md`. Brave stays at 1460 px, so 375 and 1024 were checked in same-origin iframes of exactly those widths.
  - `/stories/` at 375, 1024 and 1460: no horizontal overflow; feature card and grid reflow from three columns to two to one; meta rows read "Chapter update · Americas · Sep 17, 2026" and wrap between segments at 375.
  - `/stories/greenpill-nigeria-tech-and-sun-round/`, `/stories/greenpill-cote-divoire-la-ligne-verte/`, `/stories/greenpill-irl-building-a-coordi-nation/`: no horizontal overflow at 375 or 1024; Sources card goes from three columns (1024) to one (375); related chips show "Chapter · Greenpill Nigeria" and "Guild · Dev Guild".
  - Found and fixed in QA: the caption rendered "20stories" (Astro dropped the space between two expressions; now one template string), and the breadcrumb overlap at 375 described above.
  - axe-core 4.11.4 (the repo's pinned copy, served same-origin) with WCAG 2.0 and 2.1 A and AA plus best-practice rules: no violations on `/stories/` and four story pages.

## Sources

All sources opened in Afo's Brave profile through Claude in Chrome on 2026-11-06. Hub threads were read in full through Discourse's public JSON (`/t/<id>.json`). "Reported" in story copy marks numbers that come from the chapter's own post.

### greenpill-irl-building-a-coordi-nation (new)

- Released 2026-11-05 (feed pubDate 15:00 UTC), 48:54 long, title, "new season spotlighting three years", Kevin Owocki with Matt (Matty Compost) and Afolabi, "from a meme and a book", "heading into 2027": Greenpill podcast feed item, https://128c3f4a-6136-477c-8898-83d022a2d198.libsyn.com/greenpill-irl-building-a-coordi-nation-with-kevin-owocki-matt-afo (feed https://rss.libsyn.com/shows/400481/destinations/3304589.xml).
- New series about the network itself, main show mostly ideas, Episode 1 is "where we are and how we got here", future episodes go to the chapters, every topic in the list (NYC with Gardens and Octant vaults, Stewards Syncs, Garden, onboarding, burnout, end of easy grant money, AI, time zones, losing Izzy, Tech & Sun, Regen Knowledge Commons, local AI, Green Goods, endowments, Kevin on rebuilding Gitcoin, cosmolocal future), and the thread's three invitations: Hub thread 478 by afo, 2026-11-06, https://hub.regencoordination.xyz/t/478
- Announcement: https://x.com/greenpillnet/status/2118790265918132296 (2026-11-06).

### network-nations-podcast-series (new)

- Hosts Primavera De Filippi and Felix Beer; definition of network nations; Ep 1 "Building Trust at Scale" on 2025-10-24; Ep 15 on 2026-02-06; every guest and date in the list (Ep 2 Rushkoff and Hall 2025-10-31; Ep 5 Orgad, Bauböck, Strickler 2025-11-21; Ep 6 Owocki, Austin Wade Smith of Regen Network, Monty Merlin of ReFi DAO 2025-11-28; Ep 7 Audrey Tang and Nathan Schneider 2025-12-06; Ep 10 Erika Blair 2026-01-02; Ep 11 Vitalik Buterin on Zuzalu 2026-01-09; Ep 12 Santiago Siri 2026-01-16; Ep 14 Helena Rong on SeeDAO 2026-01-30; Ep 15 Benjamin Life and Patricia Parkinson of OpenCivics 2026-02-06) and the topics of Eps 3, 4, 8, 9 and 13: titles, dates and descriptions in the Greenpill podcast feed above.

### greenpill-nigeria-global-pizza-party-2026 (new)

- Date, venue city, hosts (Amio, PizzaDAO, Own The Doge, ENS, World Pizza Champions), 1:00 to 6:00 PM, partners (Bitcoin Anambra, Greenpill Nigeria, PizzaDAO), 136 RSVPs and 145 signed in, participating groups, topics, hybrid format: https://www.rsv.pizza/report/d29e6b0fc4dc8d36. The page header says **Friday, May 22, 2026**; the recap text and the Hub report say "Saturday, 22nd May 2026", but May 22, 2026 is a Friday, so the story uses Friday.
- Report to the Greenpill Fund for Regenerative Gatherings, and the reflection on relaxed, experiential events: Hub thread 464 post 7 by Amio, 2026-09-19, https://hub.regencoordination.xyz/t/464/7
- Third time hosting in Anambra: https://x.com/amioantho/status/2058909330326311046 (2026-05-25).

### greenpill-cape-town-trash-to-treasure (new)

- June 5, 2026, 6 to 8 PM, The Commons, World Environment Day, artists from Muizenberg and Vrygrond, physical and online, Message in a Bottle by the Berg Waste and Recycling Collective created by Chloé van Wyk, Pedro Espri-Sanchez, the collective's website, Marine Estate Connected Community supported by Greenpill Cape Town, GroFree with the BacktoLand Campaign: Luma event on the Greenpill Cape Town calendar, https://luma.com/4hw1s69s
- Deep South Sessions (afternoon circles) and Deep South Circles: Ideas into Action, from November 2025: https://luma.com/greenpill.capetown (calendar; for example https://luma.com/weqx1m80 on 2025-11-11 and https://luma.com/qswta2oc on 2025-11-18).
- Weekly Tuesday online sessions and second-Thursday gatherings from January to June 2026, delivering Trash to Treasure in June, the UNICEF Yoma cohort and The Dignity Project, more than $8,000 in Artizen donations, monthly celebrations September through February: Hub thread 464 post 9 by alwynvanwyk, 2026-10-12, https://hub.regencoordination.xyz/t/464/9

### escola-da-regeneracao-do-cacau (new)

- Every claim (Mogi das Cruzes, November 2025 to September 2026, partner networks, the starting question, 1,520 GPBRV through a Gardens proposal, Bahia harvest and processing, the logistics bottleneck, local cacao through Casa Hateva, bean-to-bar chocolate in São Paulo, deliveries to Greenpill Brasil members, 4,200 K-KAU with Sarafu offers and no circulation yet, Tuesday and Sunday meetings since April 2026, the planned BayaNativa and Pedagogingas activity, the main lesson): Hub thread 464 post 6 by klaussroedel, 2026-09-17, https://hub.regencoordination.xyz/t/464/6. The report itself still contains "[INSERT LINK]" placeholders for its evidence, so the story attributes everything to the report and claims no completed Bahia activity.

### greenpill-nigeria-tech-and-sun-round (updated)

- Program, two universities, hub contents, Owerri pilot, $21,000 budget, $7,000 raised, $7,840 matched, Awka full and Nsukka partial, named partners, planned Karma GAP and Green Goods tracking: Hub thread 393 post 1 by Amio, 2026-02-23, https://hub.regencoordination.xyz/t/tech-sun-round-by-greenpill-nigeria/393
- Build log items and "TAS HUB Unizik Ready for Activation": Hub thread 393 posts 2 to 6, 2026-03-08.
- Activation event on March 14, 2026 with a remembrance of Izzy: https://luma.com/au47b6cr
- "On March 14th, we proudly activated TAS Hub UNIZIK", Localism Fund Round 1, support from Greenpill Network, the Dev Guild and Switch: https://x.com/Greenpill9ja/status/2033066010517938325 (2026-03-15).
- Weekly 8 to 10 hour learning days since March 2026, about 24 people a day, activities: Hub thread 464 post 8 by Amio, 2026-09-19, https://hub.regencoordination.xyz/t/464/8
- TAS Creative Series 1.0, June 14 to 19, 2026: https://x.com/techandsunhubs/status/2065360898831548810 (2026-06-12).
- Izzy and Tech & Sun ("build bridges between Nigeria and the rest of the world, with initiatives like Tech and Sun"): Hub thread 453 by afo, 2026-06-26, https://hub.regencoordination.xyz/t/see-you-when-i-see-you/453
- Heenal's essay, 2026-03-05: https://heenalr.substack.com/p/greenpill-nigeria-solar-panels-staking
- Removed: "the strongest new Greenpill Nigeria update from the live Hub pass", "should read as a current field report ... not as a completed impact-metrics claim", and the internal ID S049.

### greenpill-earth-week (updated)

- Thread opened 2026-04-06, Earth Day Wednesday April 22, the suggested tracks, Green Goods documentation: Hub thread 413 post 1 by afo, https://hub.regencoordination.xyz/t/greenpill-earth-week/413
- Kenya plans (post 2, 2026-04-10), Cape Town and the Amava Uluntu Peace Garden BackaBuddy campaign (post 4, 2026-04-13), GreenSofa's MEGAWEAVING teaser and resource mapping session (post 5, 2026-04-15): same thread.
- Nigeria clean-up drive and climate education session from the TAS Hub, April 22: https://luma.com/7g0q6lto; that it happened ("we took action by weeding and cleaning around @techandsunhub"): https://x.com/Greenpill9ja/status/2047020884884422990
- Uganda tree planting at Morikiswa primary school, April 22: https://luma.com/rwo6wvcf
- Kenya Earth Day exercise, Mortech Farmhouse, Nairobi, April 22 to 26: https://luma.com/8b4p3o5p
- Phangan cleanup marathon to Ko Tae Nai near Thong Sala, April 25, boat, kayaks and supplies from Green Goods micro-grants: https://luma.com/dcj9r2l5
- Uganda, Kenya and Phangan are written as "listed", since only the event pages confirm them.
- Removed: "Brasil/Fabulosa linked the coordination moment to an upcoming Web3 cafe gathering" (post 6 says fabul0sa could not join and postponed its own gathering), the claim that Earth Week "connected local cleanups ... across the network" as a done thing, and the internal notes about operational owners.
- Correction to the candidate list sent to Afo: the Greenpill NYC meetup listed for April 23 UTC was on April 22 at 8 PM New York time and is not Earth Day themed, so it is not in the story.

### greenpill-phangan-environmental-monitoring (updated)

- Chapter about a year old in August 2024, Regen Full Moon with ReFi Phangan, local regeneration infrastructure and public goods funding, work on a quadratic funding round, cleanup form with photo upload and Unlock Protocol certificate, the Decentralized Cleanup Network, joint cleanups, Monthly Earth Day: Hub thread 95 post 1, 2024-08-04, https://hub.regencoordination.xyz/t/greenpill-phangan-updates/95
- DeCleanup Rewards on Arbitrum, idea born in the chapter: thread 95 post 3, 2024-10-15.
- Altruist sensors from Robonomics at around five locations: post 4, 2025-05-28. Monitoring analysis: post 5, 2025-07-03.
- Base mini app, Celo platform in testing, docs and playbook: Hub thread 394 post 1, 2026-02-24, https://hub.regencoordination.xyz/t/decleanup-network-base-app-launched-celo-in-testing-playbook-published-docs-live-heres-everything/394
- AI-assisted verification with fraud scoring and waste categorization, Gardens governance, Global Cleanup Games Trash Athlete Challenge: thread 394 post 2, 2026-08-17.
- Removed: "now has a stronger chapter-owned initiative than an event-only record" and the note about what the "chapter-owned surface" should focus on.

### greenpill-garden-season-one

- Announcement 2025-11-12, the lesson about money alone, teaching and support across forms of capital, launch 2025-11-21 at DevConnect, target end 2026-04-03, $24,000 budget, operators Afolabi Aiyeloja, Caue Tomaz and Matt Strachman, every phase and date, ETHDenver check-in: Hub thread 363 post 1, https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363
- Durgadas (GravityDAO) workshops and worksheet feedback, SuperBenefit cell structures session, MetaGov and OpenGrants on DAO-IP, "clearer shared language and sharper questions", Glocal VR ReRe workshop planned for early March, Regen Reservoir inventory: thread 363 post 4 by Coi, 2026-02-11.
- Removed: the unpublished thesis preview as a source, and with it "five-month incubation" and "summer 2026 harvest" (the Hub thread gives November 21 to April 3 and a harvest check-in at ETHDenver); Knowledge Garden, Sarafu and Regen Reservoir framing; the Regen Protocols paragraph (Afo's review asked to drop inactive protocols); "Internal Garden Guide details should stay out of launch content"; the Writers Guild link (no source ties the story to the guild).

### growing-greenpill-impact-framework

- **Date fixed: the thread is from 2026-03-25, not 2025.** Green Goods v1, four Season One domains, the questions, the related frameworks, "yield to impact": Hub thread 411 post 1 by afo, https://hub.regencoordination.xyz/t/growing-the-greenpill-impact-framework/411
- GreenWill as the first implementation phase, registry, indexer, profile badges, the first three badges: thread 411 post 2, 2026-04-06.
- Green Goods docs link: https://docs.greengoods.app/community/why-we-build
- Removed: "The research artifact includes richer internal framework language around MDR, CIDS, Y2I, Hypercerts, and anomaly detection", "Launch-safe story copy ...".

### dev-guild-regenerative-stack

- October 2023 start, four layers, series outline: https://paragraph.com/@greenpilldevguild/pioneering-a-regenerative-stack (2025-06-30).
- Squad staking with Obol, Dappnode and Lido: https://paragraph.com/@greenpilldevguild/squad-staking-turning-validator-rewards-into-public-good (2025-07-01).
- Grant Ships, conviction voting, streaming (Flow State, Flows), cookie jars: https://paragraph.com/@greenpilldevguild/the-allo-alliance-innovating-capital-allocation-on-chain (2025-07-02).
- GreenWill as verifiable reputation for governance: https://paragraph.com/@greenpilldevguild/greenwill-powering-governance-through-reputation-tracking (2025-07-03).
- Green Goods makes grassroots conservation visible, verifiable and funded: https://paragraph.com/@greenpilldevguild/green-goods-simplifying-impact-capture-and-exchange (2025-07-04).
- Capital formation: https://paragraph.com/@greenpilldevguild/capital-formation-turning-impact-into-sustainable-revenue (2025-07-05). Q3 and Q4 2025 roadmap: https://paragraph.com/@greenpilldevguild/validating-the-regenerative-stack (2025-07-06).
- PGSP v0 on 2026-03-23: squads, DVT, yield to Octant vaults that separate principal from yield, Dappnode, Obol DVT, Lido CSM, Octant Vaults, 2.4 ETH bond for 32 ETH: https://paragraph.com/@greenpilldevguild/the-public-goods-staking-protocol-v0
- Dates from each post's published metadata. Removed: "gives the website a public source trail", "For the website, this should read as one Dev Guild workstream story ...".

### ethereum-at-10-awka

- **Date fixed: July 30, 2025 (the story said 2025-08).** Venue, invitation wording, agenda items and partners: https://luma.com/hlkglzcg
- More than 70 people across the Awka and Enugu meetups, series closing: Hub thread 324, https://hub.regencoordination.xyz/t/take-the-greenpill-with-greenpill-nigeria-10-weeks-of-refi-education/324
- The Luma page shows 146 "went"; that is an RSVP count, so it is not used. Removed: the whole previous body ("Use this as an event recap / local activation seed ...").

### take-the-greenpill-nigeria-refi-education

- May 5 to July 14, 2025, aim, online delivery (four hours over two days per community), 8 communities, 250+ learners, 16 sessions, curriculum, tools, Ethereum at 10 in Awka and Enugu with 70+, next steps with Water Cup: Hub thread 324 post 1 by Amio, 2025-08-05 (link above). Date set to the recap date. Removed: "The research artifact identifies ...", "For page implementation ...".

### greenpill-nigeria-water-cup

- **Date fixed: July 17, 2025 (the story said 2025).** Partnership with Atlantisp2p, three stages, dNFT campaign, four themes, June to July 2025, the 15 localities by state, three per team, 75+ respondents, findings, $250 USDGlo and impact certificates, implementation on Impact Landscapes: Hub thread 307 post 1 by Amio, https://hub.regencoordination.xyz/t/greenpill-nigeria-project-water-cup-updates/307
- Hypercert on Celo: https://app.hypercerts.org/hypercerts/42220-0x16bA53B74c234C870c61EFC04cD418B8f2865959-86091438830997431256233775680237357498368
- Water Cup in the Awka showcase: https://luma.com/hlkglzcg
- Removed: "one of the strongest public chapter footprints in the research artifact", "This story should render as a proof-backed field note ...".

### greenpill-cote-divoire-la-ligne-verte

- **Date fixed: August 6, 2025 (the story said 2025).** Every claim (Green Mission 2025 in Gitcoin Grants, simplicity and no jargon, the slogan and its meaning, the Telegram chatbot and WhatsApp plan, points and cleanup bonus, open data map, pitches to Habitants d'Internet, Celo Côte d'Ivoire and Tech Republic, vibe-coded prototype in beta, the UNDP Côte d'Ivoire hackathon on AI and biodiversity protection, the reported win and partial UN funding with mentorship, next steps, Abraham Coulibaly as chapter lead): Hub thread 333, https://hub.regencoordination.xyz/t/greenpill-civ-chapter-update-the-beginning-of-la-ligne-verte/333
- Removed: "2025-2026 targets" and "planned goals" (no targets appear in the source), "The research artifact flags ...".

### greenpill-brasil-gg20-climate-milestones

- **Date set to 2025-02-12, when Karma GAP marked the grant complete** (the story said 2026-03-28). Grant received 2024-04-24; four milestones; completion dates (June 15, 2024 and August 2, 2024); 10 sessions, 10 wallets, 10 Passports, 5 projects; 20 protected areas; 51 bee traps; completion summary: https://www.karmahq.org/project/greenpill-brasil/funding/0xb1dcd95cbb1a9252a8a7447b870fded9cda968e194d317dc672106426e85f153/milestones-and-updates and the grant overview page.
- Removed: the dead Gitcoin checker link (https://checker.gitcoin.co/public/project/show/greenpill-brazil shows an error page), the Dev Guild link (no source), "launch-safe proof point", "meeting-hour and contributor-count claims ... steward signoff".

### regenmeetup-rio

- **Date fixed: Friday, May 17, 2024 (the story said 2024).** Hosts, Fabulosa Lab as an independent maker space in the global Fab Lab network, theme and question, agenda, fishbowl speakers and their organizations: https://luma.com/qm4tiq1e
- Not used: the 2024 Year in Review's "partnered with FabulosaLab at Ethereum Rio for a climate-resilience event", because nothing shows it was the same event.

### greensofa-taiwan-public-goods-tooling

- Founding date, aims, FAB DAO description, every funding entry and month: https://hackmd.io/@greensofa/home. Dates there are month only, so the story date stays "2026-03" (renders "Mar 2026").
- Hypercerts dashboard for Taiwan: https://fabdaotw.github.io/ ("Green Sofa Dashboard"). Giveth page: https://giveth.io/project/greensofa-greenpill-taiwan
- Removed: "A high-confidence source-backed story", "one of the stronger public chapter proof surfaces in the research artifact".

### greenpill-q1-2025-laying-groundwork

- Every claim (postponed January gathering, Izzy Initiatives, Cape Town and London Ontario, ICS, Repair Café and Thing Library, tool training, second Denver gathering, 14 hackerhouse guests, Friday barbecue, Greenpill Goonies Giveback with Food Bank of the Rockies and the Greenway Foundation, 17 lbs from the South Platte River, GFEL in Boulder, CIDS with English, Portuguese and Spanish workshops, the four community rounds, Toronto's demo day on April 21): https://paragraph.com/@greenpill/q1-2025-laying-the-groundwork (2025-04-30).

### greenpill-2024-year-in-review

- Every highlight, by quarter, and "not exhaustive": https://paragraph.com/@greenpill/2024-a-year-in-review (2024-12-31). Removed: "not a shortcut for turning every mentioned activity into operational content" and the note about seeding chapter initiatives.

### vibe-coding-good-london-ontario

- **Date fixed: Tuesday, April 28, 2026 (the story said April 28, 2025).** Title, 6:00 to 8:30 PM, Reimagine Co at 206 Piccadilly St, Reimagine Co's description: https://www.techalliance.ca/news/events/vibe-coding-for-good-a-collaborative-build-night-reimagine-co-presented-by-greenpill-london-ontario/ (JSON-LD startDate 2026-04-28; page published 2026-04-20).
- Joining in early 2025, ICS, Repair Café, Thing Library: the Q1 2025 post above.
- Removed: the Dev Guild link (no source), the TechAlliance graphic as story image, "Do not extrapolate a broader chapter program ...".

### greenpill-2025-year-in-review and greenpill-2026-thesis (now draft)

- Sources were https://paragraph.com/@greenpill/preview/8QcFgBeASBiEy4QVxmZj and https://paragraph.com/@greenpill/preview/rN8MvIeOa4RGvE8kJN9L. The Greenpill publication page lists three published posts (2024-12-31, 2025-04-30, 2025-11-05) and neither of these. Content left as it was, apart from status, byline and read time.

## Production change set

None. Stories are file-backed and change through this PR.

For `qa-chapters` (Directus, needs Afo's approval, no visible effect today): the Uncommons chapter row (`featuredStorySlugs`) and the `uncommons-publications-learning-series` initiative (`relatedStorySlugs`) point at `greenpill-2025-year-in-review`, which is now a draft. Neither field is rendered, so remove the reference when that row is next edited, or leave it until the post is published.

## Open items and decisions needed

- **Afo:** publish the 2025 Year in Review and the 2026 Thesis on Paragraph when ready; then set both stories back to `published` with the published URLs.
- **Images (decision for Afo):** the contract test requires an image on every published story, and I had no event photos I clearly have the right to use. The two podcast stories use the Greenpill podcast cover already on the site. The Pizza Party, Cape Town, cacao school and London Ontario stories use the site's own green texture (`/images/hifi/topo-bg.png`, the library's default resource image), which reads as a placeholder in the grid. Better: event photos from the stewards, with permission. The alternative, a chapter's existing photo from a different event, looks finished but suggests it shows the event.
- **`qa-brand-shell` (`components/shell/Breadcrumb.astro`):** at container widths of 520 px or less, a first crumb without `href` renders as a `<span>` that never truncates, so it overlaps the next crumb (seen at 375 as "Field repoTech & Sun"). The truncation rule only targets `li:first-child:not(:last-child) a`. Story pages no longer pass a non-link crumb; other pages with non-link crumbs may still overlap.
- **`qa-home-garden` (`pages/index.astro`, `content/home-page.json`):** the home story bento still prints raw category slugs (`Meta items={[story.data.category ...]}`); import `storyCategoryLabel` and `formatStoryDate` from `pages/stories/_story-format.ts`. `home-page.json` `featuredStorySlugs` pins four 2025 stories ahead of everything newer; consider `greenpill-irl-building-a-coordi-nation` and `greenpill-nigeria-tech-and-sun-round`.
- **`qa-brand-shell`:** the story template already set `target="_blank" rel="noopener"` on body list links and source cards; I kept that behavior and added no new hand-set targets. The site-wide external-link rule can replace both.
- **`qa-system-pass`:** the stories pages keep their page-local card classes (`gp-stories-card`, `gp-stories-feature`, `gp-story-continue`, `gp-story-proof-row`) for the card consolidation. The em-dash check should exempt the two draft stories or they need a sweep when republished.
- **Steward review** (no change made): La Ligne Verte's UNDP win, Cape Town's UNICEF Yoma cohort and Artizen total, and the cacao school's figures are each the project's own report, and the copy says so.
