# Apply Fixes Mode

Sub-file of the [review skill](./SKILL.md). Use only through `/review --mode apply_fixes` or equally
explicit natural-language fix intent.

## Workflow

1. Run the canonical review protocol and report findings first.
2. Fix Agent-Fix-Now must-fix and should-fix findings.
3. Leave nice-to-have items as recommendations unless requested.
4. Preserve Human-Judge call-outs; do not decide dependencies, permissions, migrations,
   destructive actions, trust boundaries, or deployment policy implicitly.
5. Re-run the complete readiness review against the updated bounded feature path.
6. Issue the final verdict only from that fresh review.

Use every applicable check from
[`validation-pipeline.md`](../../context/validation-pipeline.md). Visible UI still requires
authenticated Brave proof after fixes.

`APPROVE` requires satisfied requirements, complete scope and consumer coverage, passing proof,
and empty must-fix and should-fix buckets. A blocked requirement, proof surface, or human judgment
produces `COMMENT_ONLY`; a failed check or remaining quality gap produces `REQUEST_CHANGES`.

Use the parent skill’s exact output order and severity mapping. Skipping the report phase, fresh
re-review, or explicit opt-in is an anti-pattern.
