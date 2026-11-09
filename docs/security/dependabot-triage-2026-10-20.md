# Dependabot triage, 2026-10-20 (refreshed 2026-11-08)

The three sharp advisories are reachable during website builds on `main`. The
chapter-image copier decodes remote images directly with sharp, independently
of Astro's disabled image service. Pinning sharp 0.35.5 and overriding Astro's
older range addresses those native-library risks without an Astro major
upgrade. The listed Astro template sinks have no CMS-controlled input path in
the inspected source. A planned Astro migration is still warranted to remove
the vulnerable framework version and retire the remaining alerts.

## Audited state

Read on 2026-11-08 with
`gh api 'repos/greenpill-dev-guild/network/dependabot/alerts?state=open' --paginate`:
14 open alerts (1 critical, 5 high, 6 medium, 2 low), all against
`packages/website/package.json`.

This triage covers the 13 alerts that were open on 2026-10-20 (#25 to #37).
Alert #38 (Astro XSS through unescaped `<script>` and `<style>` content in
JSX/MDX rendering, patched in 7.3.2) opened on 2026-10-28; its call was added
with the Astro 7 migration on 2026-11-08.

The first pass read `main` at `2546a58` on 2026-10-20. This refresh re-checked
every evidence line below against `main` at `367824a` (2026-11-08). Astro is
still 5.18.1. sharp is a direct website dependency at `^0.34.5` and Astro's
optional dependency at `^0.34.0`.

## One decision per alert

"Does not apply" means the advisory's exploit conditions are absent in this
configuration and source revision. It does not mean the installed package is
patched. The calls below concern the website and its build process.

