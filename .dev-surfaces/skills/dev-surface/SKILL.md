---
name: greenpill-network-dev-surface
description: Use when working in Greenpill Network and needing the Astro website, local Postgres, Directus, content bootstrap, or agent/API.
---

# Greenpill Network Dev Surface

Inside this repo, use the repo-native command:

```sh
bun install
# configure .env.local if needed
bun run dev
```

`bun run dev` runs `scripts/dev.mjs`. It starts local Postgres, waits for it, runs migrations, seeds operational content, starts the Astro website, starts Directus, runs Directus bootstrap, starts the agent/API, streams logs, and cleans up Directus/Postgres on Ctrl-C.

Expected ports:

- `3301`: Astro website
- `3302`: Directus admin/CMS
- `3303`: agent/API
- `3304`: Postgres

Useful native commands:

```sh
bun run dev
bun run dev:website
bun run dev:admin
bun run dev:agent
bun run db:local:up
bun run db:local:down
```

For cross-repo orchestration from anywhere, use the global workbench:

```sh
dev launch greenpill-network
dev launch greenpill-network:website
dev status greenpill-network
dev health greenpill-network
dev stop greenpill-network
```

Do not call `.dev-surfaces/run.mjs`; this repo should not have that wrapper.
