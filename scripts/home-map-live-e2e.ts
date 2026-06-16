#!/usr/bin/env bun

import assert from 'node:assert/strict';
import { createDatabaseClient } from '@greenpill-network/agent/db';
import { MAP_NODE_SUBMISSIONS_ROUTE } from '@greenpill-network/agent/impact';
import { PUBLIC_MAP_STATE_ROUTE } from '@greenpill-network/agent/map-state';
import { assertPublicMapStatePayload } from '@greenpill-network/shared/map-state';

const DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:3303';
const DEFAULT_DATABASE_URL = 'postgres://greenpill:greenpill@127.0.0.1:3304/greenpill_network';
const LOCAL_STEWARD_EMAIL = 'local-steward@example.org';
const LOCAL_MEMBER_EMAIL = 'local-member@example.org';
const LOCAL_STEWARD_EMAIL_ALT = 'steward@example.org';
const PRIVATE_RAW_NOTE = 'local-live-e2e private raw note';

type UnknownRecord = Record<string, any>;
type ExpectedRole = 'member' | 'steward';

interface E2eSubmission {
  label: string;
  expectedRole: ExpectedRole;
  expectedChapterSlug?: string;
  payload: UnknownRecord;
}

interface Options {
  agentBaseUrl: string;
  databaseUrl: string;
  disableLive: boolean;
  keepLive: boolean;
  allowNonLocal: boolean;
  expanded: boolean;
}

function usage(): string {
  return [
    'Usage: bun run test:home-map:live-e2e [--keep-live] [--expanded] [--disable-live] [--agent-url URL] [--database-url URL] [--allow-nonlocal]',
    '',
    'Run after `bun run dev` is ready. Defaults target the repo local stack:',
    `  agent: ${DEFAULT_AGENT_BASE_URL}`,
    `  db:    ${DEFAULT_DATABASE_URL}`,
    '',
    '--keep-live leaves live onboarding enabled and keeps the submitted local nodes for manual rehearsal.',
    '--expanded submits a denser local visual scenario: 9 members + 4 stewards.',
    '--disable-live removes the deterministic e2e nodes and turns local live onboarding off.',
  ].join('\n');
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    agentBaseUrl: process.env.HOME_MAP_LIVE_E2E_AGENT_URL || DEFAULT_AGENT_BASE_URL,
    databaseUrl: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
    disableLive: false,
    keepLive: process.env.HOME_MAP_LIVE_E2E_KEEP_LIVE === '1',
    allowNonLocal: process.env.HOME_MAP_LIVE_E2E_ALLOW_NONLOCAL === '1',
    expanded: process.env.HOME_MAP_LIVE_E2E_EXPANDED === '1',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--keep-live') {
      options.keepLive = true;
      continue;
    }
    if (arg === '--expanded') {
      options.expanded = true;
      continue;
    }
    if (arg === '--disable-live') {
      options.disableLive = true;
      continue;
    }
    if (arg === '--allow-nonlocal') {
      options.allowNonLocal = true;
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

  return options;
}

function assertLocalTarget(label: string, value: string, { allowNonLocal }: { allowNonLocal: boolean }): void {
  if (!value) throw new Error(`${label} is required.`);
  if (allowNonLocal) return;

  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]' && host !== '::1') {
    throw new Error(`${label} must be local unless --allow-nonlocal is passed: ${value}`);
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
  if (!response.ok) {
    throw new Error(`${label} returned ${response.status}: ${JSON.stringify(json)}`);
  }
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

async function deleteE2eSubmissions(sql: any): Promise<void> {
  for (const email of E2E_EMAILS) {
    await sql`
      delete from intake.map_node_submissions
      where id in (
        select submission_id
        from intake.map_node_private_contacts
        where email = ${email}
      )
    `;
  }

  for (const displayName of E2E_DISPLAY_NAMES) {
    await sql`
      delete from intake.map_node_submissions
      where display_name = ${displayName}
    `;
  }
}

