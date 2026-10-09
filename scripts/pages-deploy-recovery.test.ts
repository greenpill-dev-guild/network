import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  HUNG_AFTER_MS,
  createGitHubPagesPipeline,
  earliestJobStart,
  findHungRuns,
  readConfig,
  watchPagesPipeline,
  type PagesPipeline,
  type PagesRun,
} from './pages-deploy-recovery.ts';

const MINUTE = 60_000;
const POLL_MS = 30_000;

// Timestamps below are the real ones from the 2026-10-06 hang (run 37446409980)
// and from the run that sat queued behind it until 2026-10-09 (run 37955711395).
const HUNG_RUN: PagesRun = {
  id: 37446409980,
  status: 'waiting',
  executingSince: '2026-10-06T09:56:33.000Z',
  url: 'https://github.com/greenpill-dev-guild/network/actions/runs/37446409980',
};
const QUEUED_RUN: PagesRun = {
  id: 37955711395,
  status: 'pending',
  executingSince: null,
  url: 'https://github.com/greenpill-dev-guild/network/actions/runs/37955711395',
};

test('a run waiting past the threshold is hung and the run queued behind it is not', () => {
  const now = Date.parse('2026-10-09T18:34:00Z');

  assert.deepEqual(findHungRuns([QUEUED_RUN, HUNG_RUN], now), [HUNG_RUN]);
});

test('a run is hung only once it has held the pipeline for longer than the threshold', () => {
  const startedAt = Date.parse(HUNG_RUN.executingSince!);
  const inProgress = { ...HUNG_RUN, status: 'in_progress' };

  assert.deepEqual(findHungRuns([HUNG_RUN], startedAt + HUNG_AFTER_MS), []);
  assert.deepEqual(findHungRuns([HUNG_RUN], startedAt + HUNG_AFTER_MS + 1), [HUNG_RUN]);
  assert.deepEqual(findHungRuns([inProgress], startedAt + HUNG_AFTER_MS + 1), [inProgress]);
});

test('runs that do not hold the pipeline, or cannot be dated, are never hung', () => {
  const longAfter = Date.parse('2026-10-09T18:34:00Z');
  const old = '2026-10-06T09:56:33.000Z';

  for (const status of ['pending', 'queued', 'requested', 'completed']) {
    assert.deepEqual(findHungRuns([{ ...HUNG_RUN, status, executingSince: old }], longAfter), [], status);
  }
  assert.deepEqual(findHungRuns([{ ...HUNG_RUN, executingSince: null }], longAfter), []);
  assert.deepEqual(findHungRuns([{ ...HUNG_RUN, executingSince: 'not a date' }], longAfter), []);
});

test('a run began executing when the first job of its current attempt started', () => {
  // Run 37955711395: created at 15:58:43, queued behind the hang until 18:35.
  assert.equal(
    earliestJobStart(
      [
        { started_at: '2026-10-09T18:37:22Z' },
        { started_at: '2026-10-09T18:35:49Z' },
        { started_at: null },
        { started_at: 'not a date' },
        {},
      ],
      '2026-10-09T15:58:43Z'
    ),
    '2026-10-09T18:35:49.000Z'
  );
  assert.equal(earliestJobStart([], '2026-10-09T15:58:43Z'), null);
  assert.equal(earliestJobStart([{ started_at: null }], '2026-10-09T15:58:43Z'), null);
});

test('a re-run is not dated by a job it kept from the earlier attempt', () => {
  // Re-running only the failed deploy of the hung run keeps its build job,
  // which started three days earlier.
  const rerunStartedAt = '2026-10-09T19:00:00Z';
  const jobs = [
    { name: 'build', started_at: '2026-10-06T09:56:33Z' },
    { name: 'deploy', started_at: '2026-10-09T19:00:04Z' },
  ];

  const executingSince = earliestJobStart(jobs, rerunStartedAt);

  assert.equal(executingSince, '2026-10-09T19:00:04.000Z');
  const rerun = { ...HUNG_RUN, status: 'in_progress', executingSince };
  assert.deepEqual(findHungRuns([rerun], Date.parse('2026-10-09T19:01:00Z')), []);
  assert.deepEqual(findHungRuns([rerun], Date.parse('2026-10-09T19:31:00Z')), [rerun]);

  // A job from this attempt may start in the same second the attempt did.
  assert.equal(earliestJobStart([{ started_at: rerunStartedAt }], rerunStartedAt), '2026-10-09T19:00:00.000Z');
  // Before a job of this attempt starts, or without the attempt's start, the run cannot be dated.
  assert.equal(earliestJobStart([jobs[0]], rerunStartedAt), null);
  assert.equal(earliestJobStart(jobs, ''), null);
});

