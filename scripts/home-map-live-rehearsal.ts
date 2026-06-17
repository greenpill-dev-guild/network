#!/usr/bin/env bun

import assert from 'node:assert/strict';
import { createDatabaseClient } from '@greenpill-network/agent/db';
import { MAP_NODE_SUBMISSIONS_ROUTE } from '@greenpill-network/agent/impact';
import { PUBLIC_MAP_STATE_ROUTE } from '@greenpill-network/agent/map-state';
import { assertPublicMapStatePayload } from '@greenpill-network/shared/map-state';

type UnknownRecord = Record<string, any>;

const DEFAULT_AGENT_BASE_URL = 'http://localhost:3303';
const DEFAULT_DATABASE_URL = 'postgres://greenpill:greenpill@localhost:3304/greenpill_network';
const DEFAULT_WEBSITE_URL = 'http://localhost:3301/';
const DEFAULT_INTERVAL_MS = 12_000;
const FAST_INTERVAL_MS = 2_000;
const PRIVATE_RAW_NOTE = 'local-live-rehearsal private raw note';

interface Options {
  agentBaseUrl: string;
  databaseUrl: string;
  websiteUrl: string;
  intervalMs: number;
  count: number;
  cleanup: boolean;
}

interface RehearsalSubmission {
  displayName: string;
  placeName: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  long: number;
  role: 'member' | 'steward';
  themes: string[];
  publicNote: string;
  email: string;
}

function usage(): string {
  return [
    'Usage: bun run home-map:rehearsal [--fast] [--interval-ms N] [--count N] [--cleanup]',
    '',
    'Run after the local stack is ready. Defaults target local services only:',
    `  website: ${DEFAULT_WEBSITE_URL}`,
    `  agent:   ${DEFAULT_AGENT_BASE_URL}`,
    `  db:      ${DEFAULT_DATABASE_URL}`,
    '',
    '--fast submits every 2 seconds for quick visual review.',
    'Default pacing submits every 12 seconds for a realistic live-call pulse.',
    '--interval-ms sets a custom delay between submissions.',
    '--count limits how many deterministic rehearsal nodes are submitted.',
    '--cleanup removes rehearsal nodes and turns local live onboarding off.',
  ].join('\n');
}

function parsePositiveInt(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    agentBaseUrl: process.env.HOME_MAP_REHEARSAL_AGENT_URL || DEFAULT_AGENT_BASE_URL,
    databaseUrl: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
    websiteUrl: process.env.HOME_MAP_REHEARSAL_WEBSITE_URL || DEFAULT_WEBSITE_URL,
    intervalMs: DEFAULT_INTERVAL_MS,
    count: REHEARSAL_SUBMISSIONS.length,
    cleanup: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--fast') {
      options.intervalMs = FAST_INTERVAL_MS;
      continue;
    }
    if (arg === '--cleanup') {
      options.cleanup = true;
      continue;
    }
    if (arg === '--interval-ms') {
      options.intervalMs = parsePositiveInt(argv[++index] || '', '--interval-ms');
      continue;
    }
    if (arg.startsWith('--interval-ms=')) {
      options.intervalMs = parsePositiveInt(arg.slice('--interval-ms='.length), '--interval-ms');
      continue;
    }
    if (arg === '--count') {
      options.count = parsePositiveInt(argv[++index] || '', '--count');
      continue;
    }
    if (arg.startsWith('--count=')) {
      options.count = parsePositiveInt(arg.slice('--count='.length), '--count');
      continue;
    }
    if (arg === '--agent-url') {
      options.agentBaseUrl = argv[++index] || '';
      continue;
    }
    if (arg.startsWith('--agent-url=')) {
      options.agentBaseUrl = arg.slice('--agent-url='.length);
      continue;
    }
    if (arg === '--database-url') {
      options.databaseUrl = argv[++index] || '';
      continue;
    }
    if (arg.startsWith('--database-url=')) {
      options.databaseUrl = arg.slice('--database-url='.length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
  }

  options.count = Math.min(options.count, REHEARSAL_SUBMISSIONS.length);
  return options;
}

function assertLocalTarget(label: string, value: string): void {
  if (!value) throw new Error(`${label} is required.`);
  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1' && host !== '[::1]') {
    throw new Error(`${label} must be local for this rehearsal script: ${value}`);
  }
}

function endpoint(baseUrl: string, route: string): string {
  return new URL(route, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

async function requireOkJson(response: Response, label: string): Promise<UnknownRecord> {
  const body = await response.text();
  let json: UnknownRecord = {};
  try {
    json = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(`${label} returned non-JSON body: ${body.slice(0, 240)}`);
  }
  if (!response.ok) throw new Error(`${label} returned ${response.status}: ${JSON.stringify(json)}`);
  return json;
}

async function fetchJson(url: string, label: string): Promise<UnknownRecord> {
  return requireOkJson(await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  }), label);
}

