---
name: dev-surface
description: Use when working in Greenpill Network and needing to start, reuse, open, inspect, validate, or clean up this repo's local development surfaces through the shared dev-surfaces workbench.
---

# Greenpill Network Dev Surface

Use the global workbench CLI instead of starting duplicate servers manually:

```sh
dev-surfaces status
dev-surfaces up greenpill-network
dev-surfaces open greenpill-network
dev-surfaces logs greenpill-network:<surface>
dev-surfaces down greenpill-network
```

Stable fallback path: `/Users/afo/Code/dev-surfaces/bin/dev-surfaces.js`.

## Surfaces

- `website`: Astro website on `3301`
- `directus`: Directus admin/CMS on `3302`
- `agent`: agent/API on `3303`
- `postgres`: Postgres on `3304`

## Validation Notes

- Website review should start the Astro dev server promptly and return the local URL.
- Keep the public website, Directus/Postgres, and agent API boundaries distinct.
- `directus` and `agent` depend on `postgres`; the workbench starts `postgres` first even though the UI ports remain lower in the public convention.
- After changing local port docs or dev scripts, run `dev-surfaces doctor`.

Never kill unknown port occupants. If a port is busy and not owned by dev-surfaces, report the PID/command and ask for direction.
