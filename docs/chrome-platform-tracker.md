# Chrome Platform Tracker

Last refreshed: 2026-05-24

Guidance sources: `modern-web-guidance@latest`, Chrome cross-document View Transitions, Chrome WebMCP, Lighthouse Registered WebMCP tools, Chrome soft-navigation measurement, Chrome DevTools Performance reference, and Chrome DevTools MCP.

| Feature | Current adoption | Candidate surface | Risk | Proof command | Status |
| --- | --- | --- | --- | --- | --- |
| `/llms.txt` and agent-readable public routes | `/llms.txt`, `/locations.json`, `/impact-sources.json`, and browser-proof checks are already present. | Keep public route summaries aligned with approved snapshot projections. | Stale public context can mislead agents; private Directus state must never leak. | `bun run agentic:browser-proof /` | ship |
| Semantic, native, accessible DOM | Website guide requires Baseline Widely Available, semantic controls, accessibility tree checks, and route proof. | Map, listing, search, chapter, guild, and impact-source pages. | Visual map/list richness could drift into non-semantic generated density. | `bun run agentic:check` and `bun run ui:verify /` | ship |
| Astro cross-document View Transitions | Not previously adopted on the MPA surface. | Same-origin public navigation, starting with the global layout as a progressive enhancement. | Limited availability and motion sensitivity; must not block navigation or hide focus. | `bun run ui:verify /` | prototype |
| WebMCP runtime tools | Strategy and discovery probes only; no runtime tools approved. | Future public map/list/search explanation tools that only expose visible public state. | Private node intake, steward notes, Directus data, pending submissions, or admin actions could leak if scoped incorrectly. | Chrome DevTools MCP `list_webmcp_tools` must return only expected visible tools before any runtime experiment. | watch |
| Chrome DevTools MCP proof | `ui:verify` already captures screenshots, accessibility, `/llms.txt`, reduced motion, CLS, console/page errors, and WebMCP discovery. | Use as a complement for hard browser-runtime failures and public launch proof. | Connecting to a real Chrome profile can expose logged-in tabs or profile state. | `bun run agentic:browser-proof /` plus isolated Chrome DevTools MCP pass when needed. | ship |
| Core Web Vitals and soft navigations | Source proof records CLS; no full RUM lane is wired for LCP/INP or future soft-navigation segmentation. | Public homepage, map/list/search, and future workspace app if it becomes SPA-driven. | Soft-navigation APIs are still developing; CrUX still measures hard navigations for now. | Plan first; future proof should record LCP, INP, CLS, `navigationType`, and route labels. | watch |
| HTML-in-Canvas, Declarative Partial Updates, `streamHTML` | No production dependency. | Research notes only if an explicit plan asks for a spike. | Experimental APIs could reduce accessibility or lock the site to non-Baseline behavior. | Documented spike with accessibility-tree proof before implementation. | watch |

## Adoption Notes

- Keep public projection boundaries in `packages/shared`, `packages/agent`, and generated snapshots as the source of truth for anything agents can read.
- WebMCP remains frozen at strategy/proof level until the user explicitly approves runtime `navigator.modelContext.registerTool`, `toolname`, or `tooldescription` work.
- View Transitions must be treated as progressive enhancement: standard navigation remains the fallback, and reduced-motion users do not opt into animated transitions.

## Operational Follow-Up

- Repo-native task surface: `.plans/active/public-website-design-implementation/plan.todo.md` under `Modern Web UI Follow-Ups`.
- Next proof task: prove `/` after the Astro MPA View Transition opt-in with isolated Chrome DevTools MCP or the repo browser lane, recording screenshot/DOM or accessibility snapshot, console/page errors, `/llms.txt`, reduced motion, CWV/navigation fields, and `list_webmcp_tools`.
