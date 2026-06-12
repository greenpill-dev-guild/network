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
const PRIVATE_RAW_NOTE = 'local-live-e2e private raw note';
const E2E_DISPLAY_NAMES = ['Local Live E2E Member', 'Local Live E2E Steward'];
const E2E_EMAILS = [LOCAL_MEMBER_EMAIL, LOCAL_STEWARD_EMAIL];

type UnknownRecord = Record<string, any>;

interface Options {
  agentBaseUrl: string;
  databaseUrl: string;
  disableLive: boolean;
  keepLive: boolean;
  allowNonLocal: boolean;
}

function usage(): string {
  return [
    'Usage: bun run test:home-map:live-e2e [--keep-live] [--disable-live] [--agent-url URL] [--database-url URL] [--allow-nonlocal]',
    '',
    'Run after `bun run dev` is ready. Defaults target the repo local stack:',
    `  agent: ${DEFAULT_AGENT_BASE_URL}`,
    `  db:    ${DEFAULT_DATABASE_URL}`,
    '',
    '--keep-live leaves live onboarding enabled and keeps the submitted local nodes for manual rehearsal.',
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

const memberPayload = Object.freeze({
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
  rawNote: PRIVATE_RAW_NOTE,
  email: LOCAL_MEMBER_EMAIL,
  contactConsent: true,
});

const stewardPayload = Object.freeze({
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
  rawNote: PRIVATE_RAW_NOTE,
  email: LOCAL_STEWARD_EMAIL,
  contactConsent: true,
});

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

    console.log('[home-map-live-e2e] Submitting live member and allowlisted steward nodes.');
    const memberResponse = await postJson(submissionUrl, 'POST /map-nodes member', memberPayload);
    const stewardResponse = await postJson(submissionUrl, 'POST /map-nodes steward', stewardPayload);
    assert.equal(memberResponse.node?.status, 'approved', 'live member submission should be approved');
    assert.equal(stewardResponse.node?.status, 'approved', 'live steward submission should be approved');
    assert.equal(memberResponse.node?.role, 'member', 'member submission should stay a member');
    assert.equal(
      stewardResponse.node?.role,
      'steward',
      [
        'steward submission should render as steward.',
        'If this fails, restart `bun run dev` so the local MAP_NODE_STEWARD_EMAIL_ALLOWLIST default is loaded.',
      ].join(' ')
    );
    assert.equal(stewardResponse.node?.chapterSlug, 'nigeria', 'local steward should attach to Nigeria chapter');

    const state = await fetchJson(mapStateUrl, 'GET /map/state after submissions');
    assertNoPrivateLeak(state);

    const memberNode = findNode(state, memberPayload.displayName);
    const stewardNode = findNode(state, stewardPayload.displayName);
    assert.equal(memberNode.type, 'member', 'member node should appear as a member');
    assert.equal(stewardNode.type, 'steward', 'steward node should appear as a steward');
    assert.equal(stewardNode.chapterSlug, 'nigeria', 'steward node should keep public chapter link');

    const stewardChapterEdge = Array.isArray(state.edges)
      ? state.edges.find((edge: UnknownRecord) => (
        edge?.kind === 'steward-chapter' &&
        (edge.from === stewardNode.id || edge.to === stewardNode.id) &&
        (edge.from === 'chapter:nigeria' || edge.to === 'chapter:nigeria')
      ))
      : null;
    assert.ok(stewardChapterEdge, 'map state should include a source-backed steward-to-chapter edge');

    console.log(JSON.stringify({
      ok: true,
      agent: options.agentBaseUrl,
      mode: 'live',
      submitted: {
        member: memberNode.id,
        steward: stewardNode.id,
        stewardChapterEdge: stewardChapterEdge.id,
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