// --- Watching -----------------------------------------------------------------

/** A scripted Pages pipeline on a virtual clock. Tests script GitHub's side through the hooks. */
function simulate(initialRuns: PagesRun[], startAt: string) {
  const clock = { nowMs: Date.parse(startAt) };
  const sim = {
    runs: initialRuns.map((run) => ({ ...run })),
    calls: [] as string[],
    onCancel: (_run: PagesRun) => {},
    onForceCancel: (_run: PagesRun) => {},
    onStart: () => {},
    onTick: () => {},
    finish(id: number) {
      sim.runs = sim.runs.filter((run) => run.id !== id);
    },
  };
  const pipeline: PagesPipeline = {
    async listUnfinishedRuns() {
      return sim.runs.map((run) => ({ ...run }));
    },
    async cancelRun(run) {
      sim.calls.push(`cancel ${run.id}`);
      sim.onCancel(run);
    },
    async forceCancelRun(run) {
      sim.calls.push(`force-cancel ${run.id}`);
      sim.onForceCancel(run);
    },
    async startRun() {
      sim.calls.push('start');
      sim.onStart();
    },
  };
  const options = {
    pollIntervalMs: POLL_MS,
    now: () => clock.nowMs,
    sleep: async (ms: number) => {
      clock.nowMs += ms;
      sim.onTick();
    },
    log: () => {},
  };
  return { clock, sim, pipeline, options };
}

/** Lets `id` start executing now and finish two minutes later, as a healthy run does. */
function runToCompletion(harness: ReturnType<typeof simulate>, id: number) {
  const { clock, sim } = harness;
  const startedAtMs = clock.nowMs;
  const run = sim.runs.find((candidate) => candidate.id === id)!;
  run.status = 'in_progress';
  run.executingSince = new Date(startedAtMs).toISOString();
  sim.onTick = () => {
    if (clock.nowMs - startedAtMs >= 2 * MINUTE) sim.finish(id);
  };
}

test('an idle pipeline needs nothing', async () => {
  const harness = simulate([], '2026-10-09T18:34:00Z');

  const watch = await watchPagesPipeline(harness.pipeline, harness.options);

  assert.deepEqual(watch, { cancelled: [], startedReplacement: false });
  assert.deepEqual(harness.sim.calls, []);
});

test('a healthy run is watched to the end and left alone', async () => {
  const harness = simulate([{ ...QUEUED_RUN, status: 'queued' }], '2026-10-09T18:34:00Z');
  runToCompletion(harness, QUEUED_RUN.id);

  const watch = await watchPagesPipeline(harness.pipeline, harness.options);

  assert.deepEqual(watch, { cancelled: [], startedReplacement: false });
  assert.deepEqual(harness.sim.calls, []);
  assert.equal(harness.clock.nowMs - Date.parse('2026-10-09T18:34:00Z'), 2 * MINUTE);
});

