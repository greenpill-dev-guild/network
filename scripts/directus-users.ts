#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  applyDirectusOperationalContentAccess,
  createDirectusClient,
} from './directus-operational-content-setup.ts';

const DEFAULT_STEWARD_ROLE = 'Greenpill Steward Editor';
const DEFAULT_ADMIN_ROLE = 'Greenpill Operator';

type DirectusClient = Awaited<ReturnType<typeof createDirectusClient>>;

type InviteUserInput = {
  email: string;
  name?: string;
  location?: string;
  role?: string;
};

type InviteOptions = {
  input?: string;
  role: string;
  adminRole: string;
  admins: Set<string>;
  inviteUrl?: string;
  ensureAccess: boolean;
  updateExisting: boolean;
  dryRun: boolean;
};

type InviteResult = {
  email: string;
  role: string;
  status: 'invited' | 'updated' | 'skipped' | 'dry-run';
  details?: string;
};

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanEmail(value: unknown) {
  return cleanString(value).toLowerCase();
}

export function splitDisplayName(name: string) {
  const clean = cleanString(name).replace(/\s+/g, ' ');
  if (!clean) return {};
  const [firstName, ...rest] = clean.split(' ');
  return {
    firstName,
    lastName: rest.join(' ') || undefined,
  };
}

function parseJsonUsers(text: string): InviteUserInput[] {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('JSON input must be an array of invite records.');
  }

  return parsed.map((record) => ({
    email: cleanEmail(record?.email),
    name: cleanString(record?.name ?? record?.displayName),
    location: cleanString(record?.location),
    role: cleanString(record?.role),
  }));
}

function parseDelimitedUsers(text: string): InviteUserInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const dataLines = lines[0]?.toLowerCase().startsWith('email\t') ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const [email, name = '', location = '', role = ''] = line.split('\t').map((part) => part.trim());
    return {
      email: cleanEmail(email),
      name: cleanString(name),
      location: cleanString(location),
      role: cleanString(role),
    };
  });
}

export function parseInviteUsers(text: string): InviteUserInput[] {
  const clean = cleanString(text);
  if (!clean) return [];

  const users = clean.startsWith('[') ? parseJsonUsers(clean) : parseDelimitedUsers(clean);
  const seen = new Set<string>();

  return users.map((user) => {
    if (!user.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(user.email)) {
      throw new Error(`Invalid invite email: ${user.email || '(blank)'}`);
    }
    if (seen.has(user.email)) {
      throw new Error(`Duplicate invite email: ${user.email}`);
    }
    seen.add(user.email);
    return user;
  });
}

function usage() {
  return [
    'Usage: bun run directus:users:invite -- --input stewards.tsv [options]',
    '',
    'Input TSV columns:',
    '  email<TAB>name<TAB>location<TAB>role',
    '',
    'Options:',
    `  --role <name>         Default role for users without a role column. Defaults to "${DEFAULT_STEWARD_ROLE}".`,
    `  --admin-role <name>   Role used for --admin emails. Defaults to "${DEFAULT_ADMIN_ROLE}".`,
    '  --admin <email>       Invite or update this email with --admin-role. Repeatable.',
    '  --invite-url <url>    Optional Directus invite URL override.',
    '  --ensure-access       Run the Directus Greenpill role/policy setup first.',
    '  --no-update-existing  Skip existing users instead of patching role/profile fields.',
    '  --dry-run             Resolve inputs without mutating Directus.',
  ].join('\n');
}

function takeValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export function parseArgs(argv: string[]): InviteOptions {
  const args = argv[0] === 'invite' ? argv.slice(1) : argv;
  const options: InviteOptions = {
    role: DEFAULT_STEWARD_ROLE,
    adminRole: DEFAULT_ADMIN_ROLE,
    admins: new Set(),
    ensureAccess: false,
    updateExisting: true,
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--input' || arg === '-i') {
      options.input = takeValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--role') {
      options.role = takeValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--admin-role') {
      options.adminRole = takeValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--admin') {
      options.admins.add(cleanEmail(takeValue(args, index, arg)));
      index += 1;
      continue;
    }
    if (arg === '--invite-url') {
      options.inviteUrl = takeValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--ensure-access') {
      options.ensureAccess = true;
      continue;
    }
    if (arg === '--no-update-existing') {
      options.updateExisting = false;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }

  if (!options.input) {
    throw new Error(`Missing --input.\n\n${usage()}`);
  }

  return options;
}

