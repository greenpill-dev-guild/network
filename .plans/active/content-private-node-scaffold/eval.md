# Content Private Node Scaffold Evaluation

## Acceptance Checks

- Keystatic and Astro content schemas accept the remaining editorial/site-composition content contracts.
- `/locations.json` builds from the approved operational content snapshot and points to internal chapter routes.
- `/content/public-snapshot` returns only published operational content and rejects private or non-published fields through shared guards.
- `content.public_*` SQL views build public payloads from explicit allowlists rather than raw editor JSON.
- Directus operational roles/policies are applied by `bun run directus:content:setup`, with Steward Editor blocked from publish/review fields, Steward Moderator limited to review-safe intake moderation, and Trusted Publisher allowed to publish and read private contacts.
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
- `bun run directus:content:setup` passed locally against Directus 11.17.4 on 2026-05-19.
- Local RBAC proof passed on 2026-05-19: Steward Editor created a draft and moved it to `pending_review`, received 403 when trying to publish, Trusted Publisher published, and anonymous read of Directus items returned 403.
- Local moderation RBAC proof passed on 2026-05-19: Steward Moderator could read/update review-safe map-node submission fields and append a review row, received 403 for private contacts, and Trusted Publisher could read the private contact row.
- `content.safe_jsonb_boolean` proof passed on 2026-05-19: invalid `seo.noindex` and `impactSources.impactEnabled` JSON strings no longer break `content.public_operational_content_snapshot` or `content.public_chapters`.
- One-time migration guard proof passed on 2026-05-19: `scripts/operational-content.mjs --migrate` refuses to run when operational rows already exist, while `--migrate --allow-existing` succeeds without overwriting conflicts.
- `bun run db:migrate`, `bun run test:content`, `bun run test:agent`, `bun run test:map-nodes`, `bun run test:chapter-impact`, `bun run build:website`, `bun run plans:validate`, and `git diff --check` passed on 2026-05-19.
- Production Directus schema proof passed on 2026-05-20: `network-admin` contains the `audit`, `content`, `impact`, `intake`, `public`, and `workspace` schemas, and `audit.agent_schema_migrations` records migrations `001` through `007`.
- Production Directus config proof passed on 2026-05-20: `PUBLIC_URL=https://admin.greenpill.network`, `DB_SEARCH_PATH=array:public,content,intake,impact,workspace,audit`, and `EMAIL_FROM=no-reply@mail.greenpill.network`.
- Production Directus RBAC proof passed on 2026-05-20: `bun run directus:content:setup` configured 46 permissions, created the Steward Editor, Steward Moderator, Trusted Publisher, and Operator roles/policies, and the temporary setup token for `afo@greenpill.builders` was cleared.
- Production health proof passed on 2026-05-20: `https://admin.greenpill.network/server/health` returned `{"status":"ok"}` and `https://agent.greenpill.network/ready` returned an OK database readiness response.
