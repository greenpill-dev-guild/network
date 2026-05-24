# Greenpill Network WebMCP Strategy

Status: strategy only. Do not ship runtime WebMCP tools in v1.

## Candidate Visible Tools

- Public website: summarize visible chapters, guilds, projects, locations, impact sources, and homepage sections from rendered content.
- Map and directory surfaces: filter or focus visible map/list items using normal page controls.
- Public JSON routes: explain `/locations.json` and `/impact-sources.json` as approved public projections.
- Editorial docs: retrieve visible public page headings and links for navigation help.

## Forbidden Tools

- Directus private reads or writes, database access, pending intake, steward review notes, emails, IP addresses, user agents, spam metadata, or internal admin state.
- Private Fly service actions, environment variables, deploy actions, migrations, or credential inspection.
- Hidden actions outside the visible public website UI.
- Destructive operations, bulk content edits, or publishing actions.

## Proof Before Runtime

- `bun run agentic:check` and the relevant `bun run agentic:verify <route>` loop pass on representative routes.
- Axe/accessibility checks from the existing UI verify script remain clean or explicitly triaged.
- Tool descriptions name only public projections and visibly available controls.
