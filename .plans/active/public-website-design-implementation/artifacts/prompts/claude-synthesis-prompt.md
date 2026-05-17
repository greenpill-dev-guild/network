# Claude or GPT Pro Synthesis Prompt

Use this prompt after the workshop when you have the transcript, async thread export, and board export ready.

```text
You are synthesizing the Greenpill Website V2 workshop into the artifact set stored in .plans/active/public-website-design-implementation/artifacts/v2.

Inputs:
- workshop transcript
- async forum thread export
- board export with wireframes and sticky notes
- existing repo-grounded docs:
  - .plans/active/public-website-design-implementation/research/greenpill-charmverse-transition.md
  - .plans/active/public-website-design-implementation/research/greenpill-ui-ux-audit.md
  - .plans/active/public-website-design-implementation/research/greenpill-website-direction.md
  - .plans/active/public-website-design-implementation/artifacts/v2/v2-brief.md
  - .plans/active/public-website-design-implementation/artifacts/v2/v2-architecture.md
  - .plans/active/public-website-design-implementation/artifacts/v2/v2-delivery-plan.md
  - .plans/active/v2-steward-decision-pack/ when unresolved steward decisions need execution tracking

Your job:
1. extract decisions, open questions, and parking lot items
2. summarize the strongest user needs and onboarding pain points
3. update the canonical docs for:
   - v2-brief
   - v2-architecture
   - v2-delivery-plan
4. update or create a plan hub when a decision still needs steward input or follow-up execution
5. preserve the current phase order unless the workshop clearly changed it
6. call out contradictions or unresolved choices explicitly

Output format:
- Decisions
- Open questions
- Recommended updates to each doc
- Changes to phase scope
- Plan hub updates needed
- Risks or ambiguities that still need repo-aware validation

Rules:
- Prefer synthesis over verbatim recap.
- Do not invent technical details that conflict with the repo-grounded docs.
- If the workshop introduces a new route, entity, or phase dependency, call it out clearly.
```
