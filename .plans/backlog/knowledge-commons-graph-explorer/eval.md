# Knowledge Commons Graph Explorer Evaluation

## Acceptance Checks

- The public Astro site has no explorer route, explorer component, explorer layout, explorer script, explorer stylesheet, or served graph JSON.
- `package.json` and `bun.lock` no longer reference the removed graph visualization dependency.
- `.plans/backlog/knowledge-commons-graph-explorer/artifacts/greenpill-graph/` remains available as non-public source research data.
- The backlog hub validates with `node scripts/plan-hub.mjs validate`.
- The production build completes and does not generate a public explorer page.
- Future graph work is framed around source lineage, maturity states, relationship grammar, public-use boundaries, and stewardship.

## Public Readiness Gate

The graph can be reconsidered for public release only when:

- every node and relationship has visible source lineage;
- maturity and review states are present in the data model;
- relationship types and confidence values have a documented grammar;
- entries have steward ownership or an explicit unknown steward state;
- public, member-only, and internal-only boundaries are represented;
- high-review surfaces have review paths, including indigenous knowledge, people maps, local chapter data, and public relationship claims;
- exports work in Markdown/YAML, CSV, and JSON-LD before any graph database decision.

## Proof

- Record validation commands and build output after implementation.
- Record any remaining references found by `rg` and classify them as historical research docs, future planning docs, or runtime/public-site references.
