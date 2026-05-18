# Keystatic Access Control

Date: 2026-05-18

## Scope

This note documents the access-control posture for the public Astro website and
the V2 HiFi Keystatic content schema.

## Current Model

The public website remains a static Astro site. Keystatic is a local authoring
tool for file-backed public content and is registered only during `astro dev`.
It is not a deployed CMS service, does not connect to a website database, and
does not add an authenticated production admin route.

Keystatic uses local storage:

```ts
storage: { kind: 'local' }
```

That means content changes are controlled by:

- local filesystem access to this checkout
- Git history and code-review process
- branch protection or repository permissions outside the running website

## Production Behavior

Production builds run as static output. The `/keystatic` authoring route is not
registered in `astro build`, and the public `dist` output should not contain
Keystatic routes or editor assets.

The React renderer is included only for local development because the Keystatic
admin UI needs it. It is not registered for static production builds.

## Non-Goals

The public Keystatic schema must not store or expose:

- real Garden assessment answers
- pledge state
- booking availability
- private member records
- emails, raw notes, IP addresses, user agents, or moderation metadata
- Directus/private-admin workflow state
- Agent/API runtime data or database credentials

Those concerns belong in the private Agent/API, Directus/admin, or future
authenticated workspace surfaces, not in the public website content model.

## Operational Guardrail

Do not expose `astro dev` or `/keystatic` to the public internet without an
external access-control layer. The current access-control model assumes trusted
local development and Git-governed publication.