test('a run that hangs while watched is cancelled just after the threshold', async () => {
  const startAt = '2026-10-06T09:56:33.000Z';
  const harness = simulate([{ ...HUNG_RUN, status: 'in_progress', executingSince: startAt }], startAt);
  let cancelledAtMs = 0;
  harness.sim.onTick = () => {
    // The build finishes and the deploy job never leaves `waiting`.
    const run = harness.sim.runs.find((candidate) => candidate.id === HUNG_RUN.id);
    if (run && harness.clock.nowMs - Date.parse(startAt) >= 2 * MINUTE) run.status = 'waiting';
  };
  harness.sim.onCancel = (run) => {
    cancelledAtMs = harness.clock.nowMs;
    harness.sim.finish(run.id);
    harness.sim.onStart = () => {
      harness.sim.runs.push({ ...QUEUED_RUN, status: 'queued' });
      runToCompletion(harness, QUEUED_RUN.id);
    };
  };

  const watch = await watchPagesPipeline(harness.pipeline, harness.options);

  const heldForMs = cancelledAtMs - Date.parse(startAt);
  assert.ok(heldForMs > HUNG_AFTER_MS, `cancelled too early, after ${heldForMs}ms`);
  assert.ok(heldForMs <= HUNG_AFTER_MS + POLL_MS, `cancelled too late, after ${heldForMs}ms`);
  assert.deepEqual(watch.cancelled.map((run) => run.id), [HUNG_RUN.id]);
});

test('cancelling a hung run lets the queued run through without starting another', async () => {
  const harness = simulate([HUNG_RUN, QUEUED_RUN], '2026-10-09T18:34:00Z');
  harness.sim.onCancel = (run) => {
    harness.sim.finish(run.id);
    runToCompletion(harness, QUEUED_RUN.id);
  };

  const watch = await watchPagesPipeline(harness.pipeline, harness.options);

  assert.deepEqual(harness.sim.calls, [`cancel ${HUNG_RUN.id}`]);
  assert.deepEqual(watch.cancelled.map((run) => run.id), [HUNG_RUN.id]);
  assert.equal(watch.startedReplacement, false);
});

test('with nothing queued behind a hung run, a fresh run is started and watched', async () => {
  const harness = simulate([HUNG_RUN], '2026-10-09T18:34:00Z');
  harness.sim.onCancel = (run) => harness.sim.finish(run.id);
  harness.sim.onStart = () => {
    harness.sim.runs.push({ ...QUEUED_RUN, status: 'queued' });
    runToCompletion(harness, QUEUED_RUN.id);
  };

  const watch = await watchPagesPipeline(harness.pipeline, harness.options);

  assert.deepEqual(harness.sim.calls, [`cancel ${HUNG_RUN.id}`, 'start']);
  assert.equal(watch.startedReplacement, true);
  assert.deepEqual(harness.sim.runs, [], 'the watch ends only after the fresh run has finished');
});

test('a run that ignores the cancel request is force-cancelled once', async () => {
  const startAt = '2026-10-09T18:34:00Z';
  const harness = simulate([HUNG_RUN, QUEUED_RUN], startAt);
  let forcedAtMs = 0;
  harness.sim.onForceCancel = (run) => {
    forcedAtMs = harness.clock.nowMs;
    harness.sim.finish(run.id);
    runToCompletion(harness, QUEUED_RUN.id);
  };

  await watchPagesPipeline(harness.pipeline, harness.options);

  assert.deepEqual(harness.sim.calls, [`cancel ${HUNG_RUN.id}`, `force-cancel ${HUNG_RUN.id}`]);
  assert.equal(forcedAtMs - Date.parse(startAt), 2 * MINUTE);
});

test('the watch fails when a hung run cannot be cancelled', async () => {
  const harness = simulate([HUNG_RUN], '2026-10-09T18:34:00Z');

  await assert.rejects(
    () => watchPagesPipeline(harness.pipeline, harness.options),
    /still not idle after 50 minutes, having cancelled run 37446409980/
  );
  assert.deepEqual(harness.sim.calls, [`cancel ${HUNG_RUN.id}`, `force-cancel ${HUNG_RUN.id}`]);
});

test('the watch fails when the fresh run never appears', async () => {
  const harness = simulate([HUNG_RUN], '2026-10-09T18:34:00Z');
  harness.sim.onCancel = (run) => harness.sim.finish(run.id);

  await assert.rejects(
    () => watchPagesPipeline(harness.pipeline, harness.options),
    /fresh Pages run did not appear within 3 minutes/
  );
  assert.deepEqual(harness.sim.calls, [`cancel ${HUNG_RUN.id}`, 'start']);
});

