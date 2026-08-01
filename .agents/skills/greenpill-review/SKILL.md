---
name: greenpill-review
description: Run the Greenpill Network production-readiness review for a PR, branch diff, package, or file. Use for regression safety, requirement closure, privacy boundaries, fresh validation, and apply-fixes review work in this repository.
---

# Greenpill Network review

This is the Codex discovery entrypoint for the repository's canonical review workflow.

Before reviewing or changing code, read
[`../../../.claude/skills/review/SKILL.md`](../../../.claude/skills/review/SKILL.md)
completely and follow it as the source of truth.

- Keep the default review read-only.
- When the user explicitly asks to fix findings, use the canonical `apply_fixes` mode and read
  [`../../../.claude/skills/review/apply-fixes.md`](../../../.claude/skills/review/apply-fixes.md)
  completely before editing.
- Load any other file required by the canonical skill for the resolved scope.
- Preserve the canonical review output contract, evidence gates, and recommendation rules.

Invoke this repository workflow as `$greenpill-review` or select **Greenpill Review** from the
Codex skill list. Codex's built-in `/review` remains a separate built-in review mode.
