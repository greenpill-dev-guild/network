# Handoff: `qa-brand-shell` (PRD-1415)

Findings 6, 7, 8, 16, 17 and 20 from `reports/2026-11-06-qa-findings.md`, decision D4.

## Changed

Pull request: https://github.com/greenpill-dev-guild/network/pull/39 (branch `claude/awesome-yalow-9e4216`, not merged).

### Background (finding 8, D4)

D4 changed after review. Afo saw the plain option on 2026-11-06 (`artifacts/qa-brand-shell/*-plain-option.jpg`) and asked instead: "Investigate if there's a way to keep the background without the seamed topo tiles." He then approved the fixed illustrated background on screenshots the same day ("Yes, approve"). The seams did not come from the line art. They came from two other layers in `GpLayout.astro`:

1. **The glows were clipped.** Each radial glow was painted in a box smaller than the screen (`76vmax` and `68vmax` squares, centered), but the glow reached past the box edge, so it stopped in a straight line. At a 1910px-wide window the lime glow's box edge falls at x≈229px and the gold one's at x≈1605px, which match the vertical lines in the live screenshot.
2. **The texture tiles had hard edges.** `hifi/topo-bg.png` is a soft gradient (lime corners, grey-green edges), not a seamless pattern. Tiled every `min(1200px, 140vw)`, its grey right edge met its lime left edge, making a faint grid of panels.

The fix keeps the illustrated background on every page except home (which still asks for `plain`):

- the glows now span the whole layer and fade to transparent within a set radius (`circle 27vmax` and `circle 26vmax`), so no edge falls inside the window; their colors are `color-mix()` from `--gp-lime-500` and `--gp-gold-500` instead of raw `rgba()`;
- the tiled texture (`::after`) is gone;
- the line art (`greenpill-bg.png`, 1400×1944) stays. It repeats only down the page, and the fixed layer (window height plus 28%) is shorter than one copy at common sizes, so its own seam never shows;
- the overscan uses `lvh` instead of `vh`; the reduced-motion rule that switched the layer to `position: absolute` is gone, since nothing animates it, and that rule made the line art repeat (and seam) down long pages.

Measured on the Brave screenshots (grey level of 10px-wide samples across the hero): at the old seam the live page jumps 9 levels at 1920 and 1440 (41 to 50) and 6 at 1024 (42 to 48) between neighbouring samples; this branch rises gradually over the same span (46 to 51 at 1440, 46 to 50 at 1024).

### External links (finding 7)

