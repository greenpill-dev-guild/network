# Validation Pipeline

This is the single definition of Greenpill Network review evidence. Skills reference it rather
than maintaining parallel command lists.

## Review Readiness Gate (non-mutating)

Run these fresh for plain `/review`:

```bash
bun run typecheck
bun run plans:validate
bun run build
```

Add every focused check whose surface is touched:

- Agent routes, readiness, or moderation: `bun run test:agent`
- Chapter impact contracts: `bun run test:chapter-impact`
- Operational content, Directus-owned public projections, or snapshots: `bun run test:content`
- Map editing routes: `bun run test:map-edit`
- Map/member node contracts: `bun run test:map-nodes`
- Plan hub tooling or `.plans/**`: `bun run test:plans`
- Homepage map behavior: `bun run test:home-map:browser:required` (fails without Chrome instead of
  skipping), labeled `headless Chrome` on this machine and `CI Chrome` in Actions
- Map-edit browser behavior: `bun run test:map-edit:browser:required` (fails without Chrome instead of
  skipping), labeled `headless Chrome` on this machine and `CI Chrome` in Actions
- Website, UI, CSS, accessibility, or web design: run `bun run agentic:guidance`,
  `bun run agentic:check`, then `bun run ui:verify <route>` for labeled rendered proof
- Browser-proof policy changes: `bun run check:browser-verification-policy`

A required failure means `REQUEST_CHANGES`. A required check that cannot run means
`COMMENT_ONLY`; do not silently replace or downgrade proof.

Visible UI requires labeled rendered proof under `AGENTS.md` § Browser Evidence. Authenticated
Brave is required only for the authenticated surface class listed there; when it cannot be reached
for such a change, mark that proof pending with the reason, never passed.

When full local-stack behavior is relevant and `bun run dev` is already running, verify:

```text
http://localhost:3302/server/ping
http://localhost:3303/ready
http://localhost:3303/content/public-snapshot
```

Do not start duplicate development surfaces. Production readiness claims require live production
endpoint proof when deployment behavior is in scope.

## Ship Gate

Before a PR or merge-readiness claim, run the Review Readiness Gate, all applicable focused checks,
and any branch or release checks required by `AGENTS.md`. Ship work may include formatting or other
mutating steps only when the user explicitly requested that workflow.

## Partial Evidence

For an isolated inner-loop fix, run the narrowest focused test that proves the changed behavior.
Partial evidence never substitutes for the complete gate when returning `APPROVE`.
