# Public Website Design Implementation Plan

## Sequencing

- [x] Confirm the relevant repo baseline and package structure
- [x] Fold short-lived V2 docs, research, prompts, and design artifacts into this active hub
- [x] Refine scope and defaults in `spec.md`
- [x] Update `status.json` for the design implementation hub
- [x] Capture the handoff in `handoffs/README.md`
- [x] Run the data-first foundation wave before token/component/page implementation
- [x] Complete the Schema Delta Pass for the public Keystatic/Astro content model in `996ce51`
- [x] Document local-only Keystatic access control and public/private content boundaries
- [ ] Audit `artifacts/hifi/CLAUDE_CODE_HANDOFF.md` for stale repo paths before using it as an implementation prompt
- [ ] Port `artifacts/hifi/hifi/gp-tokens.css` into `packages/website`
- [ ] Build a temporary token/component review surface for visual QA
- [ ] Implement the public shell and reusable primitives
- [ ] Implement the home page against the high-fidelity reference
- [ ] Implement chapter, library, story, guild, and garden surfaces in focused passes
- [ ] Run visual checks at desktop, tablet, and mobile breakpoints for each implemented surface
- [ ] Run `node scripts/plan-hub.mjs validate`

## Cleanup Follow-Up

- [ ] Archive this hub when the design implementation ships or is superseded.
- [ ] Do not recreate root `docs/` unless a future plan defines durable operator/user docs with ownership.
