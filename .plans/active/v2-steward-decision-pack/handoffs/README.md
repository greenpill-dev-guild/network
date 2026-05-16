# Handoffs

## Current Handoff

Use this hub to run the steward decision pass for V2 narrative and featured-content choices.

Primary steward-facing docs:

- `docs/v2/steward-brief-one-page.md`
- `docs/v2/steward-telegram-polls.md`

Repo-facing source docs:

- `docs/v2/v2-brief.md`
- `docs/v2/v2-delivery-plan.md`
- `docs/v2/ai-build-manifest.yaml`

After the polls and nomination replies come in, add a short decision summary to `reports/steward-response-summary.md` and then update the canonical docs only where the steward decisions change first-release priorities.

## Lane Notes

- `content`: owns the brief, polls, response summary, and doc updates.
- `ui`: waits for the response summary before homepage and page wireframes are treated as ready.
- `platform`: no active work for this hub unless the decisions change implementation boundaries.
- `qa_pass_1`: review the response summary against the steward-facing intent.
- `qa_pass_2`: validate that the final docs and manifest still agree.

Capture:

- what was decided or proven
- what remains
- what the next person should read first
