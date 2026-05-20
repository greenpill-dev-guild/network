#!/usr/bin/env bun

import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ensureScopedContentPolicy } from './directus-content-access.ts';
import { createDirectusClient } from './directus-operational-content-setup.ts';

type SmokeOptions = {
  chapter: string;
  unassignedChapter: string;
  guild: string;
  unassignedGuild: string;
  emailDomain: string;
  keep: boolean;
};

const DEFAULT_OPTIONS: SmokeOptions = Object.freeze({
  chapter: 'brasil',
  unassignedChapter: 'nigeria',
  guild: 'dev-guild',
  unassignedGuild: 'writers-guild',
  emailDomain: 'greenpill.network',
  keep: false,
});

function usage() {
  return [
    'Usage: bun run directus:steward:smoke -- [options]',
    '',
    'Creates a temporary Steward Editor user, assigns it to one chapter and one guild,',
    'proves scoped create/read behavior with the temporary user token, then cleans up.',
    '',
    'Options:',
    `  --chapter <slug>              Assigned chapter. Defaults to "${DEFAULT_OPTIONS.chapter}".`,
    `  --unassigned-chapter <slug>   Chapter that should be forbidden. Defaults to "${DEFAULT_OPTIONS.unassignedChapter}".`,
    `  --guild <slug>                Assigned guild. Defaults to "${DEFAULT_OPTIONS.guild}".`,
    `  --unassigned-guild <slug>     Guild that should be forbidden. Defaults to "${DEFAULT_OPTIONS.unassignedGuild}".`,
    `  --email-domain <domain>       Temporary email domain. Defaults to "${DEFAULT_OPTIONS.emailDomain}".`,
    '  --keep                       Leave temporary records in place for manual inspection.',
  ].join('\n');
}

function takeValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export function parseArgs(argv: string[]): SmokeOptions {
  const options = { ...DEFAULT_OPTIONS };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--chapter') {
      options.chapter = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--unassigned-chapter') {
      options.unassignedChapter = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--guild') {
      options.guild = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--unassigned-guild') {
      options.unassignedGuild = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--email-domain') {
      options.emailDomain = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--keep') {
      options.keep = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }

  if (options.chapter === options.unassignedChapter) {
    throw new Error('--chapter and --unassigned-chapter must be different.');
  }
  if (options.guild === options.unassignedGuild) {
    throw new Error('--guild and --unassigned-guild must be different.');
  }

  return options;
}

