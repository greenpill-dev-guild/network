# Website QA Pass, November 2026: Spec

## Scope

Twenty review notes (see `reports/2026-11-06-qa-findings.md`) plus two open Linear issues, PRD-739 and PRD-625. The work is split into ten sessions in two waves. `plan.todo.md` holds the roster and the checklist for each session.

## Ground rules for every session

1. **No hallucinations.** Every factual claim you write or keep (an event, date, partner, number, person, role, quote or attribution) needs a public source you opened in this session. Prefer primary sources: the organization's own site, Paragraph post, Regen Coordination Hub thread, Luma event, GitHub repository or X post. If a claim cannot be verified, remove it or list it for steward review in your handoff. Never fill a gap with something plausible. Record sources in your handoff, not as visible "source-backed" copy on the page.
2. **Copy.** Plain, specific and friendly. No internal notes in public text ("needs steward backfill", "source-backed", "seed copy", "before launch", "research artifact"). No em dashes in copy you write or touch: use a comma, colon, period or parentheses. US spelling.
3. **UI standard.** Before UI work run `bun run agentic:guidance`, then follow `packages/website/DESIGN.md` and `packages/website/CLAUDE.md`, or load the `greenpill-ui` skill. Use `--gp-*` tokens and the primitives in `components/ui/`. Prefer native elements (`<dialog>`, `<details>`, real form controls). Check 375, 1024 and 1440 widths, run `bun run ui:check`, and do the visual check in Afo's authenticated Brave profile through Claude in Chrome. `bun run ui:verify` cannot render inside the dev machine (it has no Chrome, and installing one needs Afo's OK): it builds, prints "No Chrome/Chromium binary found" and skips every channel, so report it as not run, never as passed. Do not use an isolated browser for local QA; if Brave cannot be reached, report visual QA as blocked.
4. **Who owns which content.** Chapters, chapter initiatives, guilds, guild projects, locations and steward profiles live in Directus and Postgres in production. Do not fix them by editing repo JSON. Write a change set in your handoff (record, field, current value, proposed value, source URL) and stop for Afo's approval before anything is written to production. Editorial content (stories, books, `library.json`, `home-page.json`, `garden.json`, podcast data, resources) is file-backed under `packages/website/src/content/` and changes through your PR.
5. **Production writes need approval in your session.** That covers Directus, the production database, Fly secrets, Resend, Telegram and DNS. Read-only checks are fine (public endpoints, `fly secrets list` names, Directus reads).
6. **Git and deploys.** Work in your own worktree and branch, commit in small steps, and open a pull request with `gh pr create -R greenpill-dev-guild/network`. Before opening it, run the repository's pre-PR gate from `AGENTS.md`: `bun run typecheck`, the focused `bun run test:*` for your surface, `bun run agentic:check` for website work, then `bun run build`, and put the evidence in your handoff. Link your Linear issue in the PR body (`Linear: PRD-NNNN`). Do not merge. A merge to `main` deploys: GitHub Pages rebuilds the website, and Fly redeploys `network-agent` on every push to `main`. Name any change to `package.json`, the lockfile, `.github/workflows/**`, `CLAUDE.md`, `AGENTS.md` or `.claude/**` in the PR description.
7. **The local stack is shared, and `bun` runs inside the dev machine.** Do not run `bun run dev`: its teardown stops Directus and Postgres for every other session. The dev-machine `bun` shim forwards arguments but not environment variables, so `NETWORK_WEBSITE_PORT=<port> bun run dev:website` silently starts on 3301; do not use it. To preview the website: `bun run build:website`, then `dm-export packages/website/dist <a folder outside the repo>` (it replaces that folder on every export), then serve it on the Mac on your assigned port with `python3 -m http.server <port> --bind 127.0.0.1 --directory <folder>`; `python3` runs on the Mac, where Brave can reach it. Only `qa-map-data`, and later `qa-map-polish`, may run anything on 3301. A process started inside the machine keeps running after its Mac-side task stops, so stop it inside the machine. Brave's window ignores resizing, so check 375 and 1024 in a same-origin iframe of that width. Ports are assigned in `plan.todo.md`. Stop only what you started.
8. **Dependencies.** Run `bun install --frozen-lockfile` once in your worktree; Afo approved this for every QA session on 2026-11-06. Do not add or upgrade packages without asking Afo in your session.
9. **Privacy boundary.** Map and intake data must never expose emails, notes, IP addresses, user agents, pending submissions or steward review notes, including in PR descriptions, logs and handoffs. Public node names and places may be referenced.
10. **External links.** Do not hand-add `target="_blank"` to individual links. `qa-brand-shell` owns one site-wide rule for external links.
11. **Shared anchors.** The Library keeps an `id="guilds"` anchor on its guild cards; guild breadcrumbs link to `/library#guilds`.
12. **Handoff.** Before you stop, write `handoffs/<session-name>.md` in this hub: what changed, evidence (commands, screenshots, sources), open items, and decisions you need from Afo. Commit it in your PR. Do not edit `plan.todo.md` or `status.json`; the orchestrating session keeps those current, which avoids merge conflicts between sessions.

