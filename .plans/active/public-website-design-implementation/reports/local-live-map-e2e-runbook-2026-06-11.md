# Local Live Map E2E Runbook - 2026-06-11

## Scope

This is the local proof lane for the monthly-call map participation activity:
the public homepage stays static, the local agent owns live map state, and
members/stewards submit real local nodes through the same public routes the
website uses.

## Start The Local Stack

```sh
bun run dev
```

Wait for the launcher to report:

- Website: `http://localhost:3301/`
- Directus: `http://localhost:3302/`
- Agent: `http://localhost:3303/health`
- Postgres: `postgres://greenpill:greenpill@127.0.0.1:3304/greenpill_network`

The repo launcher seeds local operational content, applies migrations, runs the
Directus local bootstrap, and starts the agent with a local steward allowlist:
`local-steward@example.org=nigeria`.

## Automated Local Live Proof

In a second terminal:

```sh
bun run test:home-map:live-e2e
```

The script is local-only by default. It refuses non-local agent or database URLs
unless `--allow-nonlocal` is passed deliberately.

It verifies:

- Local agent `/health` is reachable.
- Local intake mode can be set to live.
- `POST /map-nodes` auto-approves a member submission in live mode.
- `POST /map-nodes` auto-approves the allowlisted steward submission.
- `/map/state` reports `intakeMode: "live"`.
- `/map/state` includes the public member node, public steward node, and a
  source-backed steward-to-`chapter:nigeria` edge.
- `/map/state` does not expose the private test emails or raw private note.

Unless `--keep-live` is used, the script deletes only the deterministic e2e
nodes and restores the previous local live-mode setting.

## Manual Call Rehearsal

To leave live mode on and keep the deterministic test nodes visible while you
walk the homepage:

```sh
bun run test:home-map:live-e2e --keep-live
```

Then open `http://localhost:3301/` and use the Home map add-node flow:

- A non-allowlisted email should publish as a member while local live mode is on.
- `local-steward@example.org` should publish as a steward linked to Nigeria.
- The Home map should refresh from `/map/state` without a page reload while live
  mode is active and the tab is visible.
- Private owner email and raw note text must not appear in the page DOM,
  storage, `/map/state`, or `/map-nodes/public`.

## Disable Path

After a rehearsal:

```sh
bun run test:home-map:live-e2e --disable-live
```

This removes the deterministic e2e member/steward rows and turns local Live
Onboarding Mode off. It does not delete manually submitted participant nodes.

## Remaining Launch Proof

This runbook closes the local live-mode preflight path. It does not close the
separate visual proof lane for 375 / 1024 / 1440 HiFi comparison, steward/admin
onboarding, public profile opt-ins, or the June live-session facilitation script.
