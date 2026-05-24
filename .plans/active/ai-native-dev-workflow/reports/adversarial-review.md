# Adversarial Review Report

## Purpose

Run a read-only review that actively looks for ways agent work could be wrong, leaky, over-scoped, or under-verified in Greenpill Network.

## Default High-Risk Surface

Public map state, operational content snapshots, Directus permissions, agent API routes, CORS/cache behavior, and private-field leakage.

## Review Lenses

- Privacy and data leakage.
- Security, auth, permissions, secrets, and destructive operations.
- Public-contract or payload drift.
- UX/accessibility regressions.
- Scope drift or competing truth surfaces.
- Missing verification or unverifiable claims.

## Finding Format

| Severity | Finding | Evidence | Recommendation | Disposition |
|---|---|---|---|---|
| P1 | Evidence artifacts were templates only, so completion could be claimed without a real ledger or scorecard. | Initial artifact files had blank templates. | Record the scaffold-hardening lane as the first measured lane and keep public-site adoption as future work. | closed |
| P2 | UI/content/platform lanes were all ready before their evidence existed. | Initial `status.json` marked `ui`, `content`, and `platform` ready. | Mark platform completed with evidence; keep UI/content blocked until future adoption intentionally scopes those surfaces. | closed |
| P2 | Validation commands mixed commands with prose. | Initial eval had conditional prose inside backticked command text. | Split executable commands from run conditions. | closed |
| P3 | Public-safe payload proof could be overstated. | No `packages/website`, `packages/shared`, `packages/agent`, or Directus/admin files changed. | Keep browser and contract proof out of scope until those surfaces are touched. | no-action |

## Proof Limit

This report is read-only. It does not authorize fixes unless the user explicitly approves implementation.
