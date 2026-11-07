# Handoff: `qa-home-garden` (PRD-1410)

Findings 2, 3, 5, 6 and 20 from `reports/2026-11-06-qa-findings.md`.

## Changed

Pull request: https://github.com/greenpill-dev-guild/network/pull/34 (not merged)

- **Subscribe (finding 5).** The Garden's step 1 CTA is now `/garden#step-1`, so the home ramp's Subscribe card opens the Garden signup form (clicked in Brave: it lands on `/garden/#step-1` with the email field in view). On `/garden` the step still renders the form itself.
- **Telegram (finding 6).** Home and Garden take the invite from `content/social-links.json` (`telegram`). The Telegram step's own `cta.href` in `garden.json` is empty, and so is the unused `telegramPreview` copy. The Garden page's fallback step list, which held a third copy, is gone. This also repairs the buttons today: the `social-links.json` invite (`t.me/+g9TM…`) opens the "Greenpill.network" group (1,037 members on 2026-11-06), while the old hard-coded one (`t.me/+e-aa…`) opens a generic t.me page with no group name, which suggests it was revoked. The footer still uses the old one (see requests below).
- **Commons bento (finding 2).** The "Knowledge map · In design" and "Open the toolkit" tiles are removed. The grid is two rows: books on the left spanning both, podcast over the guild pair on the right. At 1440 the heights match (books 609px; podcast 322px, 20px gap, guild pair 267px). The dek no longer mentions field guides, since no guide tile remains.
- **Ecosystem (finding 3).** Two labeled rows read from `home-page.json` (`ecosystem.partners`, `ecosystem.tools`), each tile linking to the organization's own site. Partners and collaborators: Regen Coordination, ReFi DAO, Bloom Network, Bread Cooperative, Gitcoin, Artizen, VDAO, Network Nations, JournoDAO. Tools we build with: Gardens, Hypercerts, Karma. Every entry has a public source from 2025 or 2026 (below). Octant and Giveth were dropped (latest sourced joint activity is 2024); Bloom Network and Artizen are new. The page skips any entry without a name or an `https://` link.
- **Ramp labels (finding 20).** "Lowest friction" to "Highest friction" become Start light, Listen first, Find your fit, When you're ready. All four cards stay (D1). Card 03 is reworded and shorter, so the home card's four-line clamp no longer cuts it mid-sentence.
- **Em dashes.** None left in copy these files render: the commons dek, the ecosystem dek, and Garden steps 2 and 3.

Shared files touched, per the hub's "Shared files" rules:

