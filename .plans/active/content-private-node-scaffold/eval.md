# Content Private Node Scaffold Evaluation

## Acceptance Checks

- Keystatic and Astro content schemas accept the expanded public content contracts.
- `/locations.json` builds from chapter content and points to internal chapter routes.
- The private SQL contract exposes approved submissions through `public_map_nodes` only.
- Public map-node helpers exclude email, raw notes, review notes, IP, spam metadata, and pending submissions from public projections.
- The CMS/admin options are documented with pros, tradeoffs, and a first candidate for evaluation.
- `status.json` matches the intended active-stage lane state.
- Validation passes with `node scripts/plan-hub.mjs validate`.

## Proof

- `bun run test:map-nodes` passed on 2026-05-16.
- `bun run plans:validate` passed on 2026-05-16.
- `PATH=/Users/afo/.local/share/mise/installs/node/22.22.1/bin:$PATH bun run build` passed on 2026-05-16.
- `bun run build` without the Node 22 PATH override is blocked by system Node `18.18.2`, which Astro rejects.
- Build still warns that `people` and `stories` collections have no data files; this is expected until real content is added.
