# qa-guilds-apply handoff

Session `qa-guilds-apply`, Linear PRD-1411. It applies the guild content change set that Afo approved on 2026-11-06 ([`qa-guilds-change-set.json`](qa-guilds-change-set.json), 42 fields on 2 guilds and 8 projects; see [`handoffs/qa-guilds.md`](../handoffs/qa-guilds.md)) to production Directus, then checks the guild pages live.

**Status: dry run done, nothing written yet.** Writes wait for PR #34 (home Dev Guild tile no longer counts `outputs`) to merge.

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

## Phase 2: apply

Not started. Plan: after PR #34 merges, re-read each field just before its `PATCH /items/<collection>/<slug>` (one field per request), skip any field whose value no longer matches `current`, read it back after the write, then re-read all 42 fields at the end. Patch the four field notes the same way (`PATCH /fields/guilds/<field>` with `meta.note` only). Then check the live agent snapshot and, after the next Pages build, the Dev Guild and Writers Guild pages.