async function postJson(url: string, label: string, body: UnknownRecord): Promise<UnknownRecord> {
  return requireOkJson(await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  }), label);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const REHEARSAL_SUBMISSIONS: readonly RehearsalSubmission[] = Object.freeze([
  {
    displayName: 'Live Rehearsal Asha',
    placeName: 'Lagos live mapping rehearsal',
    city: 'Lagos',
    region: '',
    country: 'Nigeria',
    lat: 6.5244,
    long: 3.3792,
    role: 'steward',
    themes: ['public', 'events', 'education'],
    publicNote: 'Hosting a live mapping circle for local public goods.',
    email: 'live-rehearsal-asha@example.org',
  },
  {
    displayName: 'Live Rehearsal Ben',
    placeName: 'Lagos live mapping rehearsal',
    city: 'Lagos',
    region: '',
    country: 'Nigeria',
    lat: 6.5244,
    long: 3.3792,
    role: 'member',
    themes: ['public', 'education', 'waste'],
    publicNote: 'Organizing neighborhood cleanup learning sessions.',
    email: 'live-rehearsal-ben@example.org',
  },
  {
    displayName: 'Live Rehearsal Cami',
    placeName: 'Accra live mapping rehearsal',
    city: 'Accra',
    region: '',
    country: 'Ghana',
    lat: 5.6037,
    long: -0.187,
    role: 'steward',
    themes: ['public', 'events', 'funding'],
    publicNote: 'Connecting local builders with chapter event support.',
    email: 'live-rehearsal-cami@example.org',
  },
  {
    displayName: 'Live Rehearsal Diego',
    placeName: 'Bogota live mapping rehearsal',
    city: 'Bogota',
    region: '',
    country: 'Colombia',
    lat: 4.711,
    long: -74.0721,
    role: 'member',
    themes: ['public', 'water', 'impact'],
    publicNote: 'Tracking water restoration outcomes with community partners.',
    email: 'live-rehearsal-diego@example.org',
  },
  {
    displayName: 'Live Rehearsal Emi',
    placeName: 'Berlin live mapping rehearsal',
    city: 'Berlin',
    region: '',
    country: 'Germany',
    lat: 52.52,
    long: 13.405,
    role: 'member',
    themes: ['public', 'opensrc', 'education'],
    publicNote: 'Building open source tools for shared learning.',
    email: 'live-rehearsal-emi@example.org',
  },
  {
    displayName: 'Live Rehearsal Fara',
    placeName: 'Nairobi live mapping rehearsal',
    city: 'Nairobi',
    region: '',
    country: 'Kenya',
    lat: -1.2864,
    long: 36.8172,
    role: 'steward',
    themes: ['public', 'events', 'mutual'],
    publicNote: 'Coordinating mutual aid and local event crews.',
    email: 'live-rehearsal-fara@example.org',
  },
  {
    displayName: 'Live Rehearsal Gio',
    placeName: 'Cape Town live mapping rehearsal',
    city: 'Cape Town',
    region: '',
    country: 'South Africa',
    lat: -33.9249,
    long: 18.4241,
    role: 'member',
    themes: ['public', 'water', 'impact'],
    publicNote: 'Mapping water stewardship projects near the coast.',
    email: 'live-rehearsal-gio@example.org',
  },
  {
    displayName: 'Live Rehearsal Hana',
    placeName: 'Tokyo live mapping rehearsal',
    city: 'Tokyo',
    region: '',
    country: 'Japan',
    lat: 35.6762,
    long: 139.6503,
    role: 'member',
    themes: ['public', 'energy', 'opensrc'],
    publicNote: 'Exploring clean energy dashboards for local groups.',
    email: 'live-rehearsal-hana@example.org',
  },
  {
    displayName: 'Live Rehearsal Imani',
    placeName: 'New York live mapping rehearsal',
    city: 'New York',
    region: 'New York',
    country: 'United States',
    lat: 40.7128,
    long: -74.006,
    role: 'member',
    themes: ['public', 'waste', 'mutual'],
    publicNote: 'Pairing zero-waste meetups with neighborhood support.',
    email: 'live-rehearsal-imani@example.org',
  },
  {
    displayName: 'Live Rehearsal Jules',
    placeName: 'Toronto live mapping rehearsal',
    city: 'Toronto',
    region: 'Ontario',
    country: 'Canada',
    lat: 43.6532,
    long: -79.3832,
    role: 'member',
    themes: ['public', 'funding', 'impact'],
    publicNote: 'Helping teams measure grant-funded public goods outcomes.',
    email: 'live-rehearsal-jules@example.org',
  },
  {
    displayName: 'Live Rehearsal Kai',
    placeName: 'Sao Paulo live mapping rehearsal',
    city: 'Sao Paulo',
    region: '',
    country: 'Brazil',
    lat: -23.5505,
    long: -46.6333,
    role: 'member',
    themes: ['public', 'food', 'trees'],
    publicNote: 'Growing urban food and biodiversity projects.',
    email: 'live-rehearsal-kai@example.org',
  },
  {
    displayName: 'Live Rehearsal Lina',
    placeName: 'Lisbon live mapping rehearsal',
    city: 'Lisbon',
    region: '',
    country: 'Portugal',
    lat: 38.7223,
    long: -9.1393,
    role: 'member',
    themes: ['public', 'stories', 'events'],
    publicNote: 'Collecting stories from local public goods gatherings.',
    email: 'live-rehearsal-lina@example.org',
  },
]);

