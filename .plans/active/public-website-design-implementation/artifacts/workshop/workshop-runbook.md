# Greenpill Website V2 Workshop Runbook

## Session Objective

Use a simple, engaging 2-hour Miro workshop to surface the lived Greenpill journey, identify what is worth keeping from the current site, clarify what must migrate from Charmverse, and generate the strongest ideas for V2.

This session is successful if it produces:

- a clear retrospective on how people found and experienced Greenpill
- a list of what feels worth keeping from the current website
- a practical view of what stewards actually need from Charmverse and what must migrate first
- a board full of bold ideas, flows, and opportunities for V2
- a clean input set that can be synthesized over the weekend into phased specs and migration work starting Monday

## Roles

- Facilitator
  - guides the room, keeps energy high, and helps people stay inside the current frame
- Scribe
  - captures structured notes in `workshop-notes-template.md` and tags ideas as keep, migrate, or explore
- Board lead
  - manages the Miro board, clusters stickies, and helps turn conversation into visual structure
- Timekeeper
  - protects the flow and calls when it is time to move frames

One person can hold more than one role, but facilitator and scribe should stay separate if possible.

## Pre-Work Checklist

- Set up a single Miro board with four frames:
  - Greenpill journey
  - Current website: keep, improve, remove
  - Charmverse and workspace migration
  - Bold ideas for V2
- Add a simple legend for sticky colors:
  - green = what worked
  - yellow = what is unclear or missing
  - pink = pain point
  - blue = idea or opportunity
- Seed each frame with 3 to 5 starter prompts so people are not staring at a blank canvas.
- Pull in async thread quotes or notes as pre-seeded stickies where useful.
- Confirm recording and transcript capture.
- Have someone ready to export the Miro board immediately after the session.

## Inputs In The Room

- workshop transcript
- Miro board
- async forum input as seeded context on the board

## Miro Structure

Use one board with four frames. Keep the workshop visual, conversational, and light.

### Frame 1: Greenpill Journey

Purpose:

- get people talking from lived experience instead of abstract product opinions
- surface what drew people in, what helped them orient, and where they got stuck

Prompt ideas:

- How did you first find Greenpill?
- What pulled you in or made you stay?
- What helped you get oriented?
- What felt confusing, slow, or hard to discover?

### Frame 2: Current Website

Purpose:

- move from personal journey into the current site
- identify what feels strong already and what is clearly not serving the network

Prompt ideas:

- What do you like about the current website?
- What should definitely stay?
- What feels outdated, hidden, or misleading?
- What parts of the current site do you actually use?

### Frame 3: Charmverse and Workspace Migration

Purpose:

- shift from onboarding into operational needs
- understand what stewards actually use Charmverse for and what must migrate first

Prompt ideas:

- What do you currently use Charmverse for?
- What would break if it disappeared tomorrow?
- What needs a website-native home first?
- What can stay external temporarily?

### Frame 4: Bold Ideas for V2

Purpose:

- create space for imagination after grounding in journey, present state, and migration reality
- collect features, flows, and network needs without forcing feasibility in the room

Prompt ideas:

- What would make the site feel truly useful for your community?
- What would make onboarding feel alive and welcoming?
- What would make Greenpill’s network more legible?
- What would you love to see even if it is not Phase 1?

## Agenda

| Time | Segment | Lead Questions | Required Output |
| --- | --- | --- | --- |
| 0-10 min | Welcome and framing | Why are we here, what are the four frames, and how will this board be used afterward? | Shared understanding of flow and output |
| 10-35 min | Frame 1: Greenpill journey | How did you find Greenpill, what worked, what did not? | Retrospective insights on onboarding and belonging |
| 35-60 min | Frame 2: Current website | What is working on the site now, what should stay, what needs to change? | Keep, improve, remove signals for the current site |
| 60-90 min | Frame 3: Charmverse and workspace migration | What do stewards use Charmverse for, what must migrate first, what can wait? | Migration needs and workspace priorities |
| 90-115 min | Frame 4: Bold ideas for V2 | What would make the site genuinely exciting, useful, or alive for the network? | Idea pool for future phases |
| 115-120 min | Close | What are the strongest takeaways and what happens next? | Clear next step into synthesis over the weekend |

## Suggested Facilitation Flow

For each frame:

1. Give 2 to 3 minutes of silent sticky-note writing.
2. Invite short share-outs from a few participants.
3. Cluster notes live on the board.
4. Name the strongest patterns out loud before moving on.

This keeps the session participatory without becoming chaotic.

## Facilitation Rules

- Keep the room in lived experience first, solutioning second.
- Do not force feasibility debates during the bold-ideas frame.
- If someone jumps ahead into implementation details too early, capture it as a sticky and keep moving.
- Use simple labels while clustering:
  - keep
  - pain point
  - migrate
  - future idea
- The board is the primary artifact. The transcript only supports later synthesis.

## What To Pull Out After The Workshop

Before the synthesis pass, extract:

- strongest onboarding insights from Frame 1
- strongest keep and change signals from Frame 2
- must-migrate and can-wait items from Frame 3
- aspirational features and themes from Frame 4
- repeated patterns across all four frames

The synthesis pass can then translate these into:

- a community-facing one-pager
- strategy and architecture docs
- phased specs
- migration priorities
- an AI implementation handoff

## Immediate Post-Workshop Steps

Within 24 hours:

1. Export the Miro board and transcript.
2. Cluster and label the strongest notes while the discussion is still fresh.
3. Update `workshop-notes-template.md` from the board, not from memory.
4. Use the synthesis prompt to turn the four frames into V2 docs and the delivery plan.
5. Use Codex to validate the output against the repo and refresh `ai-build-manifest.yaml`.
6. Start content migration planning on Monday using the synthesized migration priorities.
