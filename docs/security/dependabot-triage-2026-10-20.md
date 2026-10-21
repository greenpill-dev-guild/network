# Dependabot triage — 2026-10-20

The three sharp advisories are reachable during website builds on the current
default branch. The chapter-image copier decodes remote images directly with
sharp, independently of Astro's disabled image service. Pinning sharp 0.35.5
and overriding Astro's older range addresses those native-library risks without
an Astro major upgrade. The listed template XSS sinks have no CMS-controlled
input path in the inspected source. A planned Astro migration is still warranted
to remove the vulnerable framework version and retire the remaining alerts.

## Audited state

Read with `gh api repos/greenpill-dev-guild/network/dependabot/alerts --paginate`:
13 open alerts, comprising 1 critical, 5 high, 5 medium and 2 low. All identify
`packages/website/package.json`. Base: default branch `main`, commit
`2546a58b22c012cddc9b98cf535e27d973d28ba5`.

The original local checkout was at `b1ead9d`, with unrelated Directus changes.
Its lack of a direct sharp dependency is not representative of current `main`.
This audit and PR use an isolated worktree based on the verified default branch.
On that branch, Astro is 5.18.1 and sharp is a direct website dependency at
`^0.34.5`, as well as Astro's optional dependency at `^0.34.0`.

## One decision per alert

“Does not apply” means the advisory's exploit conditions are absent in this
configuration and source revision; it does not mean the installed package is
patched. The calls below concern the website and its build process.

