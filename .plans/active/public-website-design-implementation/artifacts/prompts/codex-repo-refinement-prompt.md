# Codex Repo Refinement Prompt

Use this prompt after the synthesis pass to make the plan repo-aware before implementation starts.

```text
Validate the Greenpill Website V2 docs against the actual repo and refine the implementation handoff.

Primary docs:
- .plans/active/public-website-design-implementation/artifacts/v2/v2-brief.md
- .plans/active/public-website-design-implementation/artifacts/v2/v2-architecture.md
- .plans/active/public-website-design-implementation/artifacts/v2/v2-delivery-plan.md
- .plans/active/public-website-design-implementation/artifacts/v2/ai-build-manifest.yaml
- .plans/active/v2-steward-decision-pack/

Repo context to verify:
- Astro routes and layouts
- Keystatic configuration
- current content collections and singletons
- current Charmverse-dependent links
- deferred knowledge commons graph plan and chapter map behavior

Tasks:
1. confirm that the proposed routes and entities fit the current Astro and Keystatic foundation
2. update any route, phase, or content-model assumptions that conflict with the repo
3. sharpen acceptance criteria so an implementation agent can code without inventing behavior
4. identify any hidden migration work caused by hardcoded links or data shape limitations
5. refresh the AI build manifest so it becomes the canonical implementation handoff
6. validate that active follow-up state lives in `.plans/`, not as loose planning notes in `.plans/active/public-website-design-implementation/artifacts/v2/`

Deliver:
- findings or risks
- recommended doc changes
- updated manifest and phase scopes
- plan hub updates or validation notes
- a suggested implementation order for the next coding pass
```
