# Chrome DevTools MCP Network Validation - 2026-05-24

## Scope

Validate Chrome DevTools MCP as an isolated, agent-side browser quality proof lane against `greenpill/network` public homepage `/`.

Runtime WebMCP remains disabled. This pass only used Chrome DevTools MCP as an agent inspection/control tool.

## Official-Source Claims

- Chrome DevTools MCP lets coding agents inspect, debug, and modify a Chrome browser instance; Chrome warns not to expose sensitive or personal browser data to MCP clients. Source: [Chrome DevTools for agents](https://developer.chrome.com/docs/devtools/agents).
- Codex setup is done through a `codex mcp add chrome-devtools -- npx chrome-devtools-mcp@latest`-style stdio server entry. Source: [Set up Chrome DevTools MCP for Codex](https://developer.chrome.com/docs/devtools/agents/codex).
- `--isolated` runs Chrome with a temporary user data directory and avoids the user's default Chrome profile. Source: [Chrome DevTools MCP project docs](https://github.com/ChromeDevTools/chrome-devtools-mcp).
- WebMCP is different from Chrome DevTools MCP: WebMCP is a browser-tab API for page-exposed tools, currently early preview in Chromium and requires explicit browser support/flags. Source: `modern-web-guidance@latest retrieve webmcp` and [Chrome WebMCP docs](https://developer.chrome.com/docs/ai/webmcp).

## Local Setup Evidence

`codex mcp get chrome-devtools` proves the server is enabled:

```text
enabled: true
transport: stdio
command: /Users/afo/.local/share/mise/installs/node/22.22.1/bin/node
args: ... npx-cli.js -y chrome-devtools-mcp@latest ... --headless=true --isolated=true --viewport=1440x1000 --no-usage-statistics --no-performance-crux --redact-network-headers --category-experimental-webmcp ...
```

The current Codex session did not expose a direct `mcp__chrome-devtools__*` tool namespace through `tool_search`, so validation used a minimal MCP stdio client harness instead of pretending direct in-chat tool access existed.

Harness:

- `/Users/afo/Documents/Codex/2026-05-23/goal-goal-deep-audit-and-improve/scripts/validate-chrome-devtools-mcp-network.mjs`

Evidence output:

- `/Users/afo/Documents/Codex/2026-05-23/goal-goal-deep-audit-and-improve/chrome-devtools-mcp-network-evidence/summary.json`
- `/Users/afo/Documents/Codex/2026-05-23/goal-goal-deep-audit-and-improve/chrome-devtools-mcp-network-evidence/desktop-fullpage.png`
- `/Users/afo/Documents/Codex/2026-05-23/goal-goal-deep-audit-and-improve/chrome-devtools-mcp-network-evidence/mobile-fullpage.png`
- `/Users/afo/Documents/Codex/2026-05-23/goal-goal-deep-audit-and-improve/chrome-devtools-mcp-network-evidence/lighthouse/report.html`
- `/Users/afo/Documents/Codex/2026-05-23/goal-goal-deep-audit-and-improve/chrome-devtools-mcp-network-evidence/lighthouse/report.json`

## Commands Run And Results

```text
codex mcp list
# Result: chrome-devtools enabled.

codex mcp get chrome-devtools
# Result: enabled true; stdio transport; isolated/headless/no-usage-stats/redacted-header config present.

bun run agentic:check
# /Users/afo/Code/greenpill/network
# Result: passed. 8 plan hubs validated; ui source check 0 hard, 0 warn.

bun run agentic:browser-proof /
# /Users/afo/Code/greenpill/network
# Result: passed. Homepage verified at 375, 1024, 1440; llms.txt ok by repo check; WebMCP not_configured; 0 hard, 0 warn.

bun --bun astro preview --host 127.0.0.1 --port 4322
# /Users/afo/Code/greenpill/network/packages/website
# Result: preview served http://127.0.0.1:4322/

curl -I http://127.0.0.1:4322/
# Result: HTTP/1.1 200 OK.

/Users/afo/.local/share/mise/installs/node/22.22.1/bin/node scripts/validate-chrome-devtools-mcp-network.mjs http://127.0.0.1:4322/
# Result: passed. MCP initialized and exercised page, snapshot, screenshot, console, network, WebMCP listing, Lighthouse, and performance trace tools.

npx modern-web-guidance@latest search "Chrome DevTools MCP Lighthouse agentic browsing"
# Result: returned WebMCP, privacy, accessibility, and agentic WebMCP guidance entries.

npx modern-web-guidance@latest retrieve webmcp
# Result: confirmed WebMCP is early preview, browser-tab/client-side only, and strategy/runtime safety requirements remain separate from DevTools MCP.
```

## DevTools MCP Proof

MCP server initialized successfully:

```json
{
  "name": "chrome_devtools",
  "title": "Chrome DevTools MCP server",
  "version": "1.0.1",
  "protocolVersion": "2025-06-18"
}
```

Tools listed included:

```text
new_page, list_pages, take_snapshot, take_screenshot, list_console_messages,
list_network_requests, get_network_request, evaluate_script, resize_page,
list_webmcp_tools, lighthouse_audit, performance_start_trace, performance_stop_trace
```

Tools exercised successfully:

- Opened `http://127.0.0.1:4322/`.
- Captured desktop accessibility snapshot and full-page screenshot.
- Captured mobile snapshot and full-page screenshot after `resize_page` to `375x900`.
- Listed console messages and network requests.
- Retrieved failed request details.
- Evaluated page state: title `Greenpill Network`, h1 `A global regenerative network.`, `webmcp: false`.
- Listed WebMCP tools: `No WebMCP tools available.`
- Ran Lighthouse desktop navigation audit.
- Ran performance trace.

## Brave Validation

After the Chrome for Testing pass, the same MCP harness was run against Brave because Brave is the preferred human-facing WebMCP test browser.

Brave executable:

```text
/Applications/Brave Browser.app/Contents/MacOS/Brave Browser
```

Brave version:

```text
Brave Browser 148.1.90.124
```

The Brave run used the same isolated/headless/no-usage-stats/redacted-header MCP arguments and wrote evidence to:

```text
/Users/afo/Documents/Codex/2026-05-23/goal-goal-deep-audit-and-improve/chrome-devtools-mcp-network-brave-evidence/
```

Result:

- MCP initialized successfully through Brave.
- Tool list matched the Chrome for Testing run.
- Desktop and mobile screenshots were captured.
- Accessibility snapshots, console/network inspection, Lighthouse, WebMCP listing, and performance trace all executed.
- `list_webmcp_tools` returned `No WebMCP tools available`, which is expected because runtime WebMCP has not been implemented on the Network homepage.
- Lighthouse results matched the Chrome for Testing run: Accessibility 100, Best Practices 96, SEO 100, Agentic Browsing 67.

Recommendation: use Brave as the primary runtime WebMCP validation browser, but keep Chrome for Testing as the stable baseline/fallback. Do this through a separate `brave-devtools` MCP entry or explicit executable override rather than replacing the existing `chrome-devtools` server.

## Findings

DevTools MCP is useful as an advisory proof lane now. It caught two issues that the repo-native rendered proof did not elevate:

1. Console/network failure:

```text
GET http://127.0.0.1:3303/map/state [net::ERR_CONNECTION_REFUSED]
```

This comes from homepage progressive enhancement expecting the local agent service. It may be expected during website-only preview, but it is still a real browser console error and Lighthouse best-practices failure.

2. Lighthouse Agentic Browsing `llms.txt` recommendation failure:

```text
llms.txt does not follow recommendations
Error: File does not appear to contain any links.
```

The repo `ui:verify` check only proved that `llms.txt` exists and is readable; DevTools MCP/Lighthouse provided a stronger quality signal.

Lighthouse scores:

```text
Accessibility: 100
Best Practices: 96
SEO: 100
Agentic Browsing: 67
Passed: 55
Failed: 2
```

Performance trace:

```text
LCP: 219 ms
CLS: 0.00
CrUX field data: n/a for local page
```

## Recommendation

Keep Chrome DevTools MCP as an advisory validation lane for now, not a hard gate.

Promote it to the standard Network UI proof workflow for manual close-out checks when:

- the route is public/non-authenticated;
- the MCP server runs with `--isolated`;
- the pass captures screenshot, accessibility snapshot, console/network summary, WebMCP listing, Lighthouse, and performance trace;
- findings are compared against `packages/website/.ui-verify/report.json`;
- noisy local-only dependencies are either launched, mocked, or explicitly classified.

Do not promote to a brittle CI gate yet. The current console failure depends on whether the local agent API is running, and Lighthouse Agentic Browsing recommendations are still maturing.

## Next Close-Out Steps

1. Decide whether Network homepage proof should start the local agent service or whether `/map/state` failures should degrade without console errors during website-only preview.
2. Update `packages/website/public/llms.txt` to include recommended public links, then rerun Lighthouse Agentic Browsing.
3. Add a short Network doc/runbook entry for the DevTools MCP advisory pass once direct Codex-session tool exposure is confirmed after session restart.
4. Repeat this pattern on one more public-only repo before cross-repo adoption.

## Confidence

- MCP configured in Codex: 95%.
- MCP server callable and operational: 92%.
- Network homepage browser evidence captured correctly: 90%.
- DevTools MCP should become a standard advisory lane: 84%.
- Ready for hard-gated CI use: 45%.
