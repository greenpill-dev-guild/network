# Greenpill production map flow — review

**Date:** 2026-05-20 · **Target:** https://greenpill.network/ (homepage map) + `agent.greenpill.network`
**Scope:** read-only review. No code edited. No node submitted (see P0).

## Headline

**Production is in LIVE onboarding mode** (`/map/state` → `intakeMode: "live"`). A submitted
node is **auto-approved and appears on the public map immediately**, with no steward moderation.
This is the opposite of the expected moderated / local-pending behavior. It is a **runtime
database flag**, not a code defect — there is no repo change that fixes it. Flip it before the demo.

## Answers to the review questions

| Question | Answer |
|---|---|
| Is realtime/live adding on? | **YES.** `intakeMode: "live"`. Add-node copy reads "Live onboarding is on — your node appears on the public map right after you submit." Submissions auto-approve. |
| Is the moderated add-node flow safe to demo? | **Not currently active** — production is live, not moderated. The moderated code path (submit → `pending` → device-local only) was confirmed by reading the code but **not exercised live** (doing so requires flipping the flag and submitting). Once the flag is moderated, the flow is safe. |
| P0 / P1 blockers? | **1 P0 (operational, not code):** live mode is on. No P0/P1 *code* defects found. |
| P2 visual/UX polish before a call? | See P2 list below. |

## P0 — live onboarding is on (operational)

- **Evidence:** `https://agent.greenpill.network/map/state` → `"intakeMode":"live"`; agent `/ready` shows DB connected (so this is a real configured value, not an error fallback); the rendered add-node panel shows the live-mode copy.
- **Impact:** any visitor can add a node that goes public on the homepage instantly — no moderation, no email verification, no per-submission rate limit. Spam/abuse/inappropriate-content exposure during a public demo.
- **Remediation (pick one), then re-check `/map/state`:**
  - Directus admin (`network-admin`): intake schema → `map_node_intake_settings` → set `live_onboarding_enabled` = false.
  - SQL on the agent DB: `UPDATE intake.map_node_intake_settings SET live_onboarding_enabled = false WHERE id = 1;`
  - `intakeMode` is read fresh per request (no cache), so `/map/state` flips to `"moderated"` on the next call.
- **Not done by Claude:** requires production DB / Directus access and is a sensitive config change — left for an operator.

## Checklist results

- **Chapter nodes render & clickable** — ✅ 12 chapter nodes render as lime dots; each is a real `<a href="/chapters/…">` (verified hrefs, e.g. `/chapters/cape-town`). 16 steward nodes also render.
- **Hover/focus → node card + relationship highlighting** — ✅ focus card populates (role / name / meta, e.g. "Chapter · Greenpill Nigeria · Lagos / Awka"). Steward nodes light up 13–15 adjacent threads on focus. ⚠️ See P2: chapter nodes highlight 0 threads (they're not thread endpoints).
- **Add-node panel opens cleanly (desktop + mobile)** — ✅ desktop 2-col; at ≤640px container the grid + theme options collapse to single column, footer stacks, submit goes full-width, **zero horizontal overflow** (verified via container-query at 375px).
- **Form validation** — ✅ name/place/lat/long/email required (generic error, no network call); exactly-4-themes enforced (live `n/4` counter, 5th checkbox disables at 4, `<4` blocked on submit); valid email required. Invalid submits never reach the network (confirmed: 0 POSTs to `/map-nodes`).
- **`/map/state` reports `intakeMode`** — ✅ yes (`"live"`), plus themes, 12 chapter nodes, counts, source status.
- **Approved nodes public via `/map-nodes/public`** — ✅ endpoint healthy, returns `{"nodes":[]}` (0 approved submissions today). In live mode a new submission would appear here immediately.
- **`/map/edit/` handles missing/invalid token** — ✅ no token → "invalid or expired" panel; garbage token → token stripped from URL (no referrer leak), edit-session POST round-trips (CORS preflight 204), agent returns `invalid_edit_link`, page lands on the same "invalid" panel. No hang, no console errors.

## P2 — polish (not blockers)

1. **Hovering a chapter node dims the whole web and highlights no connections.** Relationship threads are steward↔steward; chapter nodes are rarely thread endpoints, so focusing one just dims everything (0 adjacent threads). Stewards *do* light up their connections, but they sit under the larger chapter dots and are nearly impossible to hover with a mouse. For a demo of "a living network," the obvious targets (the 12 chapter dots) don't showcase relationships. Possible fix (needs design sign-off): when a chapter is focused, also treat its stewards' threads as adjacent. By-design today (code comment: the web stays member-centric).
2. **No live evidence of submitted member/edge rendering** because there are 0 approved submissions — the dynamic member layer and server-generated edges are untested visually in production (only the chapter/steward SSR layer is currently exercised).

## Health snapshot

- `agent /ready`: `{"ok":true,"database":{"configured":true,"connected":true,"status":"ok"}}`
- `/map/state` from `https://greenpill.network`: GET 200, no console errors, CORS OK.
- CORS allowlist (code): greenpill.network, www.greenpill.network, localhost:3301, 127.0.0.1:3301.

---
*Untracked deliverable — not committed. No code was changed during this review.*
