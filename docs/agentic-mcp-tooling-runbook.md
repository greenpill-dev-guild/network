# Agentic MCP and Tooling Runbook

Status: operating guide for Greenpill Network public website work, especially the June 2026 improvement pass.

This repo already has several agent-facing surfaces. Use them as distinct tools, not as one generic "MCP" layer.

## Operating Principles

- Repo-native proof is the source of truth. MCP and browser tools help inspect, explain, and debug, but they do not replace `bun run agentic:check`, `bun run ui:verify`, focused tests, screenshots, or `.plans` evidence.
- WebMCP is client-side and page-scoped. It is not a backend MCP server, does not expose resources or prompts, and must not read Directus private state, database credentials, pending intake, steward notes, emails, hidden admin actions, destructive operations, or background-only actions.
- Browser MCP runs must use an isolated or non-default profile. Do not connect agent tooling to a logged-in personal browser profile when cookies, Directus sessions, steward/admin state, or private tabs could be exposed.
- No project-scoped `.mcp.json` is currently the contract for this repo. Treat MCP availability as local/session-specific unless a future change explicitly adds project-scoped MCP config.
- Baseline target remains Baseline Widely Available for website work. Use current Modern Web Guidance before adopting experimental browser features or changing browser proof.

## Current Tool Map

| Tool surface | Primary use | Do not use it for | Proof surface |
| --- | --- | --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `packages/website/CLAUDE.md` | Always-loaded repo rules, package boundaries, safety constraints, and proof expectations. | Replacing source inspection or plan status. | Read before work starts. |
| `.plans/**` | Execution truth for scoped initiatives, handoffs, and completion evidence. | Creating parallel planning truth in ad hoc docs. | `bun run plans:validate`; update status/evidence when a planned task moves. |
| `packages/website/DESIGN.md` and `gp-tokens.css` | Website design system, token contract, layout and accessibility guardrails. | One-off styling outside the token system. | `bun run ui:check`; rendered screenshots from `ui:verify`. |
| `bun run agentic:check` | Fast advisory proof: plan validation plus source UI guardrails. | Final rendered UI sign-off. | Must pass or have an explicit caveat. |
| `bun run ui:verify <route>` / `bun run agentic:browser-proof <route>` | Rendered browser proof at 375 / 1024 / 1440, screenshots, accessibility tree, axe, layout, CLS, `/llms.txt`, and WebMCP discovery. | Design review by source code only. | Inspect `packages/website/.ui-verify/*.png` and `report.json`; read the 375px screenshot first. |
| Targeted tests such as `bun run test:home-map:browser`, `bun run test:map-nodes`, `bun run test:agent` | Public/private projection contracts, map interactions, and API/content behavior. | Broad visual approval. | Use when map, content projection, agent API, or public JSON routes change. |
| WebMCP runtime pilot in `packages/website/src/scripts/webmcp.ts` | Read-only page tools for visible public page and homepage map state: `describe_greenpill_network_page`, `summarize_greenpill_network_map`. | Writes, form submission, Directus/admin access, hidden data, private snapshot reads, or workflow automation. | Browser proof must detect only expected tools; expansion requires a spec and forbidden-state evals. |
| Chrome/Brave DevTools MCP | Advisory browser inspection: DOM/accessibility snapshot, console, network, performance traces, Lighthouse, and WebMCP listing when repo proof cannot explain a runtime issue. | A replacement for repo checks or a connection to personal browser profile state. | Isolated profile, route URL, viewport, screenshot or snapshot, console/network summary, and tool listing. |
| Playwright/CDP scripts | Repeatable route flows, interaction smoke tests, screenshots, and regression checks. | Manual design taste calls. | Prefer repo scripts before ad hoc browser automation. |
| Figma/Stitch/design prompts | Design intent, component comparison, and handoff quality. | Runtime proof, privacy proof, or accessibility proof. | Map design decisions back to `DESIGN.md`, tokens, and screenshots. |

## June Website Workflow

1. Define the route or surface: homepage map, chapter page, guild page, garden page, library page, or public content route.
2. Check whether the work belongs to an active `.plans` initiative. If it does, keep `.plans/.../status.json`, handoffs, and evidence current.
3. Read the relevant guidance before editing:
   - `AGENTS.md`
   - `CLAUDE.md`
   - `packages/website/CLAUDE.md`
   - `packages/website/DESIGN.md`
   - `docs/agentic-webmcp-strategy.md`
   - `docs/chrome-platform-tracker.md`
4. Use Modern Web Guidance for browser-facing changes, especially if introducing platform features, animation, forms, accessibility behavior, or WebMCP changes.
5. Make the smallest coherent change. Keep public website state separate from Directus/admin/private runtime state.
6. Run source proof:
   ```sh
   bun run agentic:check
   ```
7. Run rendered proof for affected routes:
   ```sh
   bun run ui:verify /
   bun run ui:verify /chapters
   ```
   Inspect the screenshots, especially the 375px output, before declaring the UI done.
8. Add targeted tests when behavior changes:
   ```sh
   bun run test:home-map:browser
   bun run test:map-nodes
   bun run test:agent
   ```
9. Use DevTools MCP only when the repo-native proof cannot answer a runtime question. Keep it isolated and capture the evidence bundle.
10. Summarize closure with commands, results, screenshots/reports inspected, and any remaining manual risk.

## WebMCP Expansion Rule

The current runtime WebMCP pilot is read-only and public-safe. Before adding any new WebMCP tool, write an approval-ready spec that includes:

- tool name, description, and input schema;
- the exact visible UI state that makes the tool available;
- public/private data boundary;
- forbidden states and forbidden outputs;
- user confirmation requirements for any future write-like behavior;
- wrong-tool, wrong-argument, stale-state, and forbidden-data evals;
- proof commands and expected `list_webmcp_tools` output.

Do not add WebMCP tools for form submission, edits, invitations, imports, publishing, Directus/admin operations, private snapshot reads, credentials, or hidden background behavior without explicit approval and a separate proof plan.
