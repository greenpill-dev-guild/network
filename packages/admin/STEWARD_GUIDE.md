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

## Account Setup

1. Open the Directus invite email from Greenpill Network.
2. Accept the invite and set a password.
3. Log in at the admin URL shared by the operator.
4. Open the Content area.
5. Confirm these collections are visible:
   - `Chapters`
   - `Chapter Initiatives`
   - `Chapter Update Requests`

If the assigned chapter or guild is missing, ask the operator to check the
content-access assignment TSV and rerun `directus:content-access`.

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
   `Chapter Update Request` instead.

## Updating A Published Chapter

Published chapter rows stay online until a trusted publisher applies and
publishes changes. Use `Chapter Update Requests` for live-profile edits.

Create a request with:

- `chapter_slug`: your chapter.
- `title`: short internal title.
- `summary`: what should change and why.
- `requested_changes`: structured notes for the publisher.
- `request_status`: use `draft` while editing, then `pending_review`.

Recommended `requested_changes` shape:

```json
{
  "summary": "Replace stale chapter summary with current Water Cup and education work.",
  "links": [
    {
      "label": "Water Cup updates",
      "url": "https://example.org/public-update",
      "subtext": "Public program thread"
    }
  ],
  "proofSignals": [
    {
      "label": "Education program",
      "value": "10 weeks",
      "href": "https://example.org/source"
    }
  ],
  "media": {
    "image": "https://example.org/photo.jpg",
    "imageAlt": "Chapter members gathered at a public event.",
    "imageCredit": "Greenpill chapter"
  }
}
```

Keep private emails, private chat logs, raw notes, wallet-only contact details,
or unapproved claims out of the request.

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
2. Explain the workflow: draft, pending review, trusted publish, website update.
3. Show the `Published chapter reference` bookmark.
4. Walk through chapter basics and fields stewards should avoid changing.
5. Create a sample `Chapter Update Request` for a published chapter.
6. Create a sample `Chapter Initiative`.
7. Show how to move work to `pending_review`.
8. Explain what publishers will do after the call.

## Operator Prep Checklist

1. Run migrations against the target database.
2. Run Directus content setup and Studio setup.
3. Invite stewards from a TSV.
4. Assign each steward to a chapter or guild.
5. Run the steward smoke test.
6. Prepare one demo chapter and one demo initiative for screen sharing.

Recommended local validation:

```sh
bun run db:migrate
bun run directus:local:bootstrap
bun --no-env-file scripts/directus-steward-smoke.ts
```

Use the package `directus:*` setup scripts for production or staging only when
the active environment variables intentionally point at that target.