| Alert / severity / patched version | Applies? | Evidence | Action |
| --- | --- | --- | --- |
| [#33 — Astro AVIF RCE](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2) · critical · 7.2.8 | Does not apply to the disabled Astro optimizer; **the underlying libheif risk applies to the custom build pipeline** | E1 disables Astro transforms. E2 nevertheless sends fetched bytes to sharp, including AVIF. Upstream's Astro fix raises the sharp minimum to 0.35.4. | Use sharp 0.35.5 for every dependency path. Keep the Astro alert open pending the separately approved framework migration; do not claim a version-based closure. |
| [#37 — sharp/librsvg CVE-2026-96889](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) · high · 0.35.5 | **Applies at build time** | E2 accepts SVG bytes from published chapter image sources. RCE additionally depends on the advisory's glibc/runtime conditions; these are not assumed absent on GitHub's Linux runners. | Pin/override sharp 0.35.5 with patched bundled librsvg; exercise SVG decoding. |
| [#36 — sharp/libheif GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) · high · 0.35.4 | **Applies at build time** | E2 decodes untrusted AVIF bytes. URL approval, a download size limit and `failOn: 'error'` do not prevent native decoder memory corruption. | Pin/override sharp 0.35.5; exercise AVIF decoding. |
| [#35 — sharp/libvips CVE-2026-33327/33328/35590/35591](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) · high · 0.35.0 | **Applies at build time** | E2 does not restrict decoder formats; GIF and TIFF reach libvips. Applicability does not require every decoder named by the advisory to be enabled. | Pin/override sharp 0.35.5; exercise GIF/TIFF decoding. |
| [#28 — Astro Host-header SSRF](https://github.com/withastro/astro/security/advisories/GHSA-2pvr-wf23-7pc7) · high · 6.4.6 | Does not apply | E1 publishes only static files. There is no production `app.render()`/Node adapter serving prerendered error pages from a request-derived origin. The advisory also excludes the dev server. | Retain static deployment; resolve package alert through planned migration. |
| [#27 — Astro slot-name XSS](https://github.com/withastro/astro/security/advisories/GHSA-8hv8-536x-4wqp) · high · 6.3.3 | Does not apply | E5: all three named slot assignments are literal `slot="side"` on the design-system page. There are no `client:*` islands or dynamic slot names in public source. | No template patch needed; resolve package alert through planned migration. |
| [#34 — Astro base path authorization bypass](https://github.com/withastro/astro/security/advisories/GHSA-376h-93r7-7g6f) · medium · 7.2.4 | Does not apply | E1 has no non-root `base`, production Astro request router or pathname authorization middleware. | Resolve package alert through planned migration. |
| [#32 — Astro `renderHTMLElement` spread-name XSS](https://github.com/withastro/astro/security/advisories/GHSA-f48w-9m4c-m7f5) · medium · 7.0.6 | Does not apply | E4 has no component extending native `HTMLElement` and no untrusted-keyed attribute object. The special component/runtime preconditions are absent. | No template patch needed; resolve package alert through planned migration. |
| [#30 — Astro View Transition animation XSS](https://github.com/withastro/astro/security/advisories/GHSA-4g3v-8h47-v7g6) · medium · 7.1.0 | Does not apply | E5: no `transition:animate`, transition helper import or CMS-driven animation properties. Literal CSS `transition:` declarations and `@view-transition` are separate browser features. | No template patch needed; resolve package alert through planned migration. |
| [#29 — Astro spread attribute-name XSS](https://github.com/withastro/astro/security/advisories/GHSA-jrpj-wcv7-9fh9) · medium · 6.4.6 | Does not apply in current callers | E3/E4: CMS fields populate values/children at fixed attribute names. None of the three rest-prop components receives a CMS object spread; HomeMap's remaining spread is the literal `{ hidden: true }`. Static output alone would not protect this sink. | Keep explicit prop mapping. Added a real static-build regression with hostile CMS text and object keys; framework patch remains migration work. |
| [#25 — Astro `define:vars` script escape XSS](https://github.com/withastro/astro/security/advisories/GHSA-j687-52p2-xcff) · medium · 6.1.6 | Does not apply | E5: no `define:vars` anywhere under `src`. HomeMap's sole `set:html` serializes code-owned map theme constants, not operational content. | No template patch needed; resolve package alert through planned migration. |
| [#31 — Astro `transition:*` hydrated island XSS](https://github.com/withastro/astro/security/advisories/GHSA-7pw4-f3q4-r2p2) · low · 7.0.4 | Does not apply | E5: no `transition:persist`, `transition:scope`, `transition:persist-props` or public `client:*` components. | No template patch needed; resolve package alert through planned migration. |
| [#26 — Astro server-island parameter replay](https://github.com/withastro/astro/security/advisories/GHSA-xr5h-phrj-8vxv) · low · 6.1.10 | Does not apply | E1/E5: static output, no server islands, no `server:defer`, no encrypted runtime island endpoint. | Resolve package alert through planned migration. |

## Source evidence and data flow

- **E1 — Configuration/deployment.** `packages/website/astro.config.mjs:16-20`
  enables React/Keystatic only for development, sets `output: 'static'` and uses
  `passthroughImageService()`. No adapter or `base` is configured.
  `.github/workflows/github-pages.yml` installs the frozen Bun lockfile, builds
  against the live public snapshot and uploads only `packages/website/dist`.
  Static HTML still passes through Astro's template renderer at build time.
- **E2 — Active native decoding.**
  `packages/website/src/lib/operational-content.ts:28-57` creates the chapter
  copier and applies it to public snapshot chapters.
  `src/lib/chapter-image-copies.ts:13,342-369,390-392` imports sharp, sniffs
  downloaded bytes and decodes them into WebP/JPEG. Four image fields are
  selected by a code-owned list at lines 126-136. Content approval establishes
  publication permission, not the safety of compressed image bytes. A malicious
  image could compromise the build runner under the affected native libraries;
  no public Astro server is required.
- **E3 — CMS to templates.** The snapshot loader validates public/private and
  publication boundaries with shared `assertPublicOperationalContentSnapshot`,
  then `getOperationalCollection` returns records as `entry.data`. This assertion
  is not an HTML sanitizer or an exhaustive rejection of unknown keys.
  Chapter/guild pages select fields explicitly: e.g.
  `pages/chapters/[slug].astro:121-128` passes a theme as child text and a URL as
  `href`; `pages/guilds/[slug].astro:75-82` likewise maps link fields explicitly.
  HomeMap constructs a new `ChapterNode` from selected fields before rendering
  fixed `data-*` attributes. No snapshot record becomes an attribute-name map.
- **E4 — All template spreads.** `components/ui/Button.astro:13-25`,
  `Chip.astro:14-33`, and `EmailInput.astro:12-24` collect `...attrs` from
  `Astro.props`. Every caller supplies named source-code props; their keys are
  not obtained from CMS records, query parameters, `Object.fromEntries` or
  nested component spreads. CMS data can affect prop values and child text.
  `HomeMap.astro:488` spreads only `{ hidden: true }`. Other JavaScript object
  spreads in HomeMap and the image copier do not render attribute names.
- **E5 — Other sinks.** All 35 `.astro` files and the remaining scripts/types
  under `src` were searched. An independent parse with the installed Astro
  compiler confirmed exactly the four template spreads and the slot/JSON-script
  attributes described above. `design-system.astro:121,146,211` uses literal
  `slot="side"`; `SectionHeader.astro:22` has a literal slot name. No
  `define:vars`, Astro transition directives, `client:*`, `server:defer`,
  `Astro.slots` or native `HTMLElement` subclass component exists. The JSON
  script at `HomeMap.astro:397` serializes `THEME_INFO`, derived at lines 15-37
  from code-owned aliases and `PUBLIC_MAP_THEMES` in `packages/shared/src/map-state.ts`.

These are reachability findings for the 13 listed advisories, not an exhaustive
claim about all possible XSS or URL handling in the site.

## Bounded remediation

Changed security-sensitive files: root `package.json` adds
`"overrides": { "sharp": "0.35.5" }`; website `package.json` pins its direct
sharp dependency to `0.35.5`; `bun.lock` records that graph. The override is
necessary because changing the direct dependency alone would allow Astro's
`^0.34.0` optional dependency to retain a separate vulnerable copy. Astro stays
at 5.18.1. The lockfile changes are limited to sharp, its platform binaries,
libvips bundles, and required semver/WASM-runtime dependencies.

[Sharp 0.35.5](https://sharp.pixelplumbing.com/changelog/v0.35.5/) was published
2026-09-27; npm records `2026-09-27T13:46:24.509Z`, well outside the three-day
gate. `bunfig.toml` retains `minimumReleaseAge = 259200` and
`saveTextLockfile = true`. [Sharp 0.35's breaking changes](https://sharp.pixelplumbing.com/changelog/v0.35.0/)
were checked against the copier: Node 22 meets the new Node minimum; the code
uses `failOn`, not removed `failOnError`, and emits WebP/JPEG, not AVIF. The
new default channel limit is covered for the supported fixtures. No globally
installed libvips is assumed; the installed bundled library versions are checked.

`scripts/chapter-image-copies.test.ts` adds benign AVIF/SVG/GIF/TIFF decoder
fixtures through the real copier, checking output format, dimensions and EXIF
removal. `scripts/chapter-image-build.integration.ts` adds hostile chapter text
and object keys to its existing local snapshot fixture, checking escaped text
and absence of injected elements/event attributes in chapter and directory HTML.
These fixtures do not attempt native-code exploitation.

The build proof now puts its disposable output under the website's ignored
`node_modules` directory. Astro 5 stages external output in `.astro` and then
removes that directory, which fails when `.astro` is a VM bind mount; output
inside the website root avoids that cleanup path without changing application
configuration or the production build.

An in-place Bun install initially left Astro's old nested sharp on disk even
though the lockfile listed only 0.35.5. A fresh frozen install after clearing
only this worktree's generated dependency contents proved that the website and
Astro resolve to the **same sharp 0.35.5 module**. Its bundled libraries report
libvips 8.18.7, libheif 1.23.5 and librsvg 2.63.2. Existing checkouts should use
a clean install when adopting this override; the CI runner starts clean.

The three sharp package alerts should close after merge and dependency-graph
refresh. The ten Astro alerts still match the installed framework version.
The patched sharp dependency addresses the critical advisory's native cause,
but does not change Astro's version-based alert status. No alerts were dismissed.

## Astro 5 → 7 migration proposal — requires separate approval

The migration is warranted for supported framework fixes and retirement of the
ten remaining version alerts. The audit did not establish a currently reachable
template exploit requiring an emergency framework migration. Do not run the
major upgrade as part of this sharp-only PR.

| Area | Concrete scope and acceptance evidence |
| --- | --- |
| Package compatibility | Select an age-eligible Astro 7 release at least 7.2.8, with sharp at least 0.35.5. Pinned `@keystatic/astro` 5.0.6 advertises only Astro 2–5; published 6.0.0 advertises 5/6/7. Update the integration deliberately and verify the local Keystatic editor. Select a compatible React integration rather than blindly using latest; existing 4.4.2 brings Vite 6. Registry metadata shows React integration 6.0.0 uses Vite 8; current 7.1.0 introduces an additional transformer peer. |
| Astro 6 transition | Check Vite 7 integration/config compatibility, then Vite 8 for Astro 7. Recheck existing shared aliases, dev file access and polling. Zod 4 affects the three editorial collection schemas in `src/content.config.ts`, particularly partial nested `.default({})` values and inferred types; preserve existing default behavior with fixture builds. Node 22 already meets the platform minimum. [Astro 6 guide](https://docs.astro.build/en/guides/upgrade-to/v6/) |
| Template/compiler behavior | Astro 7's Rust compiler, whitespace defaults and CSS serialization affect all 35 `.astro` files. Validate tag closure/nesting and inline text spacing. Astro 6 changes script/style ordering: HomeMap has two of each; check map initialization and style precedence. Review `GpLayout.astro` global styles and scripts across routes. [Astro 7 guide](https://docs.astro.build/en/guides/upgrade-to/v7/) |
| Static content and routes | Keep static/passthrough deployment. Verify the JSON/XML and copied-image endpoints without trailing slashes, snapshot environment selection, chapter/guild `getStaticPaths`, and all three editorial collections. Production reads the live operational snapshot; both fallback and local remote-fixture builds must pass. Existing `process.env` snapshot settings need no automatic conversion to `import.meta.env`. |
| Type debt | Preserve the checked-in website `astro/tsconfigs/strict` configuration. Measure Astro diagnostics before and after each major; fix new diagnostics without casts that hide invalid state or broader suppressions. Treat enabling `strictest` as separate work. Current baseline is 54 errors, including 29 in HomeMap, 7 in GardenAssessment and 4 in LinkRow; remaining errors span 11 diagnostics in other Astro files and 3 in the image/snapshot libraries. Dominant issues are possibly-undefined values, DOM/collection argument types and `exactOptionalPropertyTypes`. The prior ~51 count is stale. No claim can be made about the post-upgrade delta until Astro 7 is actually checked. |
| Completion | Run the five requested lanes, chapter-image unit/build proofs, `agentic:check`, and authenticated Brave route/interaction proof at 375/1024/1440. Include homepage map, chapter/directory, guild, garden, library, stories, editor and JSON endpoints. Compare generated route/HTML output and public privacy projections. Review a draft migration PR and bot results before merge. |

Recommended sequence: first merge the reviewed sharp fix, then perform an
approved migration in an isolated branch with checkpoints after Astro 6 and
Astro 7. Avoid coupling a framework migration to a general HomeMap rewrite.
Keep the sharp override until the selected Astro dependency graph itself
requires a patched version and a clean install proves no older copy remains.

## Validation

All required lanes passed on the final clean frozen installation in the
isolated Linux arm64 dev machine (Bun 1.3.10, Node 22.23.3). The requested
Node 22.22.1 directory was prepended to the invoking shell's PATH; the repo
shim routes Bun commands into the machine, whose installed Node is 22.23.3.

| Check | Result |
| --- | --- |
| `bun install --frozen-lockfile` after clearing this worktree's dependency contents | Pass; 1,364 packages; unchanged patched lockfile |
| `bun run typecheck` | Pass |
| `bun run build:website` | Pass; 47 pages |
| `bun run ui:check` | Pass; 0 hard, 0 warning source violations |
| `bun run test:content` | Pass; 32 tests |
| `bun run --cwd packages/website check` (`astro check` lane) | Pass; 55 files, 0 errors, 0 warnings, 6 hints; same result before the change |
| `bun run test:chapter-image-copies` | Pass; 27 tests, including the four new decoder cases |
| `bun run test:chapter-image-copies:build` | Pass; real local-snapshot build, image outputs, hostile CMS text and object keys |
| `bun run agentic:check` | Pass; guidance, browser policy, 10 plan hubs and UI source guardrails |
| Compiler AST enumeration | 35 templates; four spreads, three literal named-slot assignments and one code-owned JSON script |
| Strictest audit using a temporary config extending `astro/tsconfigs/strictest` | 54 pre-existing errors both before and after; diagnostic locations/codes/messages identical. Temporary config removed. This is a recorded failing audit, not a passing required lane. |
| `git diff --check` | Pass |

The initial external-output integration failure was the VM `.astro` cleanup
problem described above; the final proof passes with its disposable output
inside the website root. Authenticated browser QA and Linux x64 native execution
were not performed; no rendered browser proof is claimed. No website template,
CSS, runtime source, workflow, deployment configuration or Bun policy changed.
