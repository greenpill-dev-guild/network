# Plan Hub Bootstrap Plan

## Sequencing

- [x] Establish the `.plans/` stage layout and explain the repo-specific contract in `.plans/README.md`
- [x] Create a reusable feature template with the v1 lane model and required files
- [x] Add `scripts/plan-hub.mjs` with `scaffold` and `validate`
- [x] Add focused node tests that prove scaffold output and validation failures
- [x] Validate root layout, template completeness, hub completeness, lane contracts, and basic taxonomy shape
- [x] Save `self-hosting-and-git-sovereignty` as a separate backlog hub under the new contract
- [x] Run `node --test scripts/plan-hub.test.mjs`
- [x] Run `node scripts/plan-hub.mjs validate`

## Follow-Up

- [ ] Decide later whether this repo needs active-plan review loops or automation prompt sources
- [ ] Keep any future plan-system expansion inside this hub instead of inventing a second planning shape