- `packages/website/keystatic.config.ts`: the `homePage` block gains an `ecosystem` object, plus one helper (`ecosystemEntriesField`) placed after the Garden's `previewCardField`. Keystatic rejects keys its schema does not define (`Key on object value "…" is not allowed`, `@keystatic/core` 0.5.50 `parseProps`), so without it the Home Page editor would not load. The editor also requires an `https://` site address.
- `scripts/data/ui-source-baseline.tsv`: pruned the four `index.astro` rows that belonged to the removed tiles (two `rgba` values on the "In design" tile, the pill's border and its `font-size: 10px`). The other `font-size: 10px` row still covers the book captions.

No change to `package.json`, the lockfile, `.github/workflows/**`, `CLAUDE.md`, `AGENTS.md` or `.claude/**`.

## Evidence

AGENTS.md pre-PR gate, rerun on commit `7c6f552`:

- `bun run typecheck`: exit 0, no diagnostics.
- `bun run test:content`: 33 pass, 0 fail.
- `bun run agentic:check`: exit 0. Guidance retrieved; "Authenticated browser QA policy check passed for 3 guidance file(s)"; 11 plan hubs valid; `ui:check` 0 hard, 0 warn.
- `bun run build`: exit 0, 47 pages.

Other commands (run in this worktree; `bun` runs inside the dev machine):

- `bun install --frozen-lockfile`: 1362 packages, no lockfile change.
- `bun run agentic:guidance`: read before the UI work (lists for repeated content, `role="list"` on flex lists for Safari, sequential headings).
- `bun run ui:check`: 0 hard, 0 warn.
- `bun run test:content`: 33 pass, 0 fail.
- `bun run --cwd packages/website check` (astro check): 0 errors, 0 warnings; 6 hints, none in files this PR touches.
- `bun run build:website`: 47 pages built.
- `bun run plans:validate`: 11 hubs valid.
- `bun run ui:verify / /garden`: **not run** (spec rule 3). The build ran, then every rendering check was skipped: "No Chrome/Chromium binary found". The dev machine (linux/arm64) has no Chrome, Chromium or Playwright browser, and installing one needs Afo's OK. The Brave checks below cover its layout and accessibility channels by hand, but not axe.
- `fly secrets list -a network-agent`: names only (see D3).

Brave QA (Afo's profile through Claude in Chrome, `Browser 1`), against the built site exported with `dm-export` and served on the Mac at `http://localhost:3321`:

- Brave's window is maximized here and ignores resize requests, so 1440 is the window itself (1460px wide) and 375 and 1024 are the page inside a same-origin iframe of that width.
- 1440: commons bento balanced as above. Ramp shows the four new labels; links go to `/garden#step-1`, the `social-links.json` invite, `/garden#assessment` and the steward calendar. Ecosystem: partners 5 + 4, tools 3, no blurb cut off.
- 1024: no horizontal overflow (scroll width 1024). Ramp 2 x 2; bento stacked; ecosystem partners 3 + 3 + 3, tools 3.
- 375: no horizontal overflow on `/` or `/garden` (scroll width 375). Ecosystem tiles full width, no blurb cut off; ramp cards and guild tiles stack; ramp buttons full width; the Garden signup form stacks. The only elements wider than the viewport are HomeMap legend items, which belong to the map sessions.
- Accessibility spot checks on `/`: one `main`; no links or buttons without an accessible name; no images without `alt`; ecosystem rows are `h3` headings under the section `h2`, each over a `ul role="list"`; row labels are #E8E2D4 on #0A2D21. The one heading skip ("Map list", an h3 after the h1) is inside HomeMap.

## Sources

All opened on 2026-11-06, in Brave unless marked "subagent". The bar for "current": a sourced joint activity in 2025 or 2026; podcast interviews alone do not count.

Partners and collaborators:

- **Regen Coordination** (`https://hub.regencoordination.xyz/`; `regencoordination.xyz` redirects there). "Regen Coordination: Governance & Structure for the Rest of 2026", hub post from October 2026 (ratification set for 18 September 2026): "Member orgs are Greenpill, ReFi DAO and Bloom." https://hub.regencoordination.xyz/t/regen-coordination-governance-structure-for-the-rest-of-2026/472
- **ReFi DAO** (`https://refidao.com/`, "a network society focused on … the Regenerative Finance ecosystem"). Same post: a member org alongside Greenpill. Subagent also found the September 2025 structure proposal naming ReFi DAO and Greenpill Network founding Leading Organizations: https://hub.regencoordination.xyz/t/proposal-regen-coordination-network-structure-roles/352
- **Bloom Network** (`https://bloomnetwork.earth/`, "a member-run social network that helps local communities collaborate and share resources"). Same post: a member org alongside Greenpill. Not on the July list.
- **Bread Cooperative** (`https://bread.coop/`, "a worker collective building technology"). Same post: "Bread Co-op is our other active partner." Greenpill's own Paragraph post, November 5, 2025, announces Regen Coordination joining the Bread Solidarity Fund: https://paragraph.com/@greenpill/celebrating-evolution-and-alignment-bread-cooperative-regen-coordination. The tie runs through Regen Coordination, as the blurb says.
- **Gitcoin** (`https://gitcoin.co/`; `www` redirects). Greenpill's "Greenpill Q1 2025: Laying The Groundwork", April 30, 2025, has a "Greenpill Gitcoin Rounds" section on community-led Gitcoin rounds across the network during GG23: https://paragraph.com/@greenpill/q1-2025-laying-the-groundwork. Gitcoin's own homepage links "Greenpill Podcast" to greenpill.network and lists the case study "GreenPill Hypercerts Experiment — Impact Certificates in Practice".
- **Artizen** (`https://artizen.fund/`). Hub post, September 6, 2026: congratulations to "30+ project leads and organizers" on Season 6 of the Greenpill Fund for Regenerative Gatherings, title "… participants on Artizen season 6": https://hub.regencoordination.xyz/t/welcome-greenpill-fund-for-regenerative-gatherings-participants-on-artizen-season-6-submit-your-impact-reports-here/464. Not on the July list. Brave is signed in to Artizen, so I did not see the public homepage; the domain matches the podcast episode "Artizen.Fund w Rene Pinnell" (2024-05-28).
- **VDAO** (`https://www.youtube.com/@joinvdao`, page title "V DAO - YouTube"). Greenpill podcast feed (https://rss.libsyn.com/shows/400481/destinations/3304589.xml): 13 items from "Introducing VDAO: Building Antifragile Network States" (2025-11-03) to "VDAO Ep 12" (2026-04-27). The show notes link `vdao.org`, which now redirects to an unrelated GitHub repository (a video-downloader script), so the tile links VDAO's YouTube channel instead.
- **Network Nations** (`https://networknations.network/`, "A global alliance building self-sovereign communities in the network age"; the site has a "Greenpill Podcast Transcripts" section). Feed: 15 episodes, "Network Nations Ep:1" (2025-10-24) to "NN Ep:15" (2026-02-06).
- **JournoDAO** (`https://journodao.xyz/`, "a professional network and incubator working at the intersection of Web3 and traditional media and news"). Feed: Season 9, four episodes with `itunes:author` JournoDAO, 2025-07-02 to 2025-07-23.

Tools we build with:

- **Gardens** (`https://www.gardens.fund/`; `gardens.fund` redirects). `https://app.gardens.fund/gardens` lists Greenpill communities, for example Greenpill Gov Guild (55 members, 3 pools) and Greenpill Brasil (27 members, 6 pools). The Q1 2025 post describes a Gardens-powered treasury round and the "Gardens Network Funding Pool".
- **Hypercerts** (`https://hypercerts.org/`). Hypercert "Greenpill Nigeria-Project Water Cup Mapping" on Celo, work dated June 30 to July 13, 2025: https://app.hypercerts.org/hypercerts/42220-0x16bA53B74c234C870c61EFC04cD418B8f2865959-86091438830997431256233775680237357498368. Subagent also found a Dev Guild Karma update "Milestone 2 – Hypercerts Integration" dated May 31, 2026.
- **Karma** (`https://www.karmahq.org/`; `gap.karmahq.xyz` and `karmahq.xyz` redirect there, and the site now calls the product "Karma", not "Karma GAP"). https://www.karmahq.org/project/greenpill-brasil lists GreenPill Brasil grants (GG20 Climate Round, Local Grant Programs Round 01) and updates dated April 2025. The Q1 2025 post says new chapters were trained on "Karma GAP for impact tracking".

Dropped or not added (decision for Afo):

- **Octant.** Real, but the latest sourced joint activity is 2024: the "GreenPill x Octant Community Round" (March 2024, per a Gitcoin governance forum post the subagent opened: https://gov.gitcoin.co/t/gg21-community-round-proposal-regen-coordi-nation/19114) and Octant funding for the Dev Guild (Crypto Altruists "Trailblazers of Octant Episode 4", 2024-12-28, subagent). Octant's app loads (Epoch 13) with no Greenpill project visible. Re-add with a past-tense blurb, or point me to a current tie.
- **Giveth.** GreenPill Phangan's verified Giveth project raised $1,867.07 from 11 contributors, with donations dated February to July 2024 (https://www.giveth.io/project/greenpill-phangan); GreenSofa's project page shows no dated donations. The podcast hosted Giveth's co-founder in 2026, which is coverage, not a joint activity.
- Seen, not added: Celo Public Goods (the 2026 Regen Coordination post says "CeloPG removed"), Regen Commons (a Regen Coordination partner, not a Greenpill tie), Carbon Copy (a Writers Guild tie; `qa-guilds` territory). Grassroots Economics and Sarafu: not checked.

## Production change set

None. Nothing was written to production, and no signup was submitted.

## Open items and decisions needed

### I1: Telegram invite (for Afo)

Please create a new invite link for the Greenpill.network group with "Request admin approval" turned on, revoke the old links, and send me the new one. I will put it in `social-links.json` (`telegram`) in this PR. The live invite today is `t.me/+g9TM…` (a plain join link). Once approval is on, I suggest step 2's copy says so: "Ask to join the shared Greenpill chat. An admin approves new members to keep out spam. Lurk as long as you like."

### D3: newsletter (for Afo)

What production has today (read-only checks, 2026-11-06):

- `fly secrets list -a network-agent` lists `RESEND_API_KEY` (the key the map and content-review emails also read), but neither `RESEND_NEWSLETTER_SEGMENT_ID` nor `RESEND_NEWSLETTER_TOPIC_ID`. A signup therefore creates a Resend contact with no segment or topic attached (`packages/agent/src/newsletter.ts`, `buildContactPayload` adds them only when the ids are set). Whether the key may create contacts at all is untested; if it is a sending-only key, the form shows "Subscription is unavailable right now."
- Greenpill's Paragraph publication (`paragraph.com/@greenpill`) shows 400+ subscribers and 3 published posts: "Greenpill 2024: A Year in Review" (December 31, 2024), "Greenpill Q1 2025: Laying The Groundwork" (April 30, 2025) and the Bread Cooperative post (November 5, 2025). The 2025 year in review and the 2026 thesis exist only as unpublished `/preview/` links. Nothing has gone to those subscribers for a year.
- No other Greenpill Network newsletter with a 2025 or 2026 issue was found (subagent: `greenpill.substack.com` is Kevin Owocki's "Green Pill" episode posts, newest March 7, 2023; Mirror and Beehiiv not checked).

Question for Afo: does anyone send, or plan to send, a Greenpill newsletter? The card promises "An occasional public digest with chapter updates, new resources, podcast highlights, and upcoming calls."

| Option | What changes | Cost and risk |
| --- | --- | --- |
| A. Keep the Resend form | Create a segment (and a topic, for unsubscribe preferences) in Resend, set `RESEND_NEWSLETTER_SEGMENT_ID` / `RESEND_NEWSLETTER_TOPIC_ID` on `network-agent` (a production write), confirm the key can create contacts, then one test signup with an address Afo chooses. | Someone has to write and send issues from Resend, and the list starts at zero. |
| B. Use Paragraph (recommended if someone will post) | Step 1 links to `https://paragraph.com/@greenpill` ("Subscribe on Paragraph"), and the card says what subscribers get: Greenpill's posts by email. Paragraph lists newsletters and email among the channels it ships. The Resend route stays in the agent, unused. | No secrets or new tools, and 400+ people already subscribe. Subscribers live on Paragraph, and they hear from Greenpill only when someone publishes there. I have not clicked Subscribe to see whether it asks for an email or a wallet. |
| C. Remove Subscribe for now | Drop step 1 from the ramp (home and `/garden`), leaving three steps; bring it back when a newsletter exists. | Honest, but loses the lightest way in. |

Recommendation: B, with the card reworded to match what Paragraph sends, if Afo or a steward will publish there again (the 2025 review and 2026 thesis drafts are ready candidates). If nobody will, C. A makes sense only with a named owner and a sending rhythm.

### Requests to other sessions

- **`qa-brand-shell`:** `SiteFooter.astro:34` still hard-codes `t.me/+e-aa2Ed3LWVlYjNh`, which looks revoked; please read `social-links.json` `telegram`. The ecosystem tiles (`index.astro`) and the Garden step buttons (`garden/index.astro`) still carry their existing hand-set `target="_blank"` and `rel`; your site-wide rule can replace them.
- **`qa-library`:** `podcast.json` `title` is "Learn > Podcast", and the home podcast tile is its only reader, so the tile's heading reads "Learn > Podcast". July's copy is "The Greenpill Podcast". `secondaryDescription` (also shown only on the home tile) has an em dash. The home tile's "296 episodes" comes from `home-page.json` `proofSignals`; the feed has 300 items today. If you derive the count from the feed snapshot, tell me the field and I will point the home tile at it, or change `index.astro:46-47` in your PR.
- **`qa-chapters`, `qa-guilds`, `qa-stories`:** `checker.gitcoin.co` no longer resolves (DNS failure in Brave on 2026-11-06). It is linked from the Kenya and Brasil chapter seeds, the Grant Ships project seed, the Brasil GG20 story and the committed snapshot.
- **`qa-assessment`:** an option label in `GardenAssessment.astro` has an em dash ("Understanding the ideas — regen, public goods, coordination").
- **Map sessions:** at 375 the HomeMap legend items are wider than the viewport, and HomeMap's "Map list" heading is an h3 directly under the page h1.

### Not done here

- No new Telegram link yet (needs I1).
- D3 is open; Subscribe still points at the Resend form.
- `ui:verify` not run: it cannot render in the dev machine (no browser), so axe-core did not run.
- Suggested follow-up, not in this scope: the `/garden` step body runs about 1,100px wide at 1440 (September audit, line length); a `max-inline-size: 65ch` on step copy would fix it.
