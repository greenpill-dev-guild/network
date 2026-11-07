# Handoff: `qa-library` (PRD-1413)

Findings 10, 11 and 12 from `reports/2026-11-06-qa-findings.md`.

## Changed

Pull request: https://github.com/greenpill-dev-guild/network/pull/38 (not merged)

- **Book dialog (finding 10).** Each book on `/library` opens a native `<dialog>` (`components/page-sections/BookDialog.astro`): a larger cover (302px wide at 1440, against 213px on the shelf), the description, "Read the PDF" (or "Read in English" when translations exist) and "Download PDF (45 MB)" with the real file size, every translation as a chip, and every `formats` link with its destination ("Softcover (blurb.com)", "Comic 2 (PDF, 6.6 MB)").
  - The cover is still a plain link to the English PDF. A script adds `aria-haspopup="dialog"` and turns a plain click into `showModal()`; without JavaScript, or with Cmd, Ctrl, Shift or Alt held, the link opens the PDF.
  - Esc closes it, `closedby="any"` closes it on a backdrop click (with a fallback for Safari), the Close button closes it, and focus returns to the cover each time. The page behind does not scroll while it is open.
  - The dialog is named by the book title (`aria-labelledby`) and described by its description (`aria-describedby`); groups are `h3` under the `h2` title.
  - No `target="_blank"` added (spec rule 10). Book links never had one in effect; the GreenSci guild card keeps its existing hand-set one until `qa-brand-shell`'s site-wide rule replaces it.
- **Store and edition links.** Every link was opened (Sources). Four Blurb pages now redirect to Blurb's generic bookstore; Blurb relisted the same books under new ids, so Grassroots Economics, Exploring MycoFi and both Onchain Capital Allocation volumes point at the live listings. `mycofi.art` now redirects to `mycofi.earth`, the book's own site (read and buy, no mint), so MycoFi's "Mint" link is now "Website".
- **Podcast (finding 11).**
  - `.github/workflows/github-pages.yml` (security-sensitive): one new step, "Refresh podcast feed snapshot", runs `bun --no-env-file scripts/podcast-feed-snapshot.ts` before "Build website" on every push, hourly schedule and dispatch. It has `continue-on-error: true` and `timeout-minutes: 2`. No new actions, secrets or permissions.
  - `scripts/podcast-feed-snapshot.ts`: 30 second fetch timeout, writes through a `.tmp` file and renames, and logs the newest and oldest item dates. On any failure it exits 1 and leaves the committed snapshot untouched, so the build uses that file. The run's conclusion stays `success`, which is what the publish-health watchdog reads (`content-operations.ts:367`), so a feed outage does not alert.
  - **Episode count field for the home tile: `episodeCount` in `packages/website/src/data/podcast-feed-snapshot.json`.** The Library hero and the podcast overline read it. I told `qa-home-garden`.
  - `podcast.json`: `title` "The Greenpill Podcast" (July copy), `secondaryDescription` "A long-running public archive. Every episode is free to stream or watch." (no em dash).
  - Players: each episode's `<audio>` is named by its episode title, the "Notes" links carry the title for screen readers, and the episode list is a named `ul` (it was a `div` with `aria-label`).
