# Greenpill Network Website

Pure static Astro site for `greenpill.network` with file-backed Keystatic content.

## Commands

```sh
bun install --frozen-lockfile
bun run dev
bun run build
bun run preview
```

`bun run build` emits the static site to `dist/`. Keystatic is enabled only during local dev for file-backed content authoring; this repo does not deploy a Node-backed CMS server or Keystatic API route.

Public assets are served from `public/`, including `/images/*`, `/pdf/*`, `/data/*`, and `/locations.json`.
