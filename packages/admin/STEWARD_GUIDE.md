# Greenpill Steward Directus Guide

This guide is for chapter and guild stewards using the private Greenpill
Directus admin. Directus is the editing and review surface; the public website
updates only after trusted publishers approve content and a new public snapshot
or website build is published.

## What Stewards Can Do

- View published operational content as reference.
- Edit assigned chapter or guild records when those records are in `draft` or
  `pending_review`.
- Create chapter initiatives for assigned chapters.
- Create chapter update requests when a published chapter should stay live while
  edits are reviewed.
- Move their own draft work to `pending_review`.

Standard stewards cannot publish, edit unrelated chapters or guilds, view
private intake/contact data, or change Directus configuration.

## Steward Starter Checklist

Before the steward sync, have these public-safe details ready:

- Current chapter summary or a better short public summary.
- Primary public link.
- Public website, social, program, event, or contact links.
- Proof signals with public sources when available.
- Public image URL, alt text, and image credit if proposing a new image.
- Local initiatives, programs, events, campaigns, cleanups, education series, or
  Water Cup-style work.

Keep private emails, private chat logs, raw notes, wallet-only contact details,
or unapproved claims out of Directus fields that publish to the website.

## Account Setup

1. Open the Directus invite email from Greenpill Network.
2. Accept the invite and set a password.
3. Log in at the admin URL shared by the operator.
4. Open the Content area.
5. Confirm these collections are visible:
   - `Chapters`
   - `Chapter Initiatives`
   - `Chapter Update Requests`

If the assigned chapter or guild is missing, email Afolabi at
`afo@greenpill.builders` so the content-access assignment can be checked.

## First 10-Minute Walkthrough

1. Open `Chapters`.
2. Use `Published chapter reference` to find the current public chapter profile.
3. Do not change `slug`; it controls URLs and assignments.
4. Review the basic public fields:
   - `name`
   - `city`
   - `country`
   - `region`
   - `entity_status`
   - `summary`
   - `image`
   - `latitude`
   - `longitude`
   - `primary_link`
   - `theme_slugs`
5. If the chapter row is editable, update the draft fields and set
   `publication_status` to `pending_review` when ready.
6. If the chapter row is already published and not editable, create a
   `Chapter Update Request` instead. For syncs, the operator may pre-create
   this draft so you can open it directly.

## Updating A Published Chapter

Published chapter rows stay online until a trusted publisher applies and
publishes changes. Use `Chapter Update Requests` for live-profile edits.

Create a request with:

- `chapter_slug`: your chapter.
- `title`: short internal title.
- `summary`: what should change and why.
- `proposed_summary`: optional replacement public summary.
- `proposed_primary_link`: optional replacement primary public link.
- `proposed_image`, `proposed_image_alt`, `proposed_image_credit`: optional
  replacement public image details.
- `links`: public links to add or update.
- `proof_signals`: public proof signals to add or update.
- `request_status`: use `draft` while editing, then `pending_review`.

Use the structured link rows instead of raw JSON for normal public links:

```json
{
  "label": "Water Cup updates",
  "url": "https://example.org/public-update",
  "subtext": "Public program thread",
  "kind": "program"
}
```

Use structured proof signal rows for source-backed public claims:

```json
{
  "label": "Education program",
  "value": "10 weeks",
  "source": "Public program recap",
  "href": "https://example.org/source"
}
```

Use `requested_changes` only as an advanced fallback for unusual edits that do
not fit the structured fields above.

## Status Flow

Chapter update requests move through this flow:

1. `draft`: steward is still editing.
2. `pending_review`: steward is ready for publisher review.
3. `needs_changes`: publisher has asked the steward to revise.
4. `accepted` or `declined`: publisher completed review.
5. Publisher applies accepted changes to the chapter record.
6. The published snapshot or website build is refreshed.

Accepted update requests do not publish the website by themselves. They are the
review handoff that tells a trusted publisher what to apply.

When you move a request or initiative to `pending_review`, email
`afo@greenpill.builders` with the subject `Greenpill chapter review: [Chapter
name]`. Include the Directus item link and a one-sentence summary of what is
ready for review. This makes sure Afolabi sees the review request promptly.

## Previewing Changes

Directus shows a preview link back to the current public chapter page. This is a
reference preview, not a proposed-change preview. For now, a trusted publisher
must apply accepted changes to a local or staging snapshot to verify the final
public page before publishing.

## Adding Chapter Initiatives

Use `Chapter Initiatives` for local programs, events, campaigns, education
series, cleanups, impact efforts, and Water Cup-style work.

Create a new initiative with:

- `title`
- `entity_status`
- `summary`
- `description`
- `theme_slugs`
- `links`
- `proof_signals`
- `impact_sources`, only when there is an approved public impact source

Set `publication_status` to `pending_review` when the initiative is ready for a
publisher.

## Steward Sync Agenda

1. Confirm everyone has accepted their invite and can log in.
2. Explain the workflow: draft, pending review, needs changes or accepted,
   publisher applies changes, website update.
3. Show the `Published chapter reference` bookmark.
4. Open a pre-created `Chapter Update Request` draft.
5. Walk through chapter basics and fields stewards should avoid changing.
6. Add proposed summary, link, proof signal, and media details.
7. Create a sample `Chapter Initiative`.
8. Show how to move work to `pending_review`.
9. Explain what publishers will do after the call.

## Operator Prep Checklist

1. Run migrations against the target database.
2. Run Directus content setup and Studio setup.
3. Invite stewards from a TSV.
4. Assign each steward to a chapter or guild.
5. Pre-create one `Chapter Update Request` draft per participating chapter:

   ```sh
   bun scripts/directus-steward-sync-prep.ts --input assignments.tsv
   ```

6. Send contextual sync copy from `STEWARD_SYNC_INVITE.md` alongside the
   Directus system invite.
7. Run the steward smoke test.
8. Prepare one demo chapter and one demo initiative for screen sharing.

Recommended local validation:

```sh
bun run db:migrate
bun run directus:local:bootstrap
bun scripts/directus-steward-sync-prep.ts --input assignments.tsv --dry-run
bun --no-env-file scripts/directus-steward-smoke.ts
```

Use the package `directus:*` setup scripts for production or staging only when
the active environment variables intentionally point at that target.