async function readInviteInput(path: string) {
  return readFile(path, 'utf8');
}

function filterByField(field: string, value: string) {
  const params = new URLSearchParams();
  params.set(`filter[${field}][_eq]`, value);
  params.set('limit', '1');
  return params.toString();
}

async function getRoleId(client: DirectusClient, name: string) {
  const response = await client.request(`/roles?${filterByField('name', name)}`);
  const role = response?.data?.[0];
  if (!role?.id) {
    throw new Error(`Directus role not found: ${name}. Run bun run directus:content:setup first.`);
  }
  return role.id as string;
}

async function getUserByEmail(client: DirectusClient, email: string) {
  const params = new URLSearchParams(filterByField('email', email));
  params.set('fields', 'id,email,first_name,last_name,location,role,status');
  const response = await client.request(`/users?${params.toString()}`);
  return response?.data?.[0] ?? null;
}

function userRoleId(user: any) {
  return typeof user?.role === 'object' ? user.role?.id : user?.role;
}

function userPatch(input: InviteUserInput, roleId: string) {
  const { firstName, lastName } = splitDisplayName(input.name ?? '');
  return {
    role: roleId,
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
    ...(input.location ? { location: input.location } : {}),
  };
}

function changedFields(user: any, patch: Record<string, unknown>) {
  return Object.entries(patch)
    .filter(([key, value]) => {
      if (key === 'role') return userRoleId(user) !== value;
      return (user?.[key] ?? '') !== value;
    })
    .map(([key]) => key);
}

function roleNameForUser(input: InviteUserInput, options: InviteOptions) {
  if (options.admins.has(input.email)) return options.adminRole;
  return input.role || options.role;
}

export async function inviteDirectusUsers(
  users: InviteUserInput[],
  options: InviteOptions,
  client: DirectusClient
): Promise<InviteResult[]> {
  const roleIds = new Map<string, string>();
  const results: InviteResult[] = [];

  for (const user of users) {
    const roleName = roleNameForUser(user, options);
    if (!roleIds.has(roleName)) {
      roleIds.set(roleName, await getRoleId(client, roleName));
    }

    const roleId = roleIds.get(roleName)!;
    const existing = await getUserByEmail(client, user.email);
    const patch = userPatch(user, roleId);

    if (existing) {
      if (!options.updateExisting) {
        results.push({
          email: user.email,
          role: roleName,
          status: 'skipped',
          details: `already exists (${existing.status || 'unknown status'})`,
        });
        continue;
      }

      const changed = changedFields(existing, patch);
      if (!changed.length) {
        results.push({
          email: user.email,
          role: roleName,
          status: 'skipped',
          details: 'already up to date',
        });
        continue;
      }

      if (!options.dryRun) {
        await client.request(`/users/${existing.id}`, {
          method: 'PATCH',
          body: patch,
        });
      }
      results.push({
        email: user.email,
        role: roleName,
        status: options.dryRun ? 'dry-run' : 'updated',
        details: changed.join(', '),
      });
      continue;
    }

    if (!options.dryRun) {
      await client.request('/users/invite', {
        method: 'POST',
        body: {
          email: user.email,
          role: roleId,
          ...(options.inviteUrl ? { invite_url: options.inviteUrl } : {}),
        },
      });

      const invited = await getUserByEmail(client, user.email);
      const patchableFields = { ...patch };
      delete patchableFields.role;
      if (invited?.id && Object.keys(patchableFields).length) {
        await client.request(`/users/${invited.id}`, {
          method: 'PATCH',
          body: patchableFields,
        });
      }
    }

    results.push({
      email: user.email,
      role: roleName,
      status: options.dryRun ? 'dry-run' : 'invited',
    });
  }

  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const users = parseInviteUsers(await readInviteInput(options.input!));
  const client = await createDirectusClient();

  if (options.ensureAccess && !options.dryRun) {
    await applyDirectusOperationalContentAccess({ client });
  }

  const results = await inviteDirectusUsers(users, options, client);
  console.log(`Directus target: ${client.url}`);
  for (const result of results) {
    const details = result.details ? ` (${result.details})` : '';
    console.log(`${result.status}: ${result.email} -> ${result.role}${details}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
