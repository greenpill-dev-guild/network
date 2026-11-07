# qa-guilds-apply handoff

Session `qa-guilds-apply`, Linear PRD-1411. It applies the guild content change set that Afo approved on 2026-11-06 ([`qa-guilds-change-set.json`](qa-guilds-change-set.json), 42 fields on 2 guilds and 8 projects; see [`handoffs/qa-guilds.md`](../handoffs/qa-guilds.md)) to production Directus, then checks the guild pages live.

**Status: applied 2026-11-07, 19:43–19:45 UTC.** All 42 fields and the 4 Dev Guild field notes are written and read back in production Directus, and the live agent snapshot matches the expected records. The live page check is in "Pages check" below.

## Phase 1: dry run (read-only), 2026-11-07

Where: Afo's signed-in Brave tab on `https://admin.greenpill.network/admin/` through Claude in Chrome, Directus 11.17.4, Administrator role. All calls are same-origin `fetch` with the session cookie. The tab opened on `/admin/content/guilds`, not on private intake.

- **Payload.** The change set file (SHA-256 `70baf8a94802…3d93e`) went into the page in 4 chunks of about 14 KB. Each chunk and the joined file matched the local file by SHA-256 before anything was read or compared.
- **Dry run at 08:43 UTC.** One `GET /items/<collection>/<slug>` per record for the target fields. All 42 fields equal their recorded `current` value, both after the public view's null stripping and as raw values. A second check hashed each production value in the browser (sorted-key JSON, SHA-256) and each recorded `current` value in Python: all 42 match. **No field was changed by a steward since 2026-11-06, so none is skipped or merged by hand.**
- **Records.** All 10 records are `published`.
- **Activity log.** Directus shows no create, update or delete on `guilds` or `projects` since 2026-11-06. The latest entries are from 2026-10-09 (a temporary steward smoke-test project, created and deleted).
- **Who can edit these records.** One steward editor assignment (Dev Guild), plus the admin account. The Writers Guild has no editor assignment. The operator role has one never-used agent account and one pending invite.
- **Field facts that shape the writes.**
  - Every guild field in the set is `jsonb` (Directus type `json`), as is `projects.proof_signals`, so empty values go in as `[]`.
  - `projects.tech_stack` is `text[]` (Directus type `unknown`). It is written as a Postgres array literal string (`{"Astro","Directus","Hono"}`), the way the repo's enrichment scripts write `text[]` columns; the chapter set showed that this field type rejects `[]`.
  - `projects.repo_url` and `live_url` validate as null, empty or `http…`, so the two `""` writes (GreenWill repo, Grant Ships live link) pass.
  - No notification trigger sits on `content.guilds` or `content.projects`; archiving the podcast row sends no email.

- **Second dry run at 18:30 UTC**, about 10 hours later, after Afo answered the questions below: still 42 of 42 equal to `current`, all published, no activity on `guilds` or `projects`.
- **Live snapshot before the apply** (`generatedAt` 18:27 UTC): every guild and project record equals the committed fallback snapshot record (record hashes), so the expected post-apply records are computed exactly. None of the proposed values trips the agent's private-field quarantine, and none contains a null.

Per-field results and hashes: [`qa-guilds-apply/dry-run.json`](qa-guilds-apply/dry-run.json).

### Afo's answers, 2026-11-07

