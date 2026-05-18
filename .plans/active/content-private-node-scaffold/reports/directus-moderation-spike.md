# Directus Moderation Spike

## Decision

Provisional go for a hands-on Directus moderation pilot, but do not couple the Greenpill schema to Directus and do not add Directus as a package dependency in this repo.

Directus fits the first steward moderation need because it can sit beside an existing SQL database, mirror the data model, expose a Data Studio for humans, and enforce role/policy/field-level access. The pilot should be deployed as a separate admin service pointed at the agent Postgres database, not as part of the static website or agent package.

## Evidence Checked

- Directus describes itself as a wrapper around an existing database and notes that its operational tables do not need to intermingle with project data: <https://directus.io/docs/getting-started/architecture>
- Directus data models support SQL-backed collections and read-only views: <https://directus.io/docs/app/data-model>
- Permissions include collection actions, item rules, validation, presets, and explicit allowed fields: <https://directus.io/docs/api/permissions>
- Directus access-control docs warn that public access is off by default and that public collection reads can expose all rows unless restricted: <https://directus.io/docs/guides/auth/access-control>
- Directus approval-workflow guidance uses custom permissions based on item field values: <https://directus.io/docs/tutorials/workflows/build-content-approval-workflows-with-custom-permissions>
- Directus Flows can automate event-driven moderation steps, but run with elevated accountability and should be restricted: <https://directus.io/docs/guides/automate/flows>

## Schema Fit

The normalized schema is compatible with a Directus-first moderation layer:

- `intake.map_node_submissions` can be the steward review collection.
- `intake.map_node_private_contacts` can be visible only to trusted stewards.
- `intake.map_node_reviews` can store review notes and status decisions.
- `intake.public_map_nodes` and `public.public_map_nodes` should remain read-only projections, not steward-editable tables.
- `impact.chapter_impact_snapshots` can remain agent-owned and read-only for admins.

The important boundary is ownership: SQL migrations in `packages/agent/migrations` remain the canonical schema. Directus may configure display, roles, policies, and workflows, but should not become the source of truth for schema changes.

## Required Directus Config

- Collections:
  - `intake.map_node_submissions`: editable only for moderation fields and status transitions.
  - `intake.map_node_private_contacts`: read-only, restricted to trusted steward/admin roles.
  - `intake.map_node_reviews`: create-only or append-oriented for reviewer notes.
  - `intake.public_map_nodes`: read-only or hidden from editors.
- Roles/policies:
  - Public role: no access to intake, impact, workspace, or audit schemas.
  - Steward moderator: app access, read pending/approved/rejected/archive rows, update status fields, create review rows, no schema/admin access.
  - Trusted steward/admin: steward access plus private contact visibility.
  - Service/admin: reserved for operators, migrations, and emergency correction.
- Field restrictions:
  - Standard stewards cannot read `ip_address`, `user_agent`, `rate_limit_key`, `spam_signals`, or raw operational metadata.
  - Private contact email visibility requires a separate trusted role.
  - `review_notes` never enters public projections.
- Workflow rules:
  - Allowed transitions: `pending -> approved`, `pending -> rejected`, `approved -> archived`, `rejected -> archived`.
  - Approval must set `approved_at`.
  - Archive must set `archived_at`.
  - Review note creation should append to `intake.map_node_reviews` rather than overwrite prior notes.

## Open Risks

- Need a hands-on container/cloud test against schema-qualified Postgres tables before committing to Directus operationally.
- Directus generated APIs should not become public ingestion APIs for `POST /map-nodes`; the Hono agent route remains the privacy-filtered public boundary.
- Status-transition enforcement should be tested in SQL or Directus policy/flow config. If Directus cannot enforce it cleanly, keep transitions in a custom admin route.
- Directus Flows are powerful enough for moderation automation, but should be disabled or restricted until roles are proven.

## Pilot Checklist

- Start Directus separately from this repo and point it at a local copy of the agent Postgres schema.
- Confirm the Data Studio can see `intake` and `impact` schema objects.
- Confirm steward role can review pending submissions without private contact access.
- Confirm trusted steward can see contact email but not raw rate-limit/IP/user-agent metadata unless explicitly granted.
- Confirm public role has no access.
- Confirm approving a row updates the public projection and rejecting/archive rows do not appear.
- Export the Directus schema/role config as deployment documentation only after the above passes.
