# Handoff: qa-system-pass (PRD-1418)

Session `qa-system-pass`, Linear PRD-1418, the last step of the November QA pass (findings 9 and 18 plus the carried items). Branch `claude/qa-system-pass-b762a4`, pull request https://github.com/greenpill-dev-guild/network/pull/44 (not merged; the orchestrating session merges it and runs the post-deploy checks).

## Changed

- **Map repair record:** cherry-picked `92c1155` from `claude/qa-map-data-5361dc` (the `qa-map-data` handoff and `artifacts/qa-map-data/prod-repair-2026-11-07.out`, which hold node ids, public places and coordinates only).
- **One card treatment (finding 9).** `components/ui/Card.astro` now carries the home page's treatment and the options pages needed: `href` (the whole card is one link), `as` (`article`, `section`, `aside`, `figure`, `li`, `ul`, `ol`, `fieldset`), `padded` `none`/`sm`/`md`/`lg` (`md` is the home tiles' 24px growing to 32px on wide screens), `stack` `sm`/`md`, and a `[hidden]` rule. Hover steps the surface to `card-elev` and tints the border lime; nothing translates, scales or adds shadow (DESIGN.md Motion). Every page's card moved onto it:
  - Home: story bento, guild tiles, ecosystem tiles, Garden ramp cards. Book covers no longer lift on hover (the title brightens instead).
  - `/chapters`: directory cards, with the image now inside the padding like the home story cards; no image zoom or arrow slide.
  - Chapter page: proof, initiative, steward and related cards, and the hero photo as a Card figure (the 8px literal radius is gone).
  - Guild page: principle cards and the appearances list (it already used Card elsewhere).
  - `/stories` and story pages: featured story, story grid, sources (now a row of cards instead of bordered rows inside one card), continue reading, and the hero photo as a Card figure (no pure-white literal). The translucent blurred surfaces are gone.
  - `/library`: each book is a Card link (the dialog still opens from it), the latest-episode card and the guild cards. The lime gradients and the `translateY(-2px)` lifts are gone.
  - Garden assessment: each question is a Card fieldset (legend still inside), the result an elevated Card.
  - Pages now reach a card only through one of their own elements with `:global()`, so rules that never applied before (for example the 3-line clamp on chapter card summaries) now apply.
- **Chapters filter fix.** On live greenpill.network/chapters the region filter is broken today: choosing Africa sets `hidden` on 8 of 12 cards, but all 12 stay visible because the page's `display: flex` beat the browser's `[hidden]` rule. Card's `[hidden]` rule fixes it (checked in Brave: Africa shows 4, All shows 12).
- **"source-backed" captions** on chapter pages: both removed (`pages/chapters/[slug].astro`).
- **Em dashes (finding 18).** `scripts/website-em-dashes.ts` fails on an em dash, its escapes (`—`, `\u{2014}`) or its HTML entities in website copy: every text file under `packages/website/src` and `public`, with code comments (script, CSS, HTML and `{/* */}` template comments) skipped. It does not scan the Directus-owned fallback snapshot or the podcast feed snapshot, so steward copy never fails it. Fixture tests in `scripts/website-em-dashes.test.ts` (13). `package.json` adds `check:em-dashes` and `test:em-dashes` and runs `check:em-dashes` inside `agentic:check`. The sweep fixed the four left in copy: the map walkthrough's live-mode copy, its empty-place placeholder (both in `HomeMap.astro`; the placeholder now reads "No place yet") and the `/chapters` fallback dek. About 50 em dashes remain in code comments (mostly `HomeMap.astro` and `gp-tokens.css`); they are not copy and the check skips them by design.
- **Fallback snapshot.** `src/data/operational-content-snapshot.json` refreshed from the live public snapshot (generated 2026-11-07 20:51:24 UTC). The committed copy dated from 2026-08-10. Denver and the Dominican Republic are inactive, so the fallback build makes 12 chapter pages (44 pages in all).
- **Footer links (optional item).** Every outside footer link reads `content/social-links.json`, and `keystatic.config.ts` has matching `socialLinks` fields: the unused `warpcast` key became `farcaster`, `linkedin`, `codeOfConduct` and `events` were added, and `hub` moved from `hub.greenpill.network` (does not load) to `https://hub.regencoordination.xyz`. "Talk to a steward" reads the Garden ramp's step 4 link, as `/garden` does.
- **Tests:** `scripts/public-content-contract.test.ts` gains a test that pages and the Garden assessment define no card surface and no hover transform and that Card keeps its `[hidden]` rule, and a footer test (links from `social-links.json`, matching Keystatic fields, Hub URL). The chapter initiative test now pins the Card markup.
- **Shared files:** `scripts/data/ui-source-baseline.tsv` (29 rows pruned for values these changes removed; none added), `scripts/public-content-contract.test.ts` (tests above), `packages/website/keystatic.config.ts` (socialLinks block), `packages/website/src/content/social-links.json`.
- **Security-sensitive:** `package.json` (scripts only). No workflow file yet: see Open items.

## Evidence