const REHEARSAL_DISPLAY_NAMES = [...new Set(REHEARSAL_SUBMISSIONS.map((item) => item.displayName))];
const REHEARSAL_EMAILS = [...new Set(REHEARSAL_SUBMISSIONS.map((item) => item.email))];

async function deleteRehearsalSubmissions(sql: any): Promise<void> {
  for (const email of REHEARSAL_EMAILS) {
    await sql`
      delete from intake.map_node_submissions
      where id in (
        select submission_id
        from intake.map_node_private_contacts
        where email = ${email}
      )
    `;
  }

  for (const displayName of REHEARSAL_DISPLAY_NAMES) {
    await sql`
      delete from intake.map_node_submissions
      where display_name = ${displayName}
    `;
  }
}

async function setLiveMode(sql: any, enabled: boolean): Promise<void> {
  await sql`
    insert into intake.map_node_intake_settings (
      id,
      live_onboarding_enabled,
      updated_by
    )
    values (
      1,
      ${enabled},
      'home-map-live-rehearsal'
    )
    on conflict (id) do update set
      live_onboarding_enabled = excluded.live_onboarding_enabled,
      updated_by = excluded.updated_by
  `;
}

function countsFor(state: UnknownRecord): { nodes: number; edges: number; submissions: number } {
  const nodes = Array.isArray(state.nodes) ? state.nodes : [];
  const edges = Array.isArray(state.edges) ? state.edges : [];
  return {
    nodes: nodes.length,
    edges: edges.length,
    submissions: nodes.filter((node: UnknownRecord) => node?.source === 'approved-submission').length,
  };
}

const options = parseArgs(process.argv.slice(2));
assertLocalTarget('Agent URL', options.agentBaseUrl);
assertLocalTarget('DATABASE_URL', options.databaseUrl);

const sql = createDatabaseClient({ url: options.databaseUrl, max: 1 });
if (!sql) throw new Error('DATABASE_URL is required for the live map rehearsal.');

const mapStateUrl = endpoint(options.agentBaseUrl, PUBLIC_MAP_STATE_ROUTE);
const submissionUrl = endpoint(options.agentBaseUrl, MAP_NODE_SUBMISSIONS_ROUTE);

try {
  if (options.cleanup) {
    await deleteRehearsalSubmissions(sql);
    await setLiveMode(sql, false);
    console.log(JSON.stringify({
      ok: true,
      cleanedRehearsalNodes: true,
      mode: 'moderated',
      website: options.websiteUrl,
    }, null, 2));
  } else {
    await fetchJson(endpoint(options.agentBaseUrl, '/health'), 'agent /health');
    await deleteRehearsalSubmissions(sql);
    await setLiveMode(sql, true);

    const initialState = await fetchJson(mapStateUrl, 'GET /map/state');
    assert.equal(initialState.intakeMode, 'live', '/map/state should report live intake mode');

    console.log(`[home-map-live-rehearsal] Watch the map at ${options.websiteUrl}`);
    console.log(`[home-map-live-rehearsal] Submitting ${options.count} nodes every ${options.intervalMs}ms.`);

    const selected = REHEARSAL_SUBMISSIONS.slice(0, options.count);
    for (let index = 0; index < selected.length; index += 1) {
      const item = selected[index];
      const response = await postJson(submissionUrl, `POST /map-nodes ${item.displayName}`, {
        ...item,
        rawNote: PRIVATE_RAW_NOTE,
        contactConsent: true,
      });
      assert.equal(response.node?.status, 'approved', `${item.displayName} should be approved in live mode`);

      const state = await fetchJson(mapStateUrl, `GET /map/state after ${item.displayName}`);
      assertPublicMapStatePayload(state);
      const counts = countsFor(state);
      console.log(JSON.stringify({
        submitted: index + 1,
        remaining: selected.length - index - 1,
        node: item.displayName,
        counts,
      }));

      if (index < selected.length - 1) await sleep(options.intervalMs);
    }

    console.log(`[home-map-live-rehearsal] Done. Keep watching ${options.websiteUrl}`);
    console.log('[home-map-live-rehearsal] Cleanup: bun run home-map:rehearsal --cleanup');
  }
} finally {
  await sql.end({ timeout: 3 }).catch(() => {});
}