test('a failed read of the runs is retried instead of ending the watch', async () => {
  const harness = simulate([HUNG_RUN, QUEUED_RUN], '2026-10-09T18:34:00Z');
  harness.sim.onCancel = (run) => {
    harness.sim.finish(run.id);
    runToCompletion(harness, QUEUED_RUN.id);
  };
  const list = harness.pipeline.listUnfinishedRuns;
  let reads = 0;
  harness.pipeline.listUnfinishedRuns = async () => {
    reads += 1;
    if (reads === 1) throw new Error('GET /actions/workflows/github-pages.yml/runs failed with 502');
    return list();
  };

  const watch = await watchPagesPipeline(harness.pipeline, harness.options);

  assert.deepEqual(watch.cancelled.map((run) => run.id), [HUNG_RUN.id]);
});

test('a fresh run that hangs in turn is cancelled and followed by another', async () => {
  const harness = simulate([HUNG_RUN], '2026-10-09T18:34:00Z');
  const firstFresh: PagesRun = { ...QUEUED_RUN, id: 2, url: 'https://example.test/2' };
  const secondFresh: PagesRun = { ...QUEUED_RUN, id: 3, url: 'https://example.test/3' };
  let starts = 0;
  harness.sim.onCancel = (run) => harness.sim.finish(run.id);
  harness.sim.onStart = () => {
    starts += 1;
    if (starts === 1) {
      // The first fresh run starts executing and never finishes.
      harness.sim.runs.push({
        ...firstFresh,
        status: 'waiting',
        executingSince: new Date(harness.clock.nowMs).toISOString(),
      });
    } else {
      harness.sim.runs.push({ ...secondFresh, status: 'queued' });
      runToCompletion(harness, secondFresh.id);
    }
  };

  const watch = await watchPagesPipeline(harness.pipeline, harness.options);

  assert.deepEqual(harness.sim.calls, [`cancel ${HUNG_RUN.id}`, 'start', `cancel ${firstFresh.id}`, 'start']);
  assert.deepEqual(watch.cancelled.map((run) => run.id), [HUNG_RUN.id, firstFresh.id]);
  assert.equal(watch.startedReplacement, true);
});

// --- GitHub API ----------------------------------------------------------------

type FakeResponse = { status?: number; body?: unknown };

function fakeGitHub(
  respond: (method: string, path: string, body: unknown) => FakeResponse,
  { watchedRunId }: { watchedRunId?: number } = {}
) {
  const requests: Array<{ method: string; path: string; body: unknown; authorization: string | null }> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const path = `${url.pathname}${url.search}`.replace('/repos/greenpill-dev-guild/network', '');
    requests.push({ method, path, body, authorization: new Headers(init?.headers).get('authorization') });
    const { status = 200, body: responseBody } = respond(method, path, body);
    return new Response(responseBody === undefined ? null : JSON.stringify(responseBody), { status });
  }) as typeof fetch;
  const pipeline = createGitHubPagesPipeline({
    apiUrl: 'https://api.github.test/',
    repository: 'greenpill-dev-guild/network',
    token: 'test-token',
    workflowFile: 'github-pages.yml',
    branch: 'main',
    watchedRunId,
    fetch: fetchImpl,
  });
  return { pipeline, requests };
}

const runsPath = (status: string) => `/actions/workflows/github-pages.yml/runs?status=${status}&per_page=100`;

