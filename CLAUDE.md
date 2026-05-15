# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Greenpill Network website — a pure static Astro 5 site with local file-backed Keystatic content authoring, featuring a book library, interactive chapter map, podcast section, and a force-directed knowledge graph explorer.

**Domain:** greenpill.network

## Commands

- `bun install --frozen-lockfile` — install the checked-in dependency graph.
- `bun run dev` — run the local Astro dev server and Keystatic authoring UI.
- `bun run build` — produce the static site in `dist/`.
- `bun run preview` — preview the built static site locally.

## Architecture

**Framework:** Astro 5 with TypeScript strict mode, Tailwind CSS 3, React peer dependencies for Keystatic, GSAP (animations), force-graph (explorer visualization).

**Output mode:** Pure static (`output: 'static'`). The production build emits static files from `dist/`; there is no Node adapter or deployed Keystatic backend in this pass. Keystatic is enabled only for local dev/file-backed authoring. Image service uses `passthroughImageService()`.

### Pages

- `src/pages/index.astro` — Landing page: hero with animated image sequence, canvas-based chapter map, book library with translation modals, podcast section, footer with image sequence animation.
- `src/pages/explorer.astro` — Knowledge graph explorer with force-graph visualization, dataset switching, search, node inspector.

### Content (Keystatic CMS)

All content is file-based JSON in `src/content/`, managed locally via Keystatic (`keystatic.config.ts`):

- **Collections:** `books`, `chapters`, `guilds`, `projects`, `stories`
- **Singletons:** `siteSettings`, `podcast`, `socialLinks`

Content schema validation is in `src/content/config.ts` (Zod).

### Client-Side Scripts (`src/scripts/`)

- `explorer.ts` — Force-graph initialization, dataset loading from `/data/greenpill-graph/*.graph.json`, node/link filtering, search, inspector panel
- `map.ts` — Canvas-based chapter map, loads locations from `/locations.json`, click detection, location sidebar
- `image-sequence.ts` — Scroll-driven frame animation (hero: 38 frames, footer: 32 frames)
- `modal.ts`, `dropdown.ts`, `mobile-menu.ts`, `parallax.ts` — UI interactions

### Graph Data

Graph JSON files live in `public/data/greenpill-graph/` (served statically) and `data/greenpill-graph/` (source). Key datasets:
- `greenpill-podcast-network-overlap.graph.json` — Bridge view (default)
- `greenpill-network.graph.json` — Full network layer

Node types: Network, Podcast, Bridge. Edge types: relationships, capital_flows.

### Styling

Tailwind config defines custom fonts (Inter, Volkhov) and brand colors: green (`#C2E812`), yellow (`#FFD972`), dark-green (`#254D32`), mid-green (`#4FB477`). Global styles in `src/styles/global.css`, explorer-specific styles in `src/styles/explorer.css`.

### Layouts

- `BaseLayout.astro` — HTML shell with meta tags, Google Fonts, Google Analytics, favicon
- `ExplorerLayout.astro` — Explorer-specific layout

## Supply-chain and agent safety

- Do not install or upgrade Bun, Python, or package-manager dependencies unless the user explicitly approves that install in the current task.
- Prefer existing repo tooling, checked-in lockfiles, and standard library options over adding new packages.
- Treat `package.json`, lockfiles, package-manager config, `.github/workflows/**`, `AGENTS.md`, `CLAUDE.md`, `.codex/**`, and `.claude/**` as security-sensitive surfaces. Call out any changes to them in final summaries.
- Keep dependency installs on the checked-in Bun lockfile path and preserve the `bunfig.toml` release-age gate configuration.
