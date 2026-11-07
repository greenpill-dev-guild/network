# Website QA Pass, November 2026: Evaluation

## Acceptance checks

Each finding in `reports/2026-11-06-qa-findings.md` is closed when its check below passes on the deployed site, not only in a pull request.

| Finding | Check |
| --- | --- |
| 1 | Every node on live `/map/state` sits in the country its place names, including the five seen on 2026-11-06 at clamped edge values (latitude ±90, longitude ±180) or 0,0. The agent rejects out-of-range or non-finite coordinates with a clear error and never stores 0,0 or a clamped edge value in place of a real location, covered by tests. A real location on the 180th meridian (for example in Fiji) still saves. |
| 2 | No "Knowledge map" or "Open the toolkit" tile on the home page. The ecoregion layer, its dataset and the footer credit are gone (D2). |
| 3 | Every ecosystem entry links to the organization's own page and has a source in the `qa-home-garden` handoff; partners and tools are separate rows. |
| 4 | Every story claim has a source in the `qa-stories` handoff; at least the verifiable stories from the last 12 months are published with exact dates; no "storyies", "seed copy" or raw category slugs render. |
| 5 | Subscribe on the home page leads to a working signup, or is replaced as decided in D3. A real signup reaches the chosen list (tested by Afo or with his approval). |
| 6 | One Telegram invite link, read from `content/social-links.json`, requires admin approval, and opens in a new tab. |
| 7 | On the home, Library, a guild, a chapter and a story page, every external link opens in a new tab with `rel="noopener"` and an accessible hint; internal links do not. |
| 8 | Every page uses the plain background; no seams at 375, 1024, 1440 or 1920. |
| 9 | Cards on every page use `Card` with the home treatment; no page-local card classes remain. |
| 10 | Each book opens a dialog with the larger cover, the English PDF, every translation and every store or edition link; works with keyboard and screen reader; the cover still works without JavaScript. |
| 11 | The Library shows the newest episodes the feed held at the last build, and they play on the site; the scheduled build refreshes the feed; the episode count comes from the feed. |
| 12 | No Knowledge Garden block or inactive protocol guides; GreenSci listed or not per I4. |
| 13 | The Dev Guild page has the hero key links, active projects only, a media section, a Hats list, contributor credits and larger body text. |
| 14 | Guild breadcrumbs read Library and link to `/library#guilds`. |
| 15 | The Writers Guild page lists only verified Writers Guild work, credits contributors, and does not claim the podcast. |
| 16 | The footer says Farcaster and includes LinkedIn; the unmaintained website link is gone. |
| 17 | Header, favicon, touch icon and default share image use the current brand kit. |
| 18 | A pull-request workflow runs the em-dash check on website changes and it passes on `main`; no em dashes in website copy; Directus content is cleaned through an approved change set, and the hourly publish never fails on steward copy. |
| 19 | The assessment stays (D1). Its legends sit inside their cards. The questions Afo marks as multi-answer accept several answers, and both the stored answers and the result use every selected answer under the scoring he agrees. Checked at all three widths and with keyboard and screen reader. |
| 20 | The footer's bottom row is friendly and accurate; no retired "friction" labels. |

## Proof

- The repository's pre-PR gate from `AGENTS.md` on every session PR: `bun run typecheck`, the focused `bun run test:*` for the surface (for example `test:map-nodes`, `test:agent`, `test:content`), `bun run agentic:check` for website work (it runs `plans:validate` and `ui:check`), then `bun run build`. `bun run ui:verify` skips rendering inside the dev machine (no Chrome there), so it counts as not run; the Brave check below is the rendered proof.
- Visual QA in Afo's authenticated Brave profile at 375, 1024 and 1440, plus 1920 for the background (finding 8), with screenshots referenced in each handoff. Isolated-browser output counts only as clean-room proof.
- For content: the source list in each handoff, and Afo's approval recorded for every production change set.
- After merge: the same checks against greenpill.network once GitHub Pages and Fly report the deploy.
