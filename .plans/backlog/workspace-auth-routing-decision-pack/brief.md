# Workspace Auth Routing Decision Pack

**Stage**: `backlog`

## Why This Exists

`packages/workspace` reserves the future authenticated surface at `app.greenpill.network`, but the repo should not let an agent choose auth, protected routes, ownership rules, or private data flows opportunistically. Those choices affect schema shape, API boundaries, deploy topology, and privacy.

## Desired Outcome

Before any workspace runtime code is scaffolded, this hub should produce a reviewed decision pack that defines:

- public vs protected workspace routes
- user and steward ownership rules
- auth/session provider criteria and selected default
- workspace-to-agent/API boundary
- private data classes that must never reach the static website
- acceptance gates for implementation readiness

## Non-Goals

- Do not scaffold workspace UI, auth middleware, database tables, or package dependencies in this hub.
- Do not replace Directus as the operational admin surface.
- Do not expose Directus private state, database credentials, pending intake, steward notes, or hidden admin actions to the public website or future browser bundles.