1. **Edit pause: "No pause".** The handoff asked stewards to pause edits during the apply. Afo chose to rely on a fresh read right before each write instead, with a readback after it and a re-read of all 42 fields at the end. Remaining risk he accepted: a Dev Guild form already open in Data Studio and saved after the final check would overwrite the fields edited in it.
2. **Data Studio field notes: "Patch the 4 notes".** Update only `meta.note` on `guilds.stewards`, `outputs`, `proof_signals` and `media` to the text in `scripts/directus-studio-setup.ts` (PR #36), from the same Brave session, comparing each current note first. The full `bun run directus:studio:setup` is not run: the dev machine cannot reach production, and the script re-applies every Studio setting and the global settings.

## Phase 2: apply, 2026-11-07

Started on the orchestrator's message that PR #34 had merged (`483aae8`, 19:41:53 UTC, confirmed with `gh`). Same Brave tab and method as the dry run.

- **Preflight, 19:42:54 UTC.** Directus answered `pong` in 816 ms. The session is still Administrator, and the change set in the page still matched its SHA-256. `GET /flows` returned no Flows, so nothing in Directus reacts to these updates.
- **Field writes, 19:43:41–19:44:01 UTC.** For each of the 42 changes, in file order:
  - read the field fresh;
  - send a one-field `PATCH /items/<collection>/<slug>`;
  - read it back.

  Every read before a write still equalled the recorded `current` value, so nothing was skipped. Every PATCH returned 200, and every readback equalled `proposed`. `projects.tech_stack` went in as a Postgres array literal and reads back as the proposed list.
- **Final re-read, 19:44:20 UTC.** All 42 production values equal `proposed`. The browser's hash of each production value matches Python's hash of each proposed value. `greenpill-podcast` is `archived`; the other 9 records are still `published`.
- **Field notes, 19:44:55–19:44:57 UTC.** `meta.note` on `guilds.stewards`, `outputs`, `proof_signals` and `media` now holds the PR #36 text. Each old note was checked before the write and each new one read back. On each field, the other 19 meta keys are unchanged from the dry-run copy, including interface and options.
- **Activity log.** Since 19:30 UTC there are exactly 46 entries, all from this session's account:
  - 24 guild updates: Dev Guild 11, Writers Guild 13;
  - 18 project updates, split per record as the change set expects;
  - 4 `directus_fields` updates.

  No steward edited anything during the window.
- **Live agent snapshot, `generatedAt` 19:45:55 UTC.** All 12 guild and project records equal the hashes precomputed in Phase 1:
  - 3 guilds and 8 projects;
  - the podcast row is gone;
  - GreenSci and Cookie Jar are unchanged;
  - nothing was quarantined and there are no extra records.
- **Pages deploy.** The agent sent `operational-content-updated` at 19:44:04 UTC. That run was cancelled in favour of the scheduled run [42407648895](https://github.com/greenpill-dev-guild/network/actions/runs/42407648895), which started at 19:44:13 UTC on `e44a678` after the last field write. The agent builds the snapshot on each request, so that build reads the applied content.

Per-field timings and hashes: [`qa-guilds-apply/apply.json`](qa-guilds-apply/apply.json).

### Pages check

The deploy succeeded: the build ran 19:45:37–19:47:24 UTC and the deploy finished at 19:47:59 UTC. Live `build-metadata.json` shows `builtAt` 19:46:52 UTC, with the operational snapshot generated at 19:46:53 UTC, after the apply. I checked the live pages in Afo's Brave between 19:48 and 19:50 UTC, with a cache-busting query string, reading the page structure after load.

- **Dev Guild** (`/guilds/dev-guild/`):
  - The Media · Appearances section ("See the guild in motion.") shows all 5 appearances.
  - "Hats · How the guild is organized" lists 7 hats in two groups, Guild stewardship and Work areas.
  - The page has no "Public proof" copy and no outputs section.
  - Projects shows the 6 active projects with the new links:
    - Green Goods links to `greengoods.app`;
    - GreenWill links to the Hub thread and no longer to the archived repository;
    - the Greenpill Network website card links to `github.com/greenpill-dev-guild/network` and `greenpill.network`.
  - Grant Ships (inactive) and Impact Reef (archived) no longer appear.
- **Writers Guild** (`/guilds/writers-guild/`):
  - "Published by the guild" lists the 4 works: the two books, the newsletter and the Web3 Tooling Series.
  - The hero reads "Founded 2023", and the meta description is the new one.
  - The page has no "Public proof" copy and no Projects section; the podcast row was the guild's only project.
  - `<main>` contains no podcast text. The only "Podcast" on the page is the site navigation link to `/library#podcast`.
- **Home:**
  - Both guild tiles show the new summaries.
  - The Dev Guild tile reads "Open-source coordination tools" (PR #34), and the page shows no "public outputs" count.

## After the apply

- `qa-system-pass` refreshes the committed fallback snapshot (`bun run content:snapshot:from-agent`), as the handoff planned. This session did not touch it.
- Follow-up, outside this change set: the Writers Guild home tile's subline "Stories, translations, longform" is hard-coded at `packages/website/src/pages/index.astro:270` and no longer matches the guild's books, newsletters and research framing.
