# Greenpill Steward Directus Guide

This guide is for chapter and guild stewards using the private Greenpill
Directus admin. Directus is the editing and review surface; the public website
updates only after trusted publishers approve content and a new public snapshot
or website build is published.

## What Stewards Can Do

- View published operational content as reference.
- Edit their assigned chapter or guild record directly at any status, including
  `published`. Edits to a live profile do not wait for approval.
- Create chapter initiatives for assigned chapters.
- Create chapter update requests when a change should be reviewed or discussed
  before it goes out. This is now optional, not the only route.
- Move their own draft work to `pending_review` or `published`.

Stewards can only edit their own assigned chapter or guild. Every other chapter
stays read-only.

Standard stewards cannot edit unrelated chapters or guilds, view private
intake/contact data, or change Directus configuration. Publishing new records
and archiving remain trusted publisher/operator actions.

## Steward Starter Checklist

Before the steward sync, have these public-safe details ready:

- Current chapter summary or a better short public summary.
- Primary public link.
- Public website, social, program, event, or contact links.
- Proof signals with public sources when available.
- A public-safe chapter image file, alt text, and image credit if proposing a
  new image. Use JPEG, PNG, WebP, GIF, or AVIF, up to 25 MB.
- Local initiatives, programs, events, campaigns, cleanups, education series, or
  Water Cup-style work.

Keep private emails, private chat logs, raw notes, wallet-only contact details,
or unapproved claims out of Directus fields that publish to the website.

## Account Setup

Every active chapter steward should already have received a Directus invite email
from Greenpill Network. Check your inbox and spam folder for that invite before
asking for access.

1. Open the Directus invite email from Greenpill Network.
2. Accept the invite and set a password.
3. Log in at the admin URL shared by the operator.
4. Open the Content area.
5. Confirm these collections are visible:
   - `Chapters`
   - `Chapter Initiatives`
   - `Chapter Update Requests`

If the assigned chapter or guild is missing, message the Telegram steward chat
with your chapter name and the email address used for your invite.

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
   - `image_file`
   - `latitude`
   - `longitude`
   - `primary_link`
   - `theme_slugs`
5. Edit the fields directly and save. Your chapter row is editable whether it is
   a draft or already published.
6. Leave `publication_status` on `published` to keep the profile live.

## Uploading A Chapter Image

1. Open your assigned chapter in `Chapters`.
2. Find `Chapter image` and choose `Upload File From Device`. You can also pick
   an image already in the `Chapter Images` library.
3. Select a JPEG, PNG, WebP, GIF, or AVIF file no larger than 25 MB.
4. Confirm the image is safe to publish. Do not upload private screenshots,
   contact details, private chat content, or location-sensitive metadata.
5. Keep the public alt text and credit in the chapter's `media` details current.
6. Save the chapter.

You can fix the focal point, title, and description of images you uploaded
yourself, and delete your own uploads while no published chapter is using
them. Files uploaded by other stewards are read-only for you.

The original upload bucket remains private. New uploads stay private until they
are attached to a published chapter. Published images are then delivered
through Directus' permission-checked `/assets/<file-id>` route and reach the
public website on the next automatic build.

## Updating A Published Chapter

Edit the published chapter row directly and save. The profile stays online while
you edit and no approval step is involved.

Two things to know:

- Saved edits reach the public website on the next content snapshot refresh and
  website build, not the instant you save.
- Use `Chapter Update Requests` when you want a second pair of eyes on a change
  before it goes out, or when the edit needs discussion. It is a review tool
  now, not a requirement.

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
2. `pending_review`: steward is ready for review. Reviewers get an automatic
   email; no chat ping is needed (the Telegram steward chat still works as a
   backup if a review sits unanswered).
3. `needs_changes`: a Network steward has asked the steward to revise.
4. `accepted` or `declined`: a Network steward completed review. You get an
   email, and the request stays visible in your `My change request outcomes`
   bookmark together with any reviewer notes.
5. Accepting applies the proposed summary, primary link, links, proof signals,
   and image details to the chapter record automatically - nothing is retyped
   by hand.
6. The public website picks the change up on the next automatic build.

Direct edits to your own chapter skip steps 1 to 5 entirely and reach the
website the same way as step 6.

## Previewing Changes

Directus shows a preview link back to the current public chapter page. This is a
reference preview, not a proposed-change preview. For now, a trusted publisher
must apply accepted changes to a local or staging snapshot to verify the final
public page before publishing.

## Adding Chapter Initiatives

Use `Chapter Initiatives` for local programs, events, campaigns, education
series, cleanups, impact efforts, and Water Cup-style work.

Create a new initiative with:

- `Chapter`: pick your own chapter. Directus only accepts chapters you are
  assigned to.
- `title`
- `entity_status`
- `summary`
- `description`
- `theme_slugs`
- `links` and `proof_signals`: use the structured row editors (Add New), not
  raw JSON.
- `impact_sources`, only when there is an approved public impact source

You can publish your own initiative directly, or set `publication_status` to
`pending_review` when you want a publisher to look first. The
`My chapter initiatives` bookmark shows all of your chapter's initiatives at
any status.

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
