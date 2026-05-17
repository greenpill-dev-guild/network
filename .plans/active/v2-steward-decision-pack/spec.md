# V2 Steward Decision Pack Spec

## Goal

Resolve the open steward-facing content and narrative choices that affect V2 homepage, onboarding, and proof-of-activity direction, then feed those choices back into the canonical V2 artifacts and implementation handoff.

## Current State

- `.plans/active/public-website-design-implementation/artifacts/v2/` contains the canonical V2 brief, architecture, delivery plan, and AI build manifest.
- `.plans/active/public-website-design-implementation/artifacts/steward/steward-brief-one-page.md` is the short context brief intended for stewards.
- `.plans/active/public-website-design-implementation/artifacts/steward/steward-telegram-polls.md` contains the proposed Telegram polls and nomination prompt.
- `.plans/` is now the repo-local planning surface for live decision packs, sequencing, status, and handoffs.
- The public site architecture and workspace boundary are already locked enough that the steward question set should focus on narrative, proof, and featured examples.

## Scope

- share the steward one-page brief
- share the three Telegram polls and nomination prompt
- collect steward votes and thread replies
- produce a short response summary under `reports/`
- update `.plans/active/public-website-design-implementation/artifacts/v2/v2-brief.md`, `.plans/active/public-website-design-implementation/artifacts/v2/v2-delivery-plan.md`, and `.plans/active/public-website-design-implementation/artifacts/v2/ai-build-manifest.yaml` only if the responses change phase scope, featured examples, or homepage priority
- keep the steward-facing docs linked from this hub so they are not treated as a separate planning surface

## Constraints

- `.plans/` carries planning, research, execution sequencing, readiness, handoffs, and follow-up truth.
- Runtime contracts and executable artifacts live under `packages/`.
- This repo starts with manual plan updates plus validation, not automation claiming.
- Keep `status.json` taxonomy current enough for future filtering and dependency checks.
- Do not reopen the current GitHub Pages public deploy, Fly backend direction, Privy-first auth posture, workspace boundary, or Keystatic public-content default from this decision pack.
- The brief should stay short enough for stewards to read before answering the polls.

## Decision Areas

- Homepage promise: what should a non-Web3 visitor understand in the first 30 seconds?
- Proof of activity: what should show that Greenpill is alive right now?
- Greenpill Garden framing: flagship program, one program in a broader story, support example, bridge, or lighter mention?
- Featured examples: which chapters, guilds or pods, and builder projects deserve first-release real estate?

## Downstream Interfaces

- `.plans/active/public-website-design-implementation/artifacts/v2/v2-brief.md`: update audience language, success signals, or narrative defaults if steward decisions change them.
- `.plans/active/public-website-design-implementation/artifacts/v2/v2-delivery-plan.md`: update P1 content priorities and acceptance criteria if the homepage proof model changes.
- `.plans/active/public-website-design-implementation/artifacts/v2/ai-build-manifest.yaml`: update open decision inputs and any implementation-facing feature priorities after the response summary is accepted.
- `.plans/active/public-website-design-implementation/artifacts/prompts/`: keep design and repo-refinement prompts pointed at the latest steward decision summary.

## Open Questions

- Which poll option wins for the first 30-second homepage promise?
- Which three proof signals should lead the homepage?
- How strongly should Greenpill Garden lead the first release?
- Which nominated chapters, guilds or pods, and builder projects are ready to feature with real content?