One rule, applied when Astro renders each page (`src/middleware.ts`, logic in `src/lib/external-links.ts`, using Bun's built-in HTMLRewriter; the website scripts already run Astro on Bun, and the module fails the build with a clear message if run without it):

- links to another host (absolute or protocol-relative http(s)) get `target="_blank"`;
- every link that opens in a new tab, whichever code set its target, gets `rel="noopener"` (existing tokens such as `noreferrer` stay) and `aria-describedby="gp-new-tab-hint"`, which points at one hidden `<span id="gp-new-tab-hint" hidden>Opens in a new tab</span>` added before `</body>` on pages that need it;
- same-site links (`greenpill.network`, `www.greenpill.network`, relative paths, fragments, `mailto:`, `tel:`) stay in the same tab; other `*.greenpill.network` hosts (app, agent, hub) count as other sites;
- an author-set `target` wins, so a template can keep an external link in the same tab with `target="_self"`.

The hint is a description rather than part of the link name, following the repo's Modern Web Guidance ("Don't pack descriptions, error messages, or instructions into the label"): names stay equal to the visible text, and screen readers announce "Opens in a new tab" as the link's description. Hand-set `target`/`rel` in other sessions' pages keep working; the rule fills in what they lack.

Links that page scripts build in the browser are created after the rule has run. Codex review on #39 flagged the chapter impact events (`chapters/[slug].astro`, `renderEvents`): they now get the same description, with the hint's id and text passed from `lib/external-links.ts` through `define:vars`, and the script adds the hint element if a page lacks it. The impact panel is off site-wide today (`CHAPTER_IMPACT_UI_ENABLED = false` in `packages/shared`), so this was checked on a local build with the flag on (not committed): with a stubbed impact response, both event links carry `target="_blank"`, `rel="noopener"` and the description, the hint is recreated once when removed, and axe reports 0 violations. HomeMap's runtime links already say "in a new tab" in their `aria-label`, so they are left alone; a site-wide runtime hook would have made screen readers say it twice there.

A second Codex finding: the Garden assessment's "Close second" link copies its `href` from a result panel in the browser, so with Steward as the tied second result it became the external steward-calendar link without the new-tab attributes. `GardenAssessment.astro` now copies `target`, `rel` and `aria-describedby` from the same panel link, which the rule already processed, and removes them when the destination is internal. Checked in Brave on the exported build: three Learn, three Steward and one Local answer gives Steward as the second result with `target="_blank"`, `rel="noopener noreferrer"` and the description; three Learn, three Local and one Build gives `/chapters` with none of them. The test answers were cleared from local storage afterwards.

### Footer (findings 6, 16, 20)

`SiteFooter.astro`, following the July 16 footer spec:

- Network: Chapters, Dev Guild, Writers Guild, Code of Conduct (the May 2024 Regen Hub thread, as Afo chose).
- Get involved: Start in the Garden, Events calendar (Luma), Join the map (was "Add yourself to the map"), Talk to a steward. "Attend an event" pointed at `/chapters`, which "Chapters" already covers.
- Resources: Library, Stories, Podcast (now the Library's podcast section instead of Apple Podcasts).
- Connect: X / Twitter, Farcaster (was Warpcast), Telegram, LinkedIn, YouTube, Regen Hub. Telegram, X and YouTube are read from `content/social-links.json`, so the footer now uses the working invite and will follow the new one when PR #34 changes it.
- The duplicate "Garden" entry under Network is gone ("Start in the Garden" remains).
- Bottom row: "© {build year} Greenpill Network" and "Built in the open on GitHub". The repository is public but has no license file, so it does not say "open source". This branch left the ecoregion credit line to PR #35, which removed it with the layer; after merging `main` on 2026-11-07 the row has these two items, copyright on the left and the GitHub link on the right. It is a wrapping flex row and stacks at 520px and below.

### Brand marks (finding 17, input I3)

Afo pointed to the Figma file "Marketing" (`TVr9MTO5dtH2rlodiA76di`) and approved the result on screenshots on 2026-11-06 ("Yes, approve"). Its decks use the lime topographic 3D capsule and a gold "GREEN PILL" serif wordmark; the X avatar uses the same capsule. The starburst capsule the site used for its header mark, favicon and touch icon is the art from the cover of the book *GreenPilled: How Crypto Can Regenerate The World* (`images/greenpill-cover.png`), which is what the review called book art. Nothing was redrawn; every new file is cut from Figma renders:

- `public/images/brand/greenpill-mark.png` (96×96): the capsule layer (`39:237`, slide "GP-Socials"), trimmed and centered on a transparent square. Used for the header mark at 32px; the old lime drop-shadow filter is gone.
- `public/favicon.ico` (16, 32, 48) and `public/images/brand/greenpill-icon-192.png`: the same capsule.
- `public/apple-touch-icon.png` (180×180): the capsule on `--gp-green-900`, since iOS fills transparent touch icons with black.
- `public/images/brand/greenpill-share.jpg` (1200×630, 70 KB): the "GP-Cover" slide (`2:2`), cropped 36px top and bottom from 1920×1080 to the 1.91:1 card ratio. It replaces `greenpill-twitter-card.png` (the same slide at 3840×2160, 3 MB) as the default share image in `GpLayout.astro` and `content/site-settings.json`.

Old files left in place: `images/greenpill-logo.svg` (the Garden page hero still draws it), `images/greenpill-logo-large.png` and `images/greenpill-twitter-card.png` (no longer referenced by the site; earlier shares may still point at them).

### Shared files and files outside the session's list

- `scripts/data/ui-source-baseline.tsv`: pruned 8 rows whose values this change removed (5 in `GpLayout.astro`, 2 in `SiteFooter.astro`, 1 in `SiteHeader.astro`).
- `scripts/public-content-contract.test.ts`: the "site shell keeps the graphic page background visible" test pinned the footer to the literal `rgba(7, 24, 15, 0)` (a fully transparent background, removed here as a no-op). It now checks the intent: the `.gp-site-footer` rule sets no background. One assertion at line 453; PR #38 edits the same file only at the imports and from line 462 down, so the two merge cleanly.
- New files the rule needs: `packages/website/src/middleware.ts`, `packages/website/src/lib/external-links.ts`, `scripts/external-links.test.ts`. No `package.json` script was added; run the test with `bun test scripts/external-links.test.ts`.
- `packages/website/src/pages/chapters/[slug].astro`: the impact-events script describes its runtime links as opening in a new tab (Codex review fix; no open PR touches this file).
- `packages/website/src/components/page-sections/GardenAssessment.astro` (owned by `qa-assessment`, which has no branch or PR yet): the "Close second" link copies the new-tab attributes along with its `href`, one block in `showResult` (Codex review fix). `qa-assessment` should keep that block when it reworks the results.
- No change to `package.json`, the lockfile, `.github/workflows/**`, `CLAUDE.md`, `AGENTS.md` or `.claude/**`. `social-links.json` and `keystatic.config.ts` are unchanged (PR #34 has not merged).

## Evidence

After merging `main` with #33, #35, #36, #37 and #38 on 2026-11-07 (one conflict, in the footer's bottom row, resolved to the two new items without the ecoregion credit): `bun run typecheck` exit 0, `bun test scripts/external-links.test.ts` 16 pass, `bun run test:content` 39 pass, `bun run agentic:check` exit 0, `bun run build` 50 pages. The built `dist` has 1,994 links on 50 pages; all 738 to other hosts follow the rule, no internal link opens a new tab, and no page shows the ecoregion credit. Brave at 1460: the bottom row shows the copyright left and the GitHub link right, no horizontal overflow.

AGENTS.md pre-PR gate, on the commit before that merge:

- `bun run typecheck`: exit 0.
- `bun test scripts/external-links.test.ts`: 16 pass, 0 fail. A mutation that flips the host check fails 8 of them.
- `bun run test:content`: 33 pass, 0 fail (after the footer assertion change; before it, 32 pass and that 1 failed). The new assertion fails when an opaque background is added to the footer.
- `bun run agentic:check`: exit 0 (guidance retrieved, browser QA policy check passed, plan hubs valid, `ui:check` 0 hard, 0 warn).
- `bun run build`: exit 0, 47 pages.
- `astro check` (`bun run --cwd packages/website check`): 0 errors, 0 warnings, 6 hints in files this PR does not touch.
- `bun run ui:verify`: not run. It cannot render inside the dev machine (no Chrome); the Brave checks below stand in for its layout and axe channels.

External-link rule, audited on the built `dist` (47 pages): 1,838 links, 706 of them to other hosts. All 706 have `target="_blank"`, `rel` containing `noopener`, and `aria-describedby` naming `gp-new-tab-hint`; every page with such links has exactly one hint element; no internal link opens a new tab. Per page: home 22, Library 19, Dev Guild 31, Kenya chapter 17, the RegenMeetUp Rio story 12.

Brave QA (Afo's profile through Claude in Chrome, against the exported build served on the Mac at `http://localhost:3326`; the window was 1910 and later 1190 wide, so other widths are same-origin iframes):

- Background, before and after, at 1920 (Dev Guild), 1440 (Library), 1024 (Chapters) and 375 (Garden): `artifacts/qa-brand-shell/brave-*-textured-before-after.jpg`, plus `brave-1920-dev-guild-textured-zoom.jpg` and the live seam close-up `brave-1910-dev-guild-live-seam-zoom.jpg`. The plain option Afo declined: `brave-*-plain-option.jpg`.
- Footer at 1910 and 375: `brave-1910-footer-after.jpg`, `brave-375-footer-after.jpg`. At 375 there is no horizontal overflow, the columns are 2 × 2, every column link is at least 44px tall, and the bottom row stacks.
- Header mark at 1190 and 375: `brave-1190-header-brand-mark.jpg`, `brave-375-header-brand-mark.jpg`; icons on light and dark tab colors: `brand-icons-preview.png`. All new brand files are served with the right type (`/favicon.ico`, `/apple-touch-icon.png`, `/images/brand/*`), and `og:image` and `twitter:image` resolve to `https://greenpill.network/images/brand/greenpill-share.jpg`.
- axe-core 4.11.4 (from the repo's `node_modules`) on home, Dev Guild, Library, `/chapters/kenya/` and `/stories/regenmeetup-rio/`: 0 violations on each, including `aria-valid-attr-value` for the new `aria-describedby`.

## Sources

Footer link targets, all opened in Brave on 2026-11-06:

| Link | URL | What it showed |
| --- | --- | --- |
| Farcaster | https://farcaster.xyz/~/channel/green-pill | "Greenpill Network Channel on Farcaster", 63 members, 4.3K followers; `warpcast.com/~/channel/green-pill` redirects here |
| X / Twitter | https://twitter.com/greenpillnet (from `social-links.json`) | Redirects to x.com/greenpillnet, "greenpill.network @greenpillnet", 3,322 followers, links greenpill.network |
| Telegram | https://t.me/+g9TM8i7GpxAzMGUx (from `social-links.json`) | "Greenpill.network", 1,037 members; the old footer invite `t.me/+e-aa2Ed3LWVlYjNh` shows a generic join page with no group name |
| LinkedIn | https://www.linkedin.com/company/greenpill-network (from Afo) | "Greenpill Network", Technology, Information and Internet |
| YouTube | https://www.youtube.com/@Green_Pill_Podcast (from `social-links.json`) | "Green Pill", 2.14K subscribers, 322 videos |
| Events calendar | https://luma.com/greenpill-network | "Greenpill Network · Events Calendar", the host of the April 2025 community call; `luma.com/greenpill` is a single 2023 NYC meetup, not the calendar |
| Code of Conduct | https://hub.regencoordination.xyz/t/code-of-conduct/37 | owocki's May 2024 proposal to adopt the Contributor Covenant, 11 posts, last reply June 2024; the thread records no ratification. Linked at Afo's choice |
| Regen Hub | https://hub.regencoordination.xyz | Regen Coordination Hub with a "Greenpill Network" category; `hub.greenpill.network` (in `social-links.json` `hub`) resolves to a Discourse host but does not load |
| Talk to a steward | https://calendar.app.google/gia7UpaSVKwwEKxy5 | Google Calendar booking page "Steward 1:1" |
| Bottom row | https://github.com/greenpill-dev-guild/network | Public repository, no license file |

Brand: Figma "Marketing" (`TVr9MTO5dtH2rlodiA76di`), pages "Greenpill Pitch Deck" (slides GP-Cover `2:2`, GP-Socials `39:72`) and "Greenpill Garden". Web, same day: X @greenpillnet avatar is the same lime capsule; the Farcaster channel avatar is a different 3D capsule render; the LinkedIn company page still shows the book's starburst.

## Open items and decisions needed

- Decided by Afo on 2026-11-06 in this session: keep the illustrated background with the seams fixed (D4 as amended), use the Figma brand marks, LinkedIn `https://www.linkedin.com/company/greenpill-network`, and link the 2024 Regen Hub Code of Conduct thread.
- After deploy: repeat the 1920 seam check on greenpill.network (the hub's `qa-system-pass` item), and check a share preview of the home page (X or Telegram) picks up the new card.
- After PR #34 merges: rebase, then move the footer's literal links into `content/social-links.json` (rename `warpcast` to `farcaster` with the farcaster.xyz URL, add LinkedIn, Luma and the Code of Conduct) with matching `socialLinks` fields in `keystatic.config.ts`. Keep the footer's Regen Hub link working (hub `plan.todo.md`, commit 4a53b88): before the footer reads `hub`, set it to `https://hub.regencoordination.xyz`, since `hub.greenpill.network` does not load; otherwise keep the footer's literal Hub link. Open the link in Brave and confirm it loads before pushing.
- For the owners of those files (requests, not changes made here):
  - `qa-home-garden`: `home-page.json` `media.image` (twice) points at `/images/hifi/pill-3d.png`, which does not exist; `/images/brand/greenpill-mark.png` is the brand-kit capsule if a mark is wanted there. The Garden hero still draws the book starburst (`garden/index.astro:81`).
  - `qa-system-pass`: the hand-set `target`/`rel` in `index.astro`, `garden/index.astro`, `library/index.astro`, `stories/[slug].astro`, `chapters/[slug].astro`, `guilds/[slug].astro` and `GardenAssessment.astro` are now redundant and can go when those files are next touched. The runtime links in `chapters/[slug].astro` and HomeMap still set their own `target` and `rel`, since the rule never sees them.
  - LinkedIn's company logo is still the book starburst; updating it is outside the repo.
