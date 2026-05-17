# Greenpill Network Website

Pure static Astro site for `greenpill.network` with file-backed Keystatic content.

## Commands

```sh
bun install --frozen-lockfile
bun run dev
bun run dev:agent
bun run build
bun run preview
```

`bun run build` emits the static site to `dist/`. Keystatic is enabled only during local dev for file-backed content authoring; this repo does not deploy a Node-backed CMS server or Keystatic API route.

Public assets are served from `public/`, including `/images/*`, `/pdf/*`, and `/data/*`.
`/locations.json` is generated at build time from `src/content/chapters/*` so the chapter collection remains the map source of truth.

## Contract checks

```sh
bun run test:agent
bun run test:chapter-impact
bun run test:map-nodes
bun run plans:validate
```

The contract tests verify that the agent routes, chapter impact payloads, public map payloads, and plan hubs preserve the public/private boundary.

## Local Backend

```sh
cp .env.example .env.local
bun run db:local:up
bun run db:migrate
bun run dev:agent
```

The local agent listens on `http://127.0.0.1:8787` with the default `.env.example` values. Use `bun run db:local:down` to stop the local Postgres container.