async function getLiveMode(sql: any): Promise<boolean> {
  const rows = await sql`
    select live_onboarding_enabled as "liveOnboardingEnabled"
    from intake.map_node_intake_settings
    where id = 1
  `;
  return rows[0]?.liveOnboardingEnabled === true || rows[0]?.liveOnboardingEnabled === 'true';
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
      'home-map-live-e2e'
    )
    on conflict (id) do update set
      live_onboarding_enabled = excluded.live_onboarding_enabled,
      updated_by = excluded.updated_by
  `;
}

function findNode(state: UnknownRecord, name: string): UnknownRecord {
  const node = Array.isArray(state.nodes)
    ? state.nodes.find((candidate: UnknownRecord) => candidate?.name === name)
    : null;
  assert.ok(node, `${name} should appear in /map/state`);
  return node;
}

function assertNoPrivateLeak(payload: UnknownRecord): void {
  assertPublicMapStatePayload(payload);
  const serialized = JSON.stringify(payload);
  for (const privateValue of [...E2E_EMAILS, PRIVATE_RAW_NOTE]) {
    assert.equal(
      serialized.includes(privateValue),
      false,
      `/map/state must not expose private value ${privateValue}`
    );
  }
}

const submission = (
  label: string,
  expectedRole: ExpectedRole,
  payload: Omit<UnknownRecord, 'rawNote' | 'contactConsent'>
): E2eSubmission => ({
  label,
  expectedRole,
  ...(expectedRole === 'steward' ? { expectedChapterSlug: 'nigeria' } : {}),
  payload: Object.freeze({
    ...payload,
    rawNote: PRIVATE_RAW_NOTE,
    contactConsent: true,
  }),
});

const BASE_SUBMISSIONS = Object.freeze([
  submission('base-member', 'member', {
    displayName: 'Local Live E2E Member',
    placeName: 'Oakland local live test',
    city: 'Oakland',
    region: 'California',
    country: 'United States',
    lat: 37.8044,
    long: -122.2712,
    role: 'member',
    themes: ['public', 'events'],
    publicNote: 'Local live e2e member node.',
    email: LOCAL_MEMBER_EMAIL,
  }),
  submission('base-steward', 'steward', {
    displayName: 'Local Live E2E Steward',
    placeName: 'Lagos local live test',
    city: 'Lagos',
    region: '',
    country: 'Nigeria',
    lat: 6.5244,
    long: 3.3792,
    role: 'steward',
    themes: ['public', 'events'],
    publicNote: 'Local live e2e steward node.',
    email: LOCAL_STEWARD_EMAIL,
  }),
]);

const EXPANDED_SUBMISSIONS = Object.freeze([
  submission('member-nyc', 'member', {
    displayName: 'Local Live E2E Member NYC',
    placeName: 'New York City local live test',
    city: 'New York City',
    region: 'New York',
    country: 'United States',
    lat: 40.7128,
    long: -74.006,
    role: 'member',
    themes: ['public', 'events', 'education'],
    publicNote: 'Local live e2e NYC member node.',
    email: 'local-member-nyc@example.org',
  }),
  submission('member-toronto', 'member', {
    displayName: 'Local Live E2E Member Toronto',
    placeName: 'Toronto local live test',
    city: 'Toronto',
    region: 'Ontario',
    country: 'Canada',
    lat: 43.6532,
    long: -79.3832,
    role: 'member',
    themes: ['public', 'events', 'funding'],
    publicNote: 'Local live e2e Toronto member node.',
    email: 'local-member-toronto@example.org',
  }),
  submission('member-ottawa', 'member', {
    displayName: 'Local Live E2E Member Ottawa',
    placeName: 'Ottawa local live test',
    city: 'Ottawa',
    region: 'Ontario',
    country: 'Canada',
    lat: 45.4215,
    long: -75.6972,
    role: 'member',
    themes: ['public', 'mutual', 'gov'],
    publicNote: 'Local live e2e Ottawa member node.',
    email: 'local-member-ottawa@example.org',
  }),
  submission('member-london-ontario', 'member', {
    displayName: 'Local Live E2E Member London Ontario',
    placeName: 'London Ontario local live test',
    city: 'London',
    region: 'Ontario',
    country: 'Canada',
    lat: 42.9849,
    long: -81.2453,
    role: 'member',
    themes: ['public', 'food', 'trees'],
    publicNote: 'Local live e2e London Ontario member node.',
    email: 'local-member-london-ontario@example.org',
  }),
  submission('member-berlin', 'member', {
    displayName: 'Local Live E2E Member Berlin',
    placeName: 'Berlin local live test',
    city: 'Berlin',
    region: '',
    country: 'Germany',
    lat: 52.52,
    long: 13.405,
    role: 'member',
    themes: ['public', 'opensource', 'education'],
    publicNote: 'Local live e2e Berlin member node.',
    email: 'local-member-berlin@example.org',
  }),
  submission('member-bogota', 'member', {
    displayName: 'Local Live E2E Member Bogota',
    placeName: 'Bogota local live test',
    city: 'Bogota',
    region: '',
    country: 'Colombia',
    lat: 4.711,
    long: -74.0721,
    role: 'member',
    themes: ['public', 'water', 'impact'],
    publicNote: 'Local live e2e Bogota member node.',
    email: 'local-member-bogota@example.org',
  }),
  submission('member-sao-paulo', 'member', {
    displayName: 'Local Live E2E Member Sao Paulo',
    placeName: 'Sao Paulo local live test',
    city: 'Sao Paulo',
    region: '',
    country: 'Brazil',
    lat: -23.5505,
    long: -46.6333,
    role: 'member',
    themes: ['public', 'funding', 'impact'],
    publicNote: 'Local live e2e Sao Paulo member node.',
    email: 'local-member-sao-paulo@example.org',
  }),
  submission('member-tokyo', 'member', {
    displayName: 'Local Live E2E Member Tokyo',
    placeName: 'Tokyo local live test',
    city: 'Tokyo',
    region: '',
    country: 'Japan',
    lat: 35.6762,
    long: 139.6503,
    role: 'member',
    themes: ['public', 'energy', 'opensource'],
    publicNote: 'Local live e2e Tokyo member node.',
    email: 'local-member-tokyo@example.org',
  }),
  submission('steward-accra', 'steward', {
    displayName: 'Local Live E2E Steward Accra',
    placeName: 'Accra local live test',
    city: 'Accra',
    region: '',
    country: 'Ghana',
    lat: 5.6037,
    long: -0.187,
    role: 'steward',
    themes: ['public', 'events', 'education'],
    publicNote: 'Local live e2e Accra steward node.',
    email: LOCAL_STEWARD_EMAIL_ALT,
  }),
  submission('steward-nairobi', 'steward', {
    displayName: 'Local Live E2E Steward Nairobi',
    placeName: 'Nairobi local live test',
    city: 'Nairobi',
    region: '',
    country: 'Kenya',
    lat: -1.2864,
    long: 36.8172,
    role: 'steward',
    themes: ['public', 'events', 'education'],
    publicNote: 'Local live e2e Nairobi steward node.',
    email: LOCAL_STEWARD_EMAIL,
  }),
  submission('steward-cape-town', 'steward', {
    displayName: 'Local Live E2E Steward Cape Town',
    placeName: 'Cape Town local live test',
    city: 'Cape Town',
    region: '',
    country: 'South Africa',
    lat: -33.9249,
    long: 18.4241,
    role: 'steward',
    themes: ['public', 'water', 'impact'],
    publicNote: 'Local live e2e Cape Town steward node.',
    email: LOCAL_STEWARD_EMAIL_ALT,
  }),
]);

const ALL_E2E_SUBMISSIONS = Object.freeze([...BASE_SUBMISSIONS, ...EXPANDED_SUBMISSIONS]);
const E2E_DISPLAY_NAMES = [...new Set(ALL_E2E_SUBMISSIONS.map((item) => String(item.payload.displayName)))];
const E2E_EMAILS = [...new Set(ALL_E2E_SUBMISSIONS.map((item) => String(item.payload.email)))];

const options = parseArgs(process.argv.slice(2));
assertLocalTarget('Agent URL', options.agentBaseUrl, { allowNonLocal: options.allowNonLocal });
assertLocalTarget('DATABASE_URL', options.databaseUrl, { allowNonLocal: options.allowNonLocal });

const sql = createDatabaseClient({ url: options.databaseUrl, max: 1 });
if (!sql) {
  throw new Error('DATABASE_URL is required for the live map e2e.');
}

const mapStateUrl = endpoint(options.agentBaseUrl, PUBLIC_MAP_STATE_ROUTE);
const submissionUrl = endpoint(options.agentBaseUrl, MAP_NODE_SUBMISSIONS_ROUTE);
// null until the real prior mode is read, so an early failure (for example an
// unreachable agent) never "restores" an already-live local session to false.
let previousLiveMode: boolean | null = null;

try {
  if (options.disableLive) {
    await deleteE2eSubmissions(sql);
    await setLiveMode(sql, false);
    console.log(JSON.stringify({
      ok: true,
      mode: 'moderated',
      cleanedDeterministicE2eNodes: true,
    }, null, 2));
  } else {
    console.log('[home-map-live-e2e] Checking local agent readiness.');
    const health = await fetchJson(endpoint(options.agentBaseUrl, '/health'), 'agent /health');
    assert.equal(health.ok, true, 'agent /health should be ok');

    previousLiveMode = await getLiveMode(sql);
    await deleteE2eSubmissions(sql);
    await setLiveMode(sql, true);

    const initialState = await fetchJson(mapStateUrl, 'GET /map/state');
    assert.equal(initialState.intakeMode, 'live', '/map/state should report live intake mode');

    const selectedSubmissions = options.expanded
      ? [...BASE_SUBMISSIONS, ...EXPANDED_SUBMISSIONS]
      : [...BASE_SUBMISSIONS];
    console.log(
      `[home-map-live-e2e] Submitting ${selectedSubmissions.length} live ${options.expanded ? 'expanded' : 'base'} map nodes.`
    );
    for (const item of selectedSubmissions) {
      const response = await postJson(
        submissionUrl,
        `POST /map-nodes ${item.payload.displayName}`,
        item.payload
      );
      assert.equal(response.node?.status, 'approved', `${item.payload.displayName} should be approved in live mode`);
      assert.equal(
        response.node?.role,
        item.expectedRole,
        item.expectedRole === 'steward'
          ? [
            `${item.payload.displayName} should render as steward.`,
            'If this fails, restart `bun run dev` so the local MAP_NODE_STEWARD_EMAIL_ALLOWLIST default is loaded.',
          ].join(' ')
          : `${item.payload.displayName} should stay a member`
      );
      if (item.expectedChapterSlug) {
        assert.equal(
          response.node?.chapterSlug,
          item.expectedChapterSlug,
          `${item.payload.displayName} should attach to ${item.expectedChapterSlug}`
        );
      }
    }

    const state = await fetchJson(mapStateUrl, 'GET /map/state after submissions');
    assertNoPrivateLeak(state);

    const submittedNodes = selectedSubmissions.map((item) => {
      const node = findNode(state, String(item.payload.displayName));
      assert.equal(node.type, item.expectedRole, `${item.payload.displayName} should appear as ${item.expectedRole}`);
      if (item.expectedChapterSlug) {
        assert.equal(
          node.chapterSlug,
          item.expectedChapterSlug,
          `${item.payload.displayName} should keep public chapter link`
        );
      }
      return { item, node };
    });

    const stewardNodes = submittedNodes.filter(({ item }) => item.expectedRole === 'steward');
    const edges: UnknownRecord[] = Array.isArray(state.edges) ? state.edges : [];

    // The relationship web is person-to-person only: every edge is a shared-theme
    // connection between submitted people, and no edge ever touches a chapter
    // anchor (chapters are geographic anchors, not relationship nodes).
    assert.equal(edges.length > 0, true, 'live map state should generate person-to-person relationship edges');
    assert.equal(
      edges.every((edge) => edge?.kind === 'shared-theme'),
      true,
      'every generated edge should be a person-to-person shared-theme edge (no steward-chapter)'
    );
    assert.equal(
      edges.some((edge) => (
        String(edge?.from).startsWith('chapter:') || String(edge?.to).startsWith('chapter:')
      )),
      false,
      'no relationship edge should connect to a chapter anchor'
    );

    // Theme colour is the only relationship encoding, so edge-theme selection must
    // surface specific themes rather than collapsing everything to `public`.
    const edgeThemes = new Set(edges.map((edge) => String(edge?.theme)).filter(Boolean));
    const nonPublicThemes = [...edgeThemes].filter((theme) => theme !== 'public');
    if (options.expanded) {
      assert.equal(
        nonPublicThemes.length > 1,
        true,
        `expanded scenario should surface more than one non-public edge theme colour (got: ${[...edgeThemes].join(', ') || 'none'})`
      );
    }

    const submittedByLabel = Object.fromEntries(
      submittedNodes.map(({ item, node }) => [item.label, node.id])
    );

    console.log(JSON.stringify({
      ok: true,
      agent: options.agentBaseUrl,
      mode: 'live',
      scenario: options.expanded ? 'expanded' : 'base',
      submitted: submittedByLabel,
      counts: {
        submittedNodes: submittedNodes.length,
        submittedMembers: submittedNodes.filter(({ item }) => item.expectedRole === 'member').length,
        submittedStewards: stewardNodes.length,
        stateNodes: Array.isArray(state.nodes) ? state.nodes.length : 0,
        stateEdges: edges.length,
        edgeThemes: [...edgeThemes].sort(),
      },
      keepLive: options.keepLive,
    }, null, 2));
  }
} finally {
  if (!options.keepLive && !options.disableLive) {
    await deleteE2eSubmissions(sql).catch(() => {});
    if (previousLiveMode !== null) {
      await setLiveMode(sql, previousLiveMode).catch(() => {});
    }
  }
  await sql.end({ timeout: 3 }).catch(() => {});
}
