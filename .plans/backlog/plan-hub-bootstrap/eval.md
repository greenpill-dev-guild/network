# Plan Hub Bootstrap Evaluation

## Acceptance Checks

- The repo contains a durable `.plans/` surface with the expected stage layout
- The feature template can scaffold a complete hub
- Validation fails on missing required root/template/hub files, invalid lane contracts, or invalid taxonomy shape
- The self-hosting backlog hub passes the same validation contract
- `docs/v2/` and `.plans/` stay clearly separated in purpose

## Proof

- `node --test scripts/plan-hub.test.mjs`
- `node scripts/plan-hub.mjs validate`
- manual review of `.plans/README.md` plus the saved self-hosting backlog hub

## Exit Criteria

This hub has done its job when the planning surface is present, validated, and easy to reuse for later work without pulling product/architecture truth away from `docs/v2/`.
