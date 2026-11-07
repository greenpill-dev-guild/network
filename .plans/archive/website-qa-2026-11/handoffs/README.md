# Handoffs

Each session writes `handoffs/<session-name>.md` before it stops (for example `handoffs/qa-library.md`). Use these headings:

- **Changed**: what the pull request changes, with the PR link.
- **Evidence**: commands run and their results, screenshot paths, Brave QA notes at 375, 1024 and 1440.
- **Sources**: every public source used for factual copy, one line per claim or record.
- **Production change set**: for Directus or database edits, a table of record, field, current value, proposed value and source. Mark it "approved by Afo on <date>" only when he has said so in the session.
- **Open items and decisions needed**: anything left, and any request to another session's files.