## Decisions

| # | Decision | Recommendation | Status |
| --- | --- | --- | --- |
| D1 | Garden assessment: keep it and fix it (legend overflow, multi-select questions), or remove it as the July call decided | Keep and fix. The 2026-11-06 review asked for a session focused on it, which is newer than the July call. | Decided 2026-11-06: keep and fix (`qa-assessment` runs) |
| D2 | Map ecoregion boundary: remove the layer, its ~950 KB dataset and the footer credit, or keep it and explain it | Remove. The review flagged it as inaccurate, and the credit reads as unexplained. | Decided 2026-11-06: remove the layer, the dataset and the footer credit |
| D3 | Newsletter: keep the Resend form, switch to Paragraph subscriptions, or remove Subscribe until a newsletter is sent | Decide after `qa-home-garden` reports whether production is configured and whether anyone sends issues. | Decided 2026-11-06: Paragraph subscriptions. Production had no newsletter segment or topic set, while Paragraph already has 400+ subscribers; the Resend route stays in the agent, unused |
| D4 | Background: use the home page's plain background on every page | Yes, as Afo suggested in the review. | Proposed; `qa-brand-shell` confirms with Afo on screenshots before merging |
| D5 | Where the work lands: one pull request per session into `main`. The September plan to land work on `claude/ui-ux-audit-pass-2` is retired; its audit now lives in `.plans/audits/`. | Yes. | Decided 2026-11-06 with the launch |
| D6 | Linear: one parent issue for this hub in P-PRD-19, one child per launched session. PRD-739 and PRD-625 are reused for `qa-map-polish` and `qa-chapters`. PRD-621, PRD-1119 and PRD-1120 stay in Backlog. | Yes. | Decided 2026-11-06 with the launch |
| D7 | Launch: Opus 5.5 at extra-high effort, one worktree per session, batch A first, batch B as batch A sessions reach their pull requests | Yes. | Decided 2026-11-06: batch A started; Afo approved `bun install --frozen-lockfile` in each QA session worktree ("Yes, frozen installs only"), no new or upgraded packages |

## Inputs Afo provides

| # | Input | Needed by |
| --- | --- | --- |
| I1 | A new Telegram invite link with "Request admin approval" turned on, and the old links revoked | `qa-brand-shell`, `qa-home-garden` |
| I2 | The LinkedIn URL to use, and which "website" link is no longer maintained | `qa-guilds`, `qa-brand-shell` |
| I3 | Where the current brand kit and logo files live | `qa-brand-shell` |
| I4 | Whether GreenSci should be listed publicly | `qa-library` |
| I5 | Approval of each production change set (Directus content, map node repairs) | `qa-guilds`, `qa-chapters`, `qa-map-data` |

## Constraints

- Production builds read the live agent snapshot hourly. Approved Directus edits reach the site within about an hour without a code change. The committed fallback snapshot is refreshed once, by `qa-system-pass`, after the Directus change sets are applied.
- `network-agent` deploys on every push to `main` with blue-green rollout. For `qa-map-data`, ship tolerant validation code first, then repair data.
- The repository is public. Do not commit meeting transcripts, private contact details or anything from the private side of the map.