test('unfinished runs are dated by their first job, not by when the run was created', async () => {
  // Run 37955711395 was created at 15:58 and queued behind the hang until 18:35.
  // Dated by `run_started_at`, it would look hung the moment it was released.
  const { pipeline, requests } = fakeGitHub((_method, path) => {
    if (path === runsPath('in_progress')) {
      return {
        body: {
          workflow_runs: [
            {
              id: 37955711395,
              status: 'in_progress',
              created_at: '2026-10-09T15:58:43Z',
              run_started_at: '2026-10-09T15:58:43Z',
              html_url: QUEUED_RUN.url,
            },
          ],
        },
      };
    }
    if (path === runsPath('pending')) {
      return { body: { workflow_runs: [{ id: 7, status: 'pending', html_url: 'https://example.test/7' }] } };
    }
    if (path === '/actions/runs/37955711395/jobs?per_page=100') {
      return { body: { jobs: [{ name: 'build', started_at: '2026-10-09T18:35:49Z' }] } };
    }
    return { body: { workflow_runs: [] } };
  });

  const runs = await pipeline.listUnfinishedRuns();

  assert.deepEqual(runs, [
    { id: 7, status: 'pending', executingSince: null, url: 'https://example.test/7' },
    { id: 37955711395, status: 'in_progress', executingSince: '2026-10-09T18:35:49.000Z', url: QUEUED_RUN.url },
  ]);
  assert.deepEqual(findHungRuns(runs, Date.parse('2026-10-09T18:36:30Z')), []);
  assert.deepEqual(
    requests.map((request) => request.path),
    [
      runsPath('requested'),
      runsPath('queued'),
      runsPath('pending'),
      runsPath('in_progress'),
      runsPath('waiting'),
      '/actions/runs/37955711395/jobs?per_page=100',
    ],
    'jobs are read only for the run that holds the pipeline'
  );
  assert.ok(requests.every((request) => request.authorization === 'Bearer test-token'));
});

test('a re-run read from the API is dated by its own attempt', async () => {
  const { pipeline } = fakeGitHub((_method, path) => {
    if (path === runsPath('in_progress')) {
      return {
        body: {
          workflow_runs: [
            {
              id: HUNG_RUN.id,
              status: 'in_progress',
              run_attempt: 2,
              created_at: '2026-10-06T09:56:31Z',
              run_started_at: '2026-10-09T19:00:00Z',
              html_url: HUNG_RUN.url,
            },
          ],
        },
      };
    }
    if (path === `/actions/runs/${HUNG_RUN.id}/jobs?per_page=100`) {
      return {
        body: {
          jobs: [
            { name: 'build', started_at: '2026-10-06T09:56:33Z' },
            { name: 'deploy', started_at: '2026-10-09T19:00:04Z' },
          ],
        },
      };
    }
    return { body: { workflow_runs: [] } };
  });

  const runs = await pipeline.listUnfinishedRuns();

  assert.deepEqual(runs, [
    { id: HUNG_RUN.id, status: 'in_progress', executingSince: '2026-10-09T19:00:04.000Z', url: HUNG_RUN.url },
  ]);
  assert.deepEqual(findHungRuns(runs, Date.parse('2026-10-09T19:01:00Z')), []);
});

test('the run a watcher was started for stays unfinished until it completes', async () => {
  // The run listing can lag behind the trigger. Without this the watcher would
  // see an empty pipeline and leave before its own run had appeared.
  let status = 'queued';
  const { pipeline } = fakeGitHub(
    (_method, path) =>
      path === '/actions/runs/37955711395'
        ? { body: { id: 37955711395, status, html_url: QUEUED_RUN.url } }
        : { body: { workflow_runs: [] } },
    { watchedRunId: 37955711395 }
  );

  assert.deepEqual(await pipeline.listUnfinishedRuns(), [
    { id: 37955711395, status: 'queued', executingSince: null, url: QUEUED_RUN.url },
  ]);

  status = 'completed';
  assert.deepEqual(await pipeline.listUnfinishedRuns(), []);
});

test('a run already finished when the cancel lands counts as cancelled', async () => {
  const { pipeline, requests } = fakeGitHub(() => ({ status: 409, body: { message: 'Cannot cancel a workflow run that is completed.' } }));

  await pipeline.cancelRun(HUNG_RUN);
  await pipeline.forceCancelRun(HUNG_RUN);

  assert.deepEqual(
    requests.map((request) => `${request.method} ${request.path}`),
    ['POST /actions/runs/37446409980/cancel', 'POST /actions/runs/37446409980/force-cancel']
  );
});

test('a refused cancel is an error that names the request and not the token', async () => {
  const { pipeline } = fakeGitHub(() => ({ status: 403, body: { message: 'Resource not accessible by integration' } }));

  await assert.rejects(
    () => pipeline.cancelRun(HUNG_RUN),
    (error: Error) => {
      assert.equal(error.message, 'POST /actions/runs/37446409980/cancel failed with 403');
      return true;
    }
  );
});