| Alert, severity, patched version | Applies? | Evidence | Action |
| --- | --- | --- | --- |
| [#33 Astro AVIF RCE](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2) · critical · 7.2.8 | Not to the disabled Astro optimizer; **the underlying libheif risk applies to the custom build pipeline** | E1 disables Astro transforms. E2 still sends fetched bytes to sharp, including AVIF. Upstream's Astro fix raises the sharp minimum to 0.35.4. | Use sharp 0.35.5 on every dependency path. Keep the Astro alert open until the separately approved framework migration; do not claim a version-based closure. |
| [#37 sharp/librsvg CVE-2026-96889](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) · high · 0.35.5 | **Applies at build time** | E2 accepts SVG bytes from published chapter image sources. RCE also depends on the advisory's glibc and runtime conditions, which are not assumed absent on GitHub's Linux runners. | Pin and override sharp 0.35.5 with its patched bundled librsvg; exercise SVG decoding. |
| [#36 sharp/libheif GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) · high · 0.35.4 | **Applies at build time** | E2 decodes untrusted AVIF bytes. URL approval, a download size limit and `failOn: 'error'` do not prevent native decoder memory corruption. | Pin and override sharp 0.35.5; exercise AVIF decoding. |
| [#35 sharp/libvips CVE-2026-33327/33328/35590/35591](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) · high · 0.35.0 | **Applies at build time** | E2 does not restrict decoder formats, so GIF and TIFF reach libvips. Applicability does not require every decoder the advisory names to be enabled. | Pin and override sharp 0.35.5; exercise GIF and TIFF decoding. |
| [#28 Astro Host-header SSRF](https://github.com/withastro/astro/security/advisories/GHSA-2pvr-wf23-7pc7) · high · 6.4.6 | Does not apply | E1 publishes only static files. There is no production `app.render()` or Node adapter serving prerendered error pages from a request-derived origin. The advisory also excludes the dev server. | Keep the static deployment; resolve the package alert through the planned migration. |
| [#27 Astro slot-name XSS](https://github.com/withastro/astro/security/advisories/GHSA-8hv8-536x-4wqp) · high · 6.3.3 | Does not apply | E5: the three named slot assignments are literal `slot="side"` on the design-system page, and the one outlet is a literal `<slot name="side">`. There are no `client:*` islands or dynamic slot names. | No template patch needed; resolve the package alert through the planned migration. |
| [#34 Astro base path authorization bypass](https://github.com/withastro/astro/security/advisories/GHSA-376h-93r7-7g6f) · medium · 7.2.4 | Does not apply | E1 has no non-root `base`, no adapter and no request router. `src/middleware.ts` (added 2026-11-06) only marks external links in rendered HTML; it does no path-based authorization. | Resolve the package alert through the planned migration. |
| [#32 Astro `renderHTMLElement` spread-name XSS](https://github.com/withastro/astro/security/advisories/GHSA-f48w-9m4c-m7f5) · medium · 7.0.6 | Does not apply | E4 and E5: no component extends native `HTMLElement`, there are no custom elements, and no attribute object has untrusted keys. | No template patch needed; resolve the package alert through the planned migration. |
| [#30 Astro View Transition animation XSS](https://github.com/withastro/astro/security/advisories/GHSA-4g3v-8h47-v7g6) · medium · 7.1.0 | Does not apply | E5: no `transition:animate`, no `astro:transitions` import and no CMS-driven animation properties. Literal CSS `transition:` declarations and `@view-transition` are separate browser features. | No template patch needed; resolve the package alert through the planned migration. |
| [#29 Astro spread attribute-name XSS](https://github.com/withastro/astro/security/advisories/GHSA-jrpj-wcv7-9fh9) · medium · 6.4.6 | Does not apply in current callers | E3 and E4: CMS fields fill values and children at fixed attribute names. None of the four rest-prop components (Button, Card, Chip, EmailInput) receives a spread object from a caller, and HomeMap's remaining spread is the literal `{ hidden: true }`. Static output alone would not protect this sink. | Keep explicit prop mapping. The static-build regression adds hostile CMS text and object keys; the framework patch remains migration work. |
| [#25 Astro `define:vars` script escape XSS](https://github.com/withastro/astro/security/advisories/GHSA-j687-52p2-xcff) · medium · 6.1.6 | Does not apply in current callers | E5: the one `define:vars` (`pages/chapters/[slug].astro:374`, added since the first pass) passes `NEW_TAB_HINT_ID` and `NEW_TAB_HINT_TEXT`, string constants from `lib/external-links.ts:18-19`, never CMS text. HomeMap's one `set:html` serializes code-owned map theme constants. | Keep `define:vars` inputs code-owned; resolve the package alert through the planned migration. |
| [#38 Astro JSX/MDX `<script>`/`<style>` child XSS](https://github.com/withastro/astro/security/advisories/GHSA-98hj-9722-w3j8) · medium · 7.3.2 | Does not apply | The sink is a dynamic child of `<script>` or `<style>`, such as `<script>{value}</script>`, rendered through the `astro:jsx` runtime or MDX. The site has no `.mdx`, `.jsx` or `.tsx` files, no `@astrojs/mdx` and no `astro:jsx` import; `.astro` templates go through the Astro compiler, and none gives a `<script>` or `<style>` a dynamic child. HomeMap's JSON script uses `set:html` with code-owned constants (E5). React renders only the Keystatic editor, in `astro dev`. | Retired by the Astro 7.3.8 migration. |
| [#31 Astro `transition:*` hydrated island XSS](https://github.com/withastro/astro/security/advisories/GHSA-7pw4-f3q4-r2p2) · low · 7.0.4 | Does not apply | E5: no `transition:persist`, `transition:scope`, `transition:persist-props` or `client:*` components. | No template patch needed; resolve the package alert through the planned migration. |
| [#26 Astro server-island parameter replay](https://github.com/withastro/astro/security/advisories/GHSA-xr5h-phrj-8vxv) · low · 6.1.10 | Does not apply | E1 and E5: static output, no server islands, no `server:defer`, no encrypted runtime island endpoint. | Resolve the package alert through the planned migration. |

## Source evidence and data flow

- **E1, configuration and deployment.** `packages/website/astro.config.mjs:16-20`
  enables React and Keystatic only for `astro dev`, sets `output: 'static'` and
  uses `passthroughImageService()`. No adapter or `base` is configured.
  `.github/workflows/github-pages.yml` installs the frozen Bun lockfile (`:50`),
  builds against the live public snapshot (`:68-73`) and uploads only
  `packages/website/dist` (`:81-83`). Static HTML still passes through Astro's
  template renderer at build time, and `src/middleware.ts` runs during that
  render to mark external links.
- **E2, active native decoding.**
  `packages/website/src/lib/operational-content.ts:31-57` creates the chapter
  copier and applies it to the public snapshot's chapters.
  `src/lib/chapter-image-copies.ts:13` imports sharp. The download loop
  (`:384-399`) hands any body under the size limit to `renderCopy`
  (`:344-368`), which decodes it with `failOn: 'error'` and re-encodes WebP and
  JPEG. The copier does not check the format; sharp picks the decoder from the
  bytes. A code-owned list at `:126-136` selects the four image fields. Content
  approval grants permission to publish, not safety of compressed image bytes.
  A malicious image could compromise the build runner under the affected
  native libraries; no public Astro server is needed.
- **E3, CMS to templates.** The snapshot loader checks the public/private and
  publication boundaries with the shared `assertPublicOperationalContentSnapshot`
  (`lib/operational-content.ts:69-77`), and `getOperationalCollection` (`:107`)
  returns records as `entry.data`. That assertion is not an HTML sanitizer and
  does not reject every unknown key. Chapter and guild pages select fields
  explicitly: `pages/chapters/[slug].astro:123` passes a theme as child text,
  and `:220-222` and `:295-297` pass link URLs as `href`;
  `pages/guilds/[slug].astro:186-192`, `:263` and `:292-293` map link fields
  the same way. HomeMap builds new `ChapterNode` objects from selected fields
  (`HomeMap.astro:112` onwards) before rendering fixed `data-*` attributes. No
  snapshot record becomes a map of attribute names.
- **E4, all template spreads.** `components/ui/Button.astro:20-26`,
  `Card.astro:43-57`, `Chip.astro:20-33` and `EmailInput.astro:17-24` collect
  `...attrs` from `Astro.props`. Card's rest props are new since the first
  pass. Every caller supplies named props written in source; no caller spreads
  an object into these components, so their keys never come from CMS records,
  query parameters or `Object.fromEntries`. CMS data can change prop values and
  child text only. `HomeMap.astro:666` spreads only `{ hidden: true }`. Other
  JavaScript object spreads in HomeMap and the image copier do not render
  attribute names.
- **E5, other sinks.** All 36 `.astro` files under `src` were parsed with the
  installed `@astrojs/compiler` 2.13.1. The parse found five attribute spreads
  (E4), one `set:html`, one `define:vars`, three named slot assignments and one
  named slot outlet, and nothing else this triage looks for.
  `design-system.astro:121,146,211` use literal `slot="side"`, and
  `SectionHeader.astro:22` is a literal `<slot name="side">`. The `define:vars`
  at `pages/chapters/[slug].astro:374` passes the two constants from
  `lib/external-links.ts:18-19`. The JSON script at `HomeMap.astro:574`
  serializes `THEME_INFO`, built at lines 12-38 from `PUBLIC_MAP_THEMES` in
  `packages/shared/src/map-state.ts` and code-owned aliases. There are no Astro
  transition directives, `client:*` or `server:*` directives, custom elements
  or native `HTMLElement` subclasses, and a source search finds no
  `Astro.slots` or `astro:transitions` use. The one template added since the
  first pass, `components/page-sections/BookDialog.astro`, has none of these
  constructs.

These are reachability findings for the 13 listed advisories, not an exhaustive
claim about all possible XSS or URL handling in the site.

## Bounded remediation

Changed security-sensitive files: the root `package.json` adds
`"overrides": { "sharp": "0.35.5" }`, the website `package.json` pins its
direct sharp dependency to `0.35.5`, and `bun.lock` records that graph. The
override is needed because changing only the direct dependency would let
Astro's `^0.34.0` optional dependency keep a separate vulnerable copy. Astro
stays at 5.18.1. Against current `main`, the lockfile changes only sharp, its
platform packages (including two WebAssembly-based packages that are new in
0.35), the libvips bundles (1.2.4 to 1.3.4), `@emnapi/runtime` (1.10.0 to
1.11.3, used by sharp's WebAssembly build) and a nested `semver` 7.8.5 for
sharp.

[sharp 0.35.5](https://sharp.pixelplumbing.com/changelog/v0.35.5/) was
published on 2026-09-27 (npm records `2026-09-27T13:46:24.509Z`), well outside
the three-day gate. `bunfig.toml` keeps `minimumReleaseAge = 259200` and
`saveTextLockfile = true`. [sharp 0.35's breaking changes](https://sharp.pixelplumbing.com/changelog/v0.35.0/)
were checked against the copier: Node 22 meets the new Node minimum, the code
uses `failOn` rather than the removed `failOnError`, and it emits WebP and
JPEG, not AVIF. The new default channel limit is covered for the supported
fixtures. No globally installed libvips is assumed; the bundled library
versions are checked below.

`scripts/chapter-image-copies.test.ts` adds benign AVIF, SVG, GIF and TIFF
fixtures that go through the real copier, checking output format, dimensions
and EXIF removal. They start from a 600px copy of the test photo: encoding the
full 3000px photo as AVIF took 18 s in the dev machine, past bun's 5 s test
limit. `scripts/chapter-image-build.integration.ts` adds hostile chapter text
and object keys to its local snapshot fixture, then checks that chapter and
directory HTML escape the text and gain no injected elements or event
attributes. These fixtures do not attempt native-code exploitation.

Two changes keep the build proof runnable:

- Its disposable output now sits under the website's ignored `node_modules`
  folder. Astro 5 stages external output in `.astro` and then removes that
  folder, which fails with `EACCES` where `.astro` is a bind mount, as in the
  dev machine. `main`'s copy of the test still fails this way there.
- Its hero lookup now matches a class list. Since `0b4ddd8` (2026-11-07) the
  chapter hero is a `Card`, so its class attribute lists
  `gp-chapter-hero-media` among Card's own classes, and the old exact match
  found nothing. On `main` the test therefore stopped at its first hero
  assertion, before the image and injection checks. This change touches only
  the test.

A clean frozen install proves that the website and Astro resolve the **same
sharp 0.35.5 module**: one `sharp@0.35.5` folder and no 0.34.5 copy. Its
bundled libraries report libvips 8.18.7, libheif 1.23.5 and librsvg 2.63.2. An
in-place install over an existing 0.34.5 tree once left Astro's old nested
sharp on disk, so existing checkouts should reinstall clean when adopting the
override; CI starts clean.

The three sharp alerts should close after merge, once GitHub refreshes the
dependency graph. The ten Astro alerts triaged here still match the installed
framework version. The patched sharp addresses the critical advisory's native
cause but does not change Astro's version-based alert status. No alerts were
dismissed.

## Astro 5 to 7 migration proposal (requires separate approval)

The migration is warranted for supported framework fixes and to retire the
remaining version alerts. This triage did not find a reachable template exploit
that would need an emergency framework migration. Do not run the major upgrade
in this sharp-only PR.

| Area | Concrete scope and acceptance evidence |
| --- | --- |
| Package compatibility | Select an age-eligible Astro 7 release of at least 7.2.8 for the alerts triaged here, or at least 7.3.2 to also retire alert #38, with sharp at least 0.35.5. Registry facts checked on 2026-10-20: the pinned `@keystatic/astro` 5.0.6 advertises only Astro 2 to 5, while the published 6.0.0 advertises 5, 6 and 7, so update the integration deliberately and verify the local Keystatic editor. Choose a compatible React integration rather than the latest by default: the current 4.4.2 brings Vite 6, React integration 6.0.0 uses Vite 8, and 7.1.0 adds a transformer peer. |
| Astro 6 transition | Check Vite 7 integration and config compatibility, then Vite 8 for Astro 7. Recheck the shared aliases, dev file access and polling. Zod 4 affects the three editorial collection schemas in `src/content.config.ts`, particularly partial nested `.default({})` values and inferred types; keep the existing default behavior, proven with fixture builds. Node 22 already meets the platform minimum. [Astro 6 guide](https://docs.astro.build/en/guides/upgrade-to/v6/) |
| Template and compiler behavior | Astro 7's Rust compiler, whitespace defaults and CSS serialization affect all 36 `.astro` files. Validate tag closure, nesting and inline text spacing. Astro 6 changes script and style ordering: HomeMap has two `<script>` elements (a JSON data block and the client script) and one `<style>`, and the chapter page has an `is:inline define:vars` script; check map initialization, the new-tab hint and style precedence. Review `GpLayout.astro` global styles and scripts across routes, and the build-time external-link middleware. [Astro 7 guide](https://docs.astro.build/en/guides/upgrade-to/v7/) |
| Static content and routes | Keep the static, passthrough deployment. Verify the JSON/XML and copied-image endpoints without trailing slashes, snapshot environment selection, chapter and guild `getStaticPaths`, and all three editorial collections. Production reads the live operational snapshot, so both the fallback build and the local remote-fixture build must pass. The existing `process.env` snapshot settings need no automatic conversion to `import.meta.env`. |
| Type debt | Keep the checked-in website `astro/tsconfigs/strict` configuration. Measure Astro diagnostics before and after each major, and fix new ones without casts that hide invalid state or broader suppressions. Treat enabling `strictest` as separate work: the first pass measured 54 `strictest` errors at `2546a58` (29 in HomeMap), and this refresh did not re-measure them. The checked-in `astro check` now reports 2 errors on `main`, both in files this PR does not touch (`HomeMap.astro:4144` and `lib/operational-content.ts:114`); clear them before the migration so new diagnostics stand out. |
| Completion | Run typecheck, the focused contract tests, the chapter-image unit and build proofs, `agentic:check`, the website build, and authenticated Brave route and interaction proof at 375, 1024 and 1440 (homepage map, chapter directory and detail, guild, garden, library, stories, the map editor and the JSON endpoints). Compare generated routes, HTML output and public privacy projections. Review a draft migration PR and its bot results before merge. |

Recommended sequence: merge the reviewed sharp fix first, then run an approved
migration in an isolated branch with checkpoints after Astro 6 and Astro 7. Do
not couple the framework migration to HomeMap work. Keep the sharp override
until the chosen Astro dependency graph itself requires a patched sharp and a
clean install proves no older copy remains.

Status, 2026-11-08: the migration ran as proposed, through Astro 6.4.8 to
Astro 7.3.8, the last 7.3 release. It keeps the repo's Node floor of 22.12.0;
7.4.0 raised Astro's to 22.22.0, and 7.4.3 to 22.23.4, above the dev
machine's 22.23.3. The migration's pull request records the evidence. The sharp override
stays: Astro 7.3.8's optional `^0.35.4` range still admits 0.35.4, which
alert #37 affects.

## Validation

Refreshed on 2026-11-08 on `367824a` plus this PR, after a clean frozen
install in the isolated Linux arm64 dev machine (Bun 1.3.10, Node 22.23.3).
Other sessions shared the machine, and it was heavily loaded during these runs.

| Check | Result |
| --- | --- |
| `bun install --frozen-lockfile`, after clearing this worktree's dependency folders | Pass; 1,364 packages; lockfile unchanged |
| sharp resolution | The website and Astro resolve one `sharp@0.35.5` module; libvips 8.18.7, libheif 1.23.5, librsvg 2.63.2 |
| `bun run typecheck` | Pass |
| `bun run test:chapter-image-copies` | 27 pass in 5 of 6 runs of `scripts/chapter-image-copies.test.ts`, including the four decoder cases. In the other run, an existing test ("a copy is fetched again once its reuse time has passed") took 5.35 s against bun's 5 s limit under heavy load; `main`'s copy of the file passed 3 of 3 runs. |
| sharp speed | The copier's decode and re-encode of the 3000px test photo, in two rounds of six runs per version: medians of 0.65 s and 0.72 s with 0.35.5, 0.61 s and 0.87 s with 0.34.5 on `main` |
| `bun run test:chapter-image-copies:build` | Pass: a real static build against a local snapshot, with site-hosted image outputs and the hostile CMS text and object-key checks |
| `bun run test:content` | Pass; 52 tests in `scripts/public-content-contract.test.ts` |
| `bun run test:agent` | Pass; 80 tests in `scripts/agent-contract.test.ts` and 15 in `scripts/map-node-moderation.test.ts` |
| `bun run test:map-nodes` | Pass; 76 tests in `scripts/map-node-contract.test.ts` |
| `bun run test:chapter-impact` | Pass; 10 tests in `scripts/chapter-impact-contract.test.ts` |
| `bun run agentic:check` | Pass: guidance, browser policy (3 files), em-dash check (229 files), 11 plan hubs, and `ui:check` with 0 hard and 0 warning violations |
| `bun run build` | Pass; 44 pages from the committed fallback snapshot |
| `bun run --cwd packages/website check` (`astro check`) | 2 errors, 0 warnings, 7 hints. Both errors are already on `main`, in files this PR does not touch: `HomeMap.astro:4144` (an SVG group passed where an `HTMLElement` is typed) and `lib/operational-content.ts:114`. |
| Compiler AST enumeration | 36 templates: five spreads, one `set:html`, one `define:vars`, three literal slot assignments and one literal slot outlet |
| `git diff --check origin/main` | Pass |

Authenticated browser QA and Linux x64 native execution were not performed, and
no rendered browser proof is claimed. No website template, CSS, runtime source,
workflow, deployment configuration or Bun policy changed.
