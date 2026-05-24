# Network WebMCP Strategy

Status: strategy only. Do not ship runtime WebMCP tools in v1.

## Candidate Visible Tools

- Public discovery: summarize visible chapters, guilds, locations, initiatives, public steward profiles, and approved impact context.
- Public map and listings: explain visible filters, selected-node details, public JSON route status, and route-to-route navigation.
- Public contribution paths: focus or prefill visible public forms only when the form is already on screen.
- Local development diagnostics: report visible route, layout, accessibility, console, `/llms.txt`, and WebMCP discovery status from the browser-proof lane.

## Forbidden Tools

- Directus private records, pending intake, steward review notes, emails, IP addresses, user agents, spam metadata, database credentials, or admin-only procedures.
- Hidden admin actions, database migrations, operational content writes, destructive operations, deploys, or background-only actions.
- Any tool that bypasses the public/private projection contracts in `packages/agent`, `packages/shared`, or generated public snapshots.

## User Confirmation And Public Safety

- Runtime tools must be page-visible, page-scoped, and exposed only when the normal UI state already supports the action.
- Form submission, edits, invitations, imports, publishes, or any state-changing action must require an explicit user confirmation in the visible UI.
- Tool output must come from public page DOM, public JSON routes, or approved snapshot data. Private Directus or database state is never a WebMCP source.

## Proof Before Runtime

- `bun run agentic:check` and the relevant `.plans` status must be green or explicitly explained.
- `bun run agentic:browser-proof <route>` must capture screenshots at 375 / 1024 / 1440, accessibility-tree/axe results, console/page errors, overflow, CLS, `/llms.txt`, reduced-motion behavior, and WebMCP discovery.
- A Chrome DevTools MCP or Puppeteer WebMCP pass must prove `list_webmcp_tools` / tool discovery returns only expected visible tools and `execute_webmcp_tool` cannot access forbidden state.
- Candidate tools need deterministic tests for schema validation, strict code-side input handling, graceful errors, and post-action UI state before any origin-trial or production exposure.