test('a fresh run is dispatched on the deploy branch', async () => {
  const { pipeline, requests } = fakeGitHub(() => ({ status: 204 }));

  await pipeline.startRun();

  assert.deepEqual(
    requests.map(({ method, path, body }) => ({ method, path, body })),
    [{ method: 'POST', path: '/actions/workflows/github-pages.yml/dispatches', body: { ref: 'main' } }]
  );
});

test('an unexpected listing response is an error rather than an empty pipeline', async () => {
  const { pipeline } = fakeGitHub(() => ({ body: { message: 'Not Found' } }));

  await assert.rejects(() => pipeline.listUnfinishedRuns(), /Unexpected response listing requested Pages runs/);
});

test('configuration names what is missing and rejects a malformed repository', () => {
  const env = {
    GITHUB_TOKEN: 'test-token',
    GITHUB_REPOSITORY: 'greenpill-dev-guild/network',
    PAGES_WORKFLOW_FILE: 'github-pages.yml',
    PAGES_DEPLOY_BRANCH: 'main',
  };

  assert.deepEqual(readConfig(env), {
    apiUrl: 'https://api.github.com',
    repository: 'greenpill-dev-guild/network',
    token: 'test-token',
    workflowFile: 'github-pages.yml',
    branch: 'main',
  });
  assert.throws(
    () => readConfig({ GITHUB_REPOSITORY: env.GITHUB_REPOSITORY }),
    /Missing required environment: GITHUB_TOKEN, PAGES_WORKFLOW_FILE, PAGES_DEPLOY_BRANCH/
  );
  assert.throws(() => readConfig({ ...env, GITHUB_REPOSITORY: 'network' }), /must look like owner\/name/);

  // Set by the workflow when a Pages run starts the watcher, empty on a manual start.
  assert.equal(readConfig({ ...env, PAGES_RUN_ID: '37955711395' }).watchedRunId, 37955711395);
  assert.equal(readConfig({ ...env, PAGES_RUN_ID: '' }).watchedRunId, undefined);
  assert.throws(() => readConfig({ ...env, PAGES_RUN_ID: 'latest' }), /must be a workflow run id/);
});

// --- Workflow wiring -----------------------------------------------------------

test('the recovery workflow is wired to the Pages workflow it watches', () => {
  const workflows = new URL('../.github/workflows/', import.meta.url);
  const pages = readFileSync(new URL('github-pages.yml', workflows), 'utf8');
  const recovery = readFileSync(new URL('pages-deploy-recovery.yml', workflows), 'utf8');
  const pagesName = /^name:\s*(.+)$/m.exec(pages)?.[1].trim();
  const groupOf = (workflow: string) => /^\s+group:\s*(\S+)\s*$/m.exec(workflow)?.[1];
  const watchedFile = /^\s+PAGES_WORKFLOW_FILE:\s*(\S+)\s*$/m.exec(recovery)?.[1];

  // `workflow_run` matches on the workflow's name, so a rename there would
  // silently stop every watcher from starting.
  assert.ok(pagesName, 'github-pages.yml has a name');
  assert.ok(recovery.includes(`workflows: ["${pagesName}"]`), `recovery workflow watches "${pagesName}"`);

  // `requested` covers a run queued behind a hung one. GitHub does not send it
  // for a re-run, which only `in_progress` reaches.
  const events = /^\s+types:\s*\[(.+)\]\s*$/m.exec(recovery)?.[1].split(',').map((event) => event.trim());
  assert.deepEqual(events, ['requested', 'in_progress']);

  assert.equal(watchedFile, 'github-pages.yml');
  assert.ok(existsSync(new URL(watchedFile!, workflows)));

  // A watcher in the Pages concurrency group would queue behind the hung run.
  assert.equal(groupOf(pages), 'pages');
  assert.ok(groupOf(recovery), 'recovery workflow declares a concurrency group');
  assert.notEqual(groupOf(recovery), groupOf(pages));
});