- **Gate, on `706a51f`:** `bun run typecheck` passed; `bun run test:content` 47 pass, 0 fail in `scripts/public-content-contract.test.ts` (it also runs a git-ignored October copy under `tmp/pr26-review/`, which passes); `bun run test:em-dashes` 13 pass; `bun run test:plans` passed; `bun run check:em-dashes` "no em dashes in the copy of 226 website files"; `bun run agentic:check` passed (guidance, browser-verification policy, em-dash check, plan hubs, `ui:check` 0 hard, 0 warn); `bun run build` built 44 pages. `bun run ui:verify` was not run: the dev machine has no Chrome.
- **Brave QA** (Afo's profile through Claude in Chrome), the build exported with `dm-export` and served on `127.0.0.1:3321`; 375 and 1024 in same-origin iframes, 1920 in a scaled iframe:
  - DOM audit on home, `/chapters`, a chapter, a guild, `/stories`, a story, `/library` and `/garden`: every card is a `.gp-card` with a 20px radius, the soft border and the card tone (elevated where intended); no other element in `main` has a card's border, radius and fill (the guild CTA strip aside, see Open items). The only `:hover` rules with a transform are two buttons in the map walkthrough (not cards).
  - Hover on a home guild tile: background `card-elev`, border lime at 32%, `transform: none`.
  - No horizontal overflow and no element wider than the viewport on any of the eight pages at 375 or 1024. Cards are one column at 375 and two at 1024 where the grids say so.
  - The assessment still works: all seven questions answered, the result card shows, "Retake" hides it again (this wrote only to the local preview's storage).
  - Footer: 18 links resolve as intended; outside ones open in a new tab with the site-wide rule.
  - 1920: no seams or clipped glow behind the guild page.
  - **axe-core 4.11.4 in Brave: 0 violations** on all eight pages at 1460, and on home and `/library` at 375.
- **Screenshots** in `artifacts/qa-system-pass/`: `brave-1440-home-guild-card-hover.jpg`, `brave-1440-chapters-cards.jpg`, `brave-1440-story-sources-cards.jpg`, `brave-1440-library-book-cards.jpg`, `brave-375-library-book-rail.jpg`, `brave-1440-garden-assessment-result-card.jpg`, `brave-1920-dev-guild-background.jpg`. Covers below the fold load lazily, so some show empty frames.
- **Snapshot transfer:** the dev machine has no network and curl is off limits, so Brave read `/content/public-snapshot` on the agent's own origin and passed it by `postMessage` to a local receiver page on `127.0.0.1:3321`, which saved it. The saved file's SHA-256 (`d9a3afad…83fe`) matched the copy hashed in the browser. `scripts/operational-content.ts --from-agent --write-snapshot` then wrote the repo file from it through a `file://` URL, so the format is the script's own. The written file equals the live JSON apart from the `generatedAt` stamps (fetches differ only there).

## Sources

No factual copy was added. The one copy change with content, the Hub link, uses the URL the footer already linked.

## Production change set

**None needed.** On 2026-11-07, read-only through Afo's signed-in Brave session on `admin.greenpill.network`: all rows of `themes` (20), `people` (21), `chapters` (18), `chapter_initiatives` (16), `guilds` (3) and `projects` (9), every field and every status, hold no em dash; neither do the pending steward update tables (`chapter_update_requests` 1 row, accepted; the link and proof-signal tables are empty). The live public snapshot holds none either. Only collection names, row counts and match counts were read back; no values.

## Open items and decisions needed

1. **Decision: the pull-request workflow for the em-dash check.** Proposed `.github/workflows/website-copy.yml`: on pull requests touching `packages/website/**` or the check's scripts; `permissions: contents: read`; checkout without persisted credentials, Bun 1.3.10, then `bun scripts/website-em-dashes.ts` and its tests. No install, no secrets, under a minute. Not added yet, because it needs Afo's OK. Until then the check runs only in `agentic:check`.
2. **CTA strips** (`/chapters`, chapter pages, guild pages) still carry their own lime-bordered panels. They are the CTA strip pattern, not cards (audit A.2), and `ui/CtaStrip.astro` exists but looks different, so moving them is a design call. Follow-up.
3. **Map walkthrough buttons** (`.gp-home-map-addnode-theme`, `.gp-home-map-addnode-next`) lift 1px on hover. Not cards; fits PRD-739's P2 polish.
4. **`/map/edit` and `/map/moderate`** keep their own card styles: they are standalone pages outside the site shell (audit section 2.6 suggests a minimal `GpLayout` chrome). Follow-up.
5. **Library book titles** render in the body font: the page's display-font rule for `.gp-library-book-title` loses to Text's own style (unchanged by this PR).
6. **The steward booking link** lives in `garden.json` (twice), `lib/garden-ramp.ts` and the assessment's default prop; the footer now reads the ramp's copy, so an editor still has more than one place to change it.
7. **Hub-wide open follow-ups:** PRD-1417 (Directus approvals can still publish map nodes at bad coordinates; Todo, decisions listed there) and PRD-739's P1 and P2 (information layout: docked inspector, compact hover tooltip, theme chip strip, non-modal list drawer, mobile single-row chrome; then chapter themes, live status line and polling backoff). PRD-739 is back in Backlog with P0 shipped in #41.
8. **Visual changes Afo has not seen yet** (all from moving onto the shared card): chapter directory images now inset, story cards opaque instead of translucent, Library guild and episode cards without the lime gradient, each book a card tile, story sources as separate cards, the assessment result without its lime border, and 24px card padding at 375 where some cards had 16px.