- **Knowledge Garden and inactive protocols (finding 12).** The "Knowledge Garden · Living guides" block is gone, with its three cards (Garden Season One, Regen Protocols, Enter the Garden), their CSS and `library.json`'s `gardenCard` (and its Keystatic field). Both guides belong to Garden Season One, whose protocol targets ran to the end of Q1 2026; their resource files are set to `archived` (kept, not deleted). The hero's "Garden guides" stat became "Translations" (15, counted from the book files).
- **Guilds.** The cards sit in `<section id="guilds">`, the anchor guild breadcrumbs link to (`qa-guilds`' request). The footer reads "Visit guild" instead of counting proof signals, which `qa-guilds`' change set clears. GreenSci stays listed: Afo answered I4 "Keep it listed" on 2026-11-06.
- **Content accuracy.**
  - Onchain Impact Networks no longer copies the Impact DAOs description; the new one follows its PDF's front matter.
  - Cover alt text fixed ("Comic Know book cover" and similar).
  - The Web3 Tooling Series resource pointed at an unpublished Paragraph draft; it now links the published series on carboncopy.news with its byline and dates (verified after `qa-guilds` flagged it).
  - The podcast resource drops its hard-coded 296 and its Writers Guild link (finding 15).
  - No em dashes or internal source codes ("Source S071") left in the files touched.

Files outside my list, and why:

- `scripts/public-content-contract.test.ts`: it pinned `episodeCount` to 296 and required the Garden block, so the gate could not pass without an edit. The podcast assertions now check the snapshot's shape and that the page reads `podcastFeed.episodeCount`; three new tests cover the `id="guilds"` anchor and the missing Garden block, every book file path (cover, English PDF, translations, site-hosted formats), and the workflow's non-blocking refresh step.
- `scripts/data/ui-source-baseline.tsv`: pruned 16 `library/index.astro` rows (5 for the book card CSS now on tokens, 11 for the removed Garden CSS). No rows added; the pruned rows stay clear of the lines PR #34 edits.
- `packages/website/keystatic.config.ts`: library block only (`gardenCard` removed).

No change to `package.json`, the lockfile, `CLAUDE.md`, `AGENTS.md` or `.claude/**`.

## Evidence

AGENTS.md pre-PR gate, run on this branch after the last code change:

- `bun run typecheck`: exit 0, no diagnostics.
- `bun run test:content`: all pass (36 in this branch's file; see the note on the extra copy below).
- `bun run agentic:check`: exit 0. Guidance retrieved; "Authenticated browser QA policy check passed for 3 guidance file(s)"; "Validated 11 plan hub(s)"; `ui:check` 0 hard, 0 warn.
- `bun run build:website`: exit 0, 47 pages.

Other commands (`bun` runs inside the dev machine):

- `bun install --frozen-lockfile`: no changes.
- `bun run agentic:guidance`, plus `modern-web-guidance` retrievals for `light-dismiss-a-dialog` and `declarative-dialog-popover-control` before the dialog work.
- `bun run ui:check`: 0 hard, 0 warn.
- `bun run --cwd packages/website check` (astro check): 0 errors, 0 warnings, 6 hints, none in files this PR touches.
- `bun run test:content` reports 69 tests across 2 files: `bun test`'s path filter also picks up `tmp/pr26-review/scripts/public-content-contract.test.ts`, a git-ignored October copy in this worktree. Mine has 36 (33 before plus 3 new), all passing.
- `bun --no-env-file scripts/podcast-feed-snapshot.ts` inside the dev machine: exit 1, "Unable to connect" (the machine has no outbound network), snapshot file untouched and no `.tmp` left. That is the fallback path working.
- `bun run ui:verify`: **not run** (spec rule 3; no Chrome in the dev machine). axe-core 4.11.4 from the repo's `node_modules` was run in Brave instead (below).

Brave QA (Afo's profile through Claude in Chrome), on the built site exported with `dm-export` and served at `http://localhost:3323`. The window is 1430px wide and ignores resizing, so 375 and 1024 are the page inside same-origin iframes of that width.

- 1430: hero stats 13 Books, 296 Podcast episodes (the committed snapshot; production builds will show the feed's count), 15 Translations, 3 Guilds. Shelf unchanged, 5 per row. Opened Greenpill v0 with Enter on its focused cover: the URL stayed `/library/`, focus moved to Close, the page behind stopped scrolling. Esc closed it and focus returned to the cover. Opened MycoFi with a mouse click; a backdrop click closed it, focus back on the cover. Comics opened and closed with its Close button, focus back. A Cmd-click is not intercepted (the page leaves the default action alone); a plain click is.
- 1024: no horizontal overflow; dialog 880px, two columns (320px cover column); the Comics dialog lists Comic 2 to 7 with their sizes.
- 375: no horizontal overflow (scroll width 375); the shelf is a horizontal rail. Dialog 343px wide, one column, cover 220px (rail covers are 168px), "Read in English" full width 309 x 48, Close 91 x 44, Download 150 x 44, format links 44px tall. Translation chips are 30px in the iframe (mouse pointer); `Chip` raises them to 44px on touch screens. The Close bar stays pinned while the dialog scrolls.
- Accessible names (computed from the DOM: name from content, minus `aria-hidden`): dialog "Greenpill v0", description set; cover link "Greenpill v0 11 translations"; links "Read in English", "Download PDF (45 MB)", "Chinese" … "Turkish", "Softcover (blurb.com)", "Hardcover (blurb.com)", "Audiobook (youtube.com)"; button "Close".
- axe-core in Brave on `/library/` at 1430: 0 violations with every dialog closed, and 0 violations with the Greenpill v0 dialog open. "Needs review" only: color contrast on text over the page's textured background, and inside the open dialog, where axe cannot read backgrounds through the top layer ("overlapped by another element"). Computed from the tokens instead: lime links #B8E835 on the dialog surface #143F30 are about 8.2:1, muted text #E8E2D4 about 9.1:1. A first run also flagged `aria-controls` on the 13 cover links as unverifiable next to `aria-haspopup`; `aria-controls` was dropped and the item is gone.
- Players: all four `<audio>` elements played (muted) and advanced 2.5 seconds, no media errors, on the committed snapshot's episodes. The newest episodes arrive with the first production build after merge.
- The live site serves every book PDF: 34 HEAD requests from `https://greenpill.network/library/` returned `200 application/pdf`, sizes matching the repo files byte for byte.

## Sources

All opened on 2026-11-06 in Brave.

Podcast:

- Feed `https://rss.libsyn.com/shows/400481/destinations/3304589.xml`: 300 items; oldest "Announcing the GREEN PILL Podcast" (2022-02-16), newest "Greenpill IRL: Building a Coordi-Nation with Kevin Owocki, Matt & Afolabi" (2026-11-05); `lastBuildDate` 2026-11-06T20:40:53Z. The oldest item being the first one means the feed is not truncated today.

Store and edition links (status as opened):

- Ethereum Localism website `https://www.ethereumlocalism.xyz`: 200, "Ethereum Localism".
- Future History softcover `https://www.blurb.com/b/11120683-future-history-of-the-open-internet`: live, $21.00.
- Greenpill v0 softcover (invited link): live, "GreenPilled: Regenerative CryptoEconomics by Kevin Owocki", $36.33. Hardcover `https://www.blurb.com/b/11078160-greenpilled-regenerative-cryptoeconomics`: live, ImageWrap hardcover, $69.42. Audiobook `https://www.youtube.com/watch?v=7m0ufzqju_4`: "[Audiobook] GreenPilled: How Crypto Can Regenerate The World", channel Green Pill.
- Impact DAOs softcover `https://www.blurb.com/b/11120667-impactdaos`: live, $36.33.
- Pathways to Regeneration (invited link): live, "by Scott Morris, S DeMeulenaere", $29.00.
- Stuff Crypto OGs Know `https://www.blurb.com/b/11476889-stuff-crypto-ogs-know`: live, $23.00.
- **Broken, replaced:** `https://www.blurb.com/b/12458854-grassroots-economics`, `…/12458839-exploring-mycofi`, `…/12458858-onchain-capital-allocation-handbook-volume-1` and `…/12458862-onchain-capital-allocation-handbook-volume-2-expl` all redirect to `https://www.blurb.com/bookstore`. Blurb's site search lists the relisted books, each opened: `https://www.blurb.com/b/12470739-grassroots-economics` (William O. Ruddick, "Reflections & Practice", softcover $18.99), `https://www.blurb.com/b/12470732-exploring-mycofi` (Jeff Emmett, Jessica Zartler, $18.99), `https://www.blurb.com/b/12470744-onchain-capital-allocation-handbook-volume-1` and `…/12470750-onchain-capital-allocation-handbook-volume-2` (Kevin Owocki, $23.99 each). Same authors as the "Allo.Capital … sponsor" credits page inside the PDFs. A second Grassroots Economics listing exists (`/b/12316593`, $22.22, different ISBN); I used the one from the same relisting batch.
- **Moved, relabeled:** `https://mycofi.art/` redirects to `https://mycofi.earth/`, titled "Exploring MycoFi: Mycelial Design Patterns for Web3 & Beyond", with "Read the Book", "Buy the Book" and "Shop"; no mint.

Book details:

- Onchain Impact Networks (`/pdf/onchain-impact-networks.pdf`, created 2024-08-05): cover "Revised Edition of IMPACTDAOs"; "On-Chain Impact Networks is V2 of ImpactDAOs … published in April 2022"; "written, published, and designed by the GreenPill Networks writer's guild"; subtitle "How Crypto Is Being Used To Regenerate The World".
- Comics cover (`/images/comic.png`): "Gitcoin Comics, Issue 1, Ethereum for Public Goods: ETHbot Begins … Ethereum vs the Scourge of Moloch".
- Other descriptions were kept; they match their PDFs' front matter where `pdftotext` could read it. Greenpill v0, Impact DAOs, Future History, Stuff Crypto OGs Know and the comics are image-only PDFs, so their descriptions were not text-checked.

Guides and protocols:

- Regen Protocols, `https://hub.regencoordination.xyz/t/regen-protocols/364` (afo, November 2025): four protocols supporting Garden Season One (Greenpill IRL, Regen Reservoir, Public Goods Staking, Greenpill Impact Framework), "Success Metrics … over the next 4 months till the end of Q1 2026".
- Garden Season One, `https://hub.regencoordination.xyz/t/greenpill-garden-season-one/363`: opened 2025-11-12, last post 2026-02-11 (a workshop progress update). The Hub's newest-first search for "garden" shows no later Garden season thread.

GreenSci (I4):

- `https://greensci.pages.dev/`: 200, "GreenSci: Local DeSci for Local Futures · Greenpill Network", "Back on Artizen", "10 funded projects", "10 chapters". The live agent snapshot (`https://agent.greenpill.network/content/public-snapshot`, generated 2026-11-07T00:25Z) links the GreenSci guild there. Afo: keep it listed.

Web3 Tooling Series:

- `https://paragraph.com/@greenpill/preview/rN8MvIeOa4RGvE8kJN9L` is an unpublished draft, "The Road Ahead: Governance, Gardens, and the 2026 Vision", with an editorial placeholder note.
- `https://carboncopy.news/content/web3-tooling-series`: "Understanding Web3 Tooling Challenges for ReFi Communities … A joint initiative by CARBON Copy and Greenpill Network Writers Guild"; three parts. `/the-data`: "By Greenpill Writers Guild | January 26th, 2026"; `/the-recommendation`: "February 9th, 2026".

## Production change set

None. Everything here is file-backed editorial content; nothing was written to Directus, the database or any other production service.

## Open items and decisions needed

1. **Committed podcast fallback is still the June snapshot (296 episodes, newest 2026-04-27).** The dev machine has no outbound network, and the browser tool blocks returning the feed's audio URLs (they carry a query string), so I could not regenerate it here. Production is unaffected: every build refreshes it first. To refresh the fallback, run `bun --no-env-file scripts/podcast-feed-snapshot.ts` on a machine with network access and commit the file.
2. **Libsyn may cap the feed at 300 items.** Today's 300 include the very first item, so the count is complete. If the count stays at 300 while new episodes appear, the feed is truncating and the oldest item will no longer be from February 2022.
3. **Pages schedule.** GitHub drops many top-of-hour cron runs (the `0 * * * *` schedule fired about four times a day in October), and the podcast refresh rides on that schedule. Moving the cron off minute 0 would help both; that line is outside my step of `github-pages.yml`.
4. **Feed titles carry their own em dashes** (for example the "Economic Media" episode of 2026-11-03). They render verbatim from the feed. `qa-system-pass`'s em-dash check should skip `podcast-feed-snapshot.json`, or the team accepts quoted titles as they are.
5. **For `qa-brand-shell`:** the dialog's external links (Blurb, YouTube, ethereumlocalism.xyz, mycofi.earth) rely on your site-wide rule to open in a new tab; the GreenSci guild card still has a hand-set `target="_blank"` that your rule should replace.
6. **For `qa-system-pass` or the hub:** `packages/website/DESIGN.md`'s Library row in the reflow matrix still describes a Knowledge Garden grid. The guild cards keep their existing CSS (including a hover lift that `DESIGN.md` forbids); that is part of your card pass.
7. **Left as they are, say if you want them archived:** the Dev Guild protocol articles in `content/resources/` (Public Goods Staking Protocol v0, Squad Staking, GreenWill and others). Nothing on the site renders them.
8. **Optional:** book `author` and `publishYear` are empty in every book file. The PDFs' credits pages name authors for MycoFi, Grassroots Economics and both Onchain Capital Allocation volumes; adding them would show a byline in the dialog and on the shelf.