function tokenValue() {
  return `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
}

function filterByField(field: string, value: string) {
  const params = new URLSearchParams();
  params.set(`filter[${field}][_eq]`, value);
  params.set('limit', '1');
  return params.toString();
}

function encodePathSegment(segment: string) {
  return encodeURIComponent(segment);
}

async function getRoleId(client, name: string) {
  const response = await client.request(`/roles?${filterByField('name', name)}`);
  const role = response?.data?.[0];
  if (!role?.id) throw new Error(`Directus role not found: ${name}`);
  return role.id;
}

async function assertContentExists(client, collection: string, slug: string) {
  const response = await client.request(`/items/${collection}?${filterByField('slug', slug)}`);
  if (!response?.data?.[0]) {
    throw new Error(`Directus ${collection} record not found: ${slug}`);
  }
}

async function expectForbidden(label: string, action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error);
    if (message.includes(' failed with 403:')) return;
    throw error;
  }
  throw new Error(`${label} unexpectedly succeeded.`);
}

async function deleteIfPresent(client, path: string) {
  await client.request(path, {
    method: 'DELETE',
    expected: [204, 404],
  });
}

export async function runDirectusStewardSmoke(options: SmokeOptions) {
  const admin = await createDirectusClient();
  const roleId = await getRoleId(admin, 'Greenpill Steward Editor');
  const id = randomUUID().slice(0, 8);
  const email = `directus-smoke-${id}@${options.emailDomain}`;
  const token = tokenValue();
  const initiativeSlug = `directus-smoke-initiative-${id}`;
  const projectSlug = `directus-smoke-project-${id}`;
  const cleanup = {
    userId: null,
    chapterAssignmentId: null,
    guildAssignmentId: null,
    initiativeCreated: false,
    projectCreated: false,
  };

  await assertContentExists(admin, 'chapters', options.chapter);
  await assertContentExists(admin, 'chapters', options.unassignedChapter);
  await assertContentExists(admin, 'guilds', options.guild);
  await assertContentExists(admin, 'guilds', options.unassignedGuild);

  try {
    const user = await admin.request('/users', {
      method: 'POST',
      body: {
        email,
        first_name: 'Directus',
        last_name: 'Smoke',
        status: 'active',
        role: roleId,
        password: tokenValue(),
        token,
      },
    });
    cleanup.userId = user?.data?.id;
    if (!cleanup.userId) throw new Error('Directus did not return a smoke user id.');

    const chapterAssignment = await admin.request('/items/chapter_editor_assignments', {
      method: 'POST',
      body: {
        chapter_slug: options.chapter,
        directus_user_id: cleanup.userId,
        access_level: 'editor',
      },
    });
    cleanup.chapterAssignmentId = chapterAssignment?.data?.id;

    const guildAssignment = await admin.request('/items/guild_editor_assignments', {
      method: 'POST',
      body: {
        guild_slug: options.guild,
        directus_user_id: cleanup.userId,
        access_level: 'editor',
      },
    });
    cleanup.guildAssignmentId = guildAssignment?.data?.id;

    await ensureScopedContentPolicy(admin, cleanup.userId, 'chapter', options.chapter);
    await ensureScopedContentPolicy(admin, cleanup.userId, 'guild', options.guild);

    const steward = await createDirectusClient({ url: admin.url, token });
    await steward.request('/users/me?fields=id,email');

    const assignmentRead = await steward.request('/items/chapter_editor_assignments?fields=chapter_slug&limit=-1');
    const assignmentSlugs = new Set((assignmentRead?.data ?? []).map((record) => record.chapter_slug));
    if (!assignmentSlugs.has(options.chapter) || assignmentSlugs.has(options.unassignedChapter)) {
      throw new Error('Steward assignment read scope did not match the temporary chapter assignment.');
    }

    await expectForbidden('chapter create', () => steward.request('/items/chapters', {
      method: 'POST',
      body: {
        slug: `directus-smoke-chapter-${id}`,
        name: 'Directus Smoke Chapter',
        publication_status: 'draft',
      },
    }));

    await steward.request('/items/chapter_initiatives', {
      method: 'POST',
      body: {
        slug: initiativeSlug,
        title: 'Directus Smoke Initiative',
        summary: 'Temporary scoped access smoke test.',
        publication_status: 'draft',
      },
    });
    cleanup.initiativeCreated = true;

    await steward.request(`/items/chapter_initiatives/${encodePathSegment(initiativeSlug)}`, {
      method: 'PATCH',
      body: {
        summary: 'Temporary scoped access smoke test updated by Steward Editor.',
      },
    });

    await expectForbidden('unassigned chapter initiative create', () => steward.request('/items/chapter_initiatives', {
      method: 'POST',
      body: {
        slug: `${initiativeSlug}-blocked`,
        chapter_slug: options.unassignedChapter,
        title: 'Blocked Directus Smoke Initiative',
        publication_status: 'draft',
      },
    }));

    await steward.request('/items/projects', {
      method: 'POST',
      body: {
        slug: projectSlug,
        name: 'Directus Smoke Project',
        summary: 'Temporary scoped access smoke test.',
        publication_status: 'draft',
      },
    });
    cleanup.projectCreated = true;

    await expectForbidden('unassigned guild project create', () => steward.request('/items/projects', {
      method: 'POST',
      body: {
        slug: `${projectSlug}-blocked`,
        name: 'Blocked Directus Smoke Project',
        guild_slug: options.unassignedGuild,
        publication_status: 'draft',
      },
    }));

    return {
      url: admin.url,
      email,
      chapter: options.chapter,
      guild: options.guild,
      initiativeSlug,
      projectSlug,
    };
  } finally {
    if (!options.keep) {
      await deleteIfPresent(admin, `/items/chapter_initiatives/${encodePathSegment(initiativeSlug)}`);
      await deleteIfPresent(admin, `/items/projects/${encodePathSegment(projectSlug)}`);
      if (cleanup.chapterAssignmentId) {
        await deleteIfPresent(admin, `/items/chapter_editor_assignments/${encodePathSegment(cleanup.chapterAssignmentId)}`);
      }
      if (cleanup.guildAssignmentId) {
        await deleteIfPresent(admin, `/items/guild_editor_assignments/${encodePathSegment(cleanup.guildAssignmentId)}`);
      }
      if (cleanup.userId) {
        await deleteIfPresent(admin, `/users/${encodePathSegment(cleanup.userId)}`);
      }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runDirectusStewardSmoke(options);
  console.log(`Directus steward smoke passed at ${result.url}`);
  console.log(`Temporary user: ${result.email}`);
  console.log(`Assigned chapter: ${result.chapter}`);
  console.log(`Assigned guild: ${result.guild}`);
  console.log(`Temporary initiative: ${result.initiativeSlug}`);
  console.log(`Temporary project: ${result.projectSlug}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
