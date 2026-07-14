# Cross-Package Verify Mode

Sub-file of the [review skill](./SKILL.md). Use through
`/review --mode verify_only --scope cross-package`.

## Sequence

1. Load the authoritative requirements from the enclosing review or supplied scope.
2. Map changed public surfaces to direct callers and downstream consumers.
3. Verify in dependency order: `shared` -> `agent` and `admin` -> `website` and `workspace`.
4. Run the Review Readiness Gate and applicable conditional checks from
   [`validation-pipeline.md`](../../context/validation-pipeline.md).
5. Report evidence package by package and identify consumers that could not be verified.
6. Stop unless explicit fix intent is present.

Pay special attention to public/private projections, public agent route contracts, approved
operational snapshots, migration ownership, and the rule that Directus is not the public API.

A standalone green `verify_only` pass ends `COMMENT_ONLY`; it does not prove that the complete
readiness review occurred. Failed evidence or a confirmed cross-package gap ends
`REQUEST_CHANGES`. Only an enclosing readiness review may return `APPROVE`.

Use the parent skill’s exact output order and severity mapping. Omitting affected consumers,
package-by-package evidence, or dependency-order verification is an anti-pattern.
