#!/usr/bin/env bun

import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// A GitHub Pages run can hang after a successful build. On 2026-10-06 the
// deploy job sat in `waiting` on the `github-pages` environment for three and a
// half days, although that environment has no reviewers or wait timer to wait
// for. A run on 2026-09-30 stalled at the same point for four. The hung run
// keeps the workflow's `pages` concurrency group, so every later run queues
// behind it and is cancelled by the next one. The public site stops updating
// and no run ever fails.
//
// GitHub has no timeout for that state: `timeout-minutes` only counts a job
// that is running. This watcher is that timeout. It is started for every Pages
// run and re-run by .github/workflows/pages-deploy-recovery.yml, cancels a run
// that has held the pipeline too long, and makes sure a run follows it.
//
// Keep this file self-contained. The workflow checks out `scripts/` only.
//
// Read-only look at what the watcher sees right now:
//   GITHUB_TOKEN=$(gh auth token) GITHUB_REPOSITORY=greenpill-dev-guild/network \
//   PAGES_WORKFLOW_FILE=github-pages.yml PAGES_DEPLOY_BRANCH=main \
//   bun --no-env-file scripts/pages-deploy-recovery.ts --dry-run

/**
 * How long a run may hold the pipeline before it counts as hung. The slowest
 * healthy run in the 100 before this was written took 2.9 minutes, and
 * `actions/deploy-pages` gives up on its own after 10.
 *
 * A deploy waiting on required reviewers or a wait timer is indistinguishable
 * from a hang. If the `github-pages` environment ever gains either, raise this
 * above the longest wait you intend to allow.
 */
export const HUNG_AFTER_MS = 30 * 60_000;

/** Statuses in which a run occupies the workflow's concurrency group. */
const HOLDING_STATUSES = new Set(['in_progress', 'waiting']);

/** Every status GitHub reports for a run that has not finished. */
const UNFINISHED_STATUSES = ['requested', 'queued', 'pending', 'in_progress', 'waiting'];

export interface PagesRun {
  id: number;
  status: string;
  /**
   * When the first job of the run's current attempt started, or null before any
   * has. The run's own `run_started_at` cannot be used: it includes the time
   * spent queued behind another run, so the run a recovery releases would
   * itself look hung.
   */
  executingSince: string | null;
  url: string;
}

export interface PagesPipeline {
  listUnfinishedRuns(): Promise<PagesRun[]>;
  cancelRun(run: PagesRun): Promise<void>;
  forceCancelRun(run: PagesRun): Promise<void>;
  startRun(): Promise<void>;
}

export interface PagesPipelineWatch {
  cancelled: PagesRun[];
  /** True when nothing was queued behind a hung run, so a fresh run was started. */
  startedReplacement: boolean;
}

export interface WatchOptions {
  hungAfterMs: number;
  pollIntervalMs: number;
  forceCancelAfterMs: number;
  replacementAppearsWithinMs: number;
  giveUpAfterMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
}

const DEFAULT_WATCH_OPTIONS: WatchOptions = {
  hungAfterMs: HUNG_AFTER_MS,
  pollIntervalMs: 30_000,
  forceCancelAfterMs: 2 * 60_000,
  replacementAppearsWithinMs: 3 * 60_000,
  // One hang, its cancellation, and the run that follows fit well inside this.
  giveUpAfterMs: HUNG_AFTER_MS + 20 * 60_000,
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log: (message) => console.log(message),
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const minutes = (ms: number): string => `${Math.round(ms / 60_000)} minutes`;

/** Runs that hold the pipeline and started executing more than `hungAfterMs` ago. */
export function findHungRuns(runs: PagesRun[], nowMs: number, hungAfterMs: number = HUNG_AFTER_MS): PagesRun[] {
  return runs.filter((run) => {
    if (!HOLDING_STATUSES.has(run.status) || !run.executingSince) return false;
    const executingSinceMs = Date.parse(run.executingSince);
    // A run that cannot be dated is left alone rather than cancelled on a guess.
    return Number.isFinite(executingSinceMs) && nowMs - executingSinceMs > hungAfterMs;
  });
}

/**
 * When the run's current attempt began executing: the earliest start among the
 * jobs that started in it. `attemptStartedAt` is the run's `run_started_at`,
 * which resets on a re-run. A re-run of only the failed jobs can still carry
 * the jobs it kept from the earlier attempt, with their original start times,
 * and dating the re-run by one of those would cancel it on arrival.
 */
export function earliestJobStart(
  jobs: Array<{ started_at?: string | null }>,
  attemptStartedAt: string
): string | null {
  const attemptStartedAtMs = Date.parse(attemptStartedAt);
  // Without the attempt's start there is no telling which jobs belong to it.
  if (!Number.isFinite(attemptStartedAtMs)) return null;
  let earliestMs = Number.POSITIVE_INFINITY;
  for (const job of jobs) {
    const startedAtMs = Date.parse(job?.started_at ?? '');
    if (Number.isFinite(startedAtMs) && startedAtMs >= attemptStartedAtMs && startedAtMs < earliestMs) {
      earliestMs = startedAtMs;
    }
  }
  return Number.isFinite(earliestMs) ? new Date(earliestMs).toISOString() : null;
}

/**
 * Watches the Pages pipeline until it is idle, cancelling any run that hangs on
 * the way. Resolves once nothing is unfinished and a run has followed every
 * cancelled one. Rejects when it cannot get there, which needs a person.
 */
export async function watchPagesPipeline(
  pipeline: PagesPipeline,
  overrides: Partial<WatchOptions> = {}
): Promise<PagesPipelineWatch> {
  const options = { ...DEFAULT_WATCH_OPTIONS, ...overrides };
  const { now, sleep, log } = options;
  const watchStartedAtMs = now();
  const cancelRequestedAtMs = new Map<number, number>();
  const forceCancelled = new Set<number>();
  const cancelled: PagesRun[] = [];
  // Whether a run we did not cancel has been unfinished since the last cancel.
  let runFollowedLastCancel = false;
  let startedReplacement = false;
  let awaitingReplacementSinceMs: number | null = null;

  for (;;) {
    const nowMs = now();
    const unfinished = await pipeline.listUnfinishedRuns().catch((error) => {
      log(`Could not read the Pages runs, will retry: ${errorMessage(error)}`);
      return null;
    });

    if (unfinished) {
      for (const run of findHungRuns(unfinished, nowMs, options.hungAfterMs)) {
        const requestedAtMs = cancelRequestedAtMs.get(run.id);
        try {
          if (requestedAtMs === undefined) {
            log(
              `Run ${run.id} has held the Pages pipeline since ${run.executingSince} ` +
              `(status ${run.status}). Cancelling it: ${run.url}`
            );
            await pipeline.cancelRun(run);
            cancelRequestedAtMs.set(run.id, nowMs);
            cancelled.push(run);
            runFollowedLastCancel = false;
            awaitingReplacementSinceMs = null;
          } else if (!forceCancelled.has(run.id) && nowMs - requestedAtMs >= options.forceCancelAfterMs) {
            log(`Run ${run.id} ignored the cancel request. Force-cancelling it.`);
            await pipeline.forceCancelRun(run);
            forceCancelled.add(run.id);
          }
        } catch (error) {
          log(`Could not cancel run ${run.id}, will retry: ${errorMessage(error)}`);
        }
      }

      if (cancelled.length > 0 && unfinished.some((run) => !cancelRequestedAtMs.has(run.id))) {
        runFollowedLastCancel = true;
      }

      if (unfinished.length === 0) {
        if (cancelled.length === 0 || runFollowedLastCancel) {
          return { cancelled, startedReplacement };
        }
        if (awaitingReplacementSinceMs === null) {
          log('Nothing was queued behind the hung run, so its build never deployed. Starting a fresh run.');
          try {
            await pipeline.startRun();
            startedReplacement = true;
            awaitingReplacementSinceMs = nowMs;
          } catch (error) {
            log(`Could not start a fresh Pages run, will retry: ${errorMessage(error)}`);
          }
        } else if (nowMs - awaitingReplacementSinceMs >= options.replacementAppearsWithinMs) {
          throw new Error(
            `The fresh Pages run did not appear within ${minutes(options.replacementAppearsWithinMs)} of being started.`
          );
        }
      }
    }

    if (now() - watchStartedAtMs >= options.giveUpAfterMs) {
      throw new Error(
        `The Pages pipeline was still not idle after ${minutes(options.giveUpAfterMs)}` +
        (cancelled.length > 0 ? `, having cancelled run ${cancelled.map((run) => run.id).join(', ')}.` : '.')
      );
    }
    await sleep(options.pollIntervalMs);
  }
}

export interface GitHubPagesPipelineConfig {
  apiUrl: string;
  repository: string;
  token: string;
  workflowFile: string;
  branch: string;
  /**
   * The run this watcher was started for. It stays in the unfinished list until
   * it completes, so a run listing that lags behind the trigger cannot make the
   * watcher call the pipeline idle and leave before its own run has appeared.
   */
  watchedRunId?: number;
  fetch?: typeof fetch;
}

export function createGitHubPagesPipeline(config: GitHubPagesPipelineConfig): PagesPipeline {
  const fetchImpl = config.fetch ?? fetch;
  const repoUrl = `${config.apiUrl.replace(/\/+$/, '')}/repos/${config.repository}`;
  const workflowUrl = `/actions/workflows/${encodeURIComponent(config.workflowFile)}`;

  async function request(
    method: string,
    path: string,
    { body, alsoAccept = [] }: { body?: unknown; alsoAccept?: number[] } = {}
  ) {
    const response = await fetchImpl(`${repoUrl}${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${config.token}`,
        'x-github-api-version': '2022-11-28',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok && !alsoAccept.includes(response.status)) {
      throw new Error(`${method} ${path} failed with ${response.status}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  // 409 means the run finished before the request landed, which is the goal.
  const cancelWith = (action: 'cancel' | 'force-cancel') => async (run: PagesRun) => {
    await request('POST', `/actions/runs/${run.id}/${action}`, { alsoAccept: [409] });
  };

  type ApiRun = { id: number; status?: unknown; html_url?: unknown; run_started_at?: unknown; created_at?: unknown };

  return {
    async listUnfinishedRuns() {
      const unfinished = new Map<number, ApiRun>();
      // The API filters on one status per request. Asking for each unfinished
      // status finds a hung run however many cancelled runs have piled up since.
      for (const status of UNFINISHED_STATUSES) {
        const page = await request('GET', `${workflowUrl}/runs?status=${status}&per_page=100`);
        if (!Array.isArray(page?.workflow_runs)) {
          throw new Error(`Unexpected response listing ${status} Pages runs`);
        }
        for (const run of page.workflow_runs) {
          if (typeof run?.id !== 'number' || run.status === 'completed') continue;
          unfinished.set(run.id, run);
        }
      }
      if (config.watchedRunId !== undefined && !unfinished.has(config.watchedRunId)) {
        const run = await request('GET', `/actions/runs/${config.watchedRunId}`);
        if (typeof run?.id !== 'number') throw new Error(`Unexpected response reading Pages run ${config.watchedRunId}`);
        if (run.status !== 'completed') unfinished.set(run.id, run);
      }
      const runs: PagesRun[] = [];
      for (const run of unfinished.values()) {
        const status = String(run.status ?? '');
        let executingSince: string | null = null;
        if (HOLDING_STATUSES.has(status)) {
          const page = await request('GET', `/actions/runs/${run.id}/jobs?per_page=100`);
          executingSince = earliestJobStart(
            Array.isArray(page?.jobs) ? page.jobs : [],
            String(run.run_started_at ?? run.created_at ?? '')
          );
        }
        runs.push({ id: run.id, status, executingSince, url: String(run.html_url ?? '') });
      }
      return runs;
    },
    cancelRun: cancelWith('cancel'),
    forceCancelRun: cancelWith('force-cancel'),
    async startRun() {
      await request('POST', `${workflowUrl}/dispatches`, { body: { ref: config.branch } });
    },
  };
}

export function readConfig(env: Record<string, string | undefined> = process.env): GitHubPagesPipelineConfig {
  const read = (name: string) => (env[name] ?? '').trim();
  const required = ['GITHUB_TOKEN', 'GITHUB_REPOSITORY', 'PAGES_WORKFLOW_FILE', 'PAGES_DEPLOY_BRANCH'];
  const missing = required.filter((name) => !read(name));
  if (missing.length > 0) throw new Error(`Missing required environment: ${missing.join(', ')}`);
  if (!/^[^/\s]+\/[^/\s]+$/.test(read('GITHUB_REPOSITORY'))) {
    throw new Error('GITHUB_REPOSITORY must look like owner/name');
  }
  // Empty when the watcher is started by hand rather than by a Pages run.
  const watchedRunId = read('PAGES_RUN_ID');
  if (watchedRunId && !/^[1-9]\d*$/.test(watchedRunId)) {
    throw new Error('PAGES_RUN_ID must be a workflow run id');
  }
  return {
    apiUrl: read('GITHUB_API_URL') || 'https://api.github.com',
    repository: read('GITHUB_REPOSITORY'),
    token: read('GITHUB_TOKEN'),
    workflowFile: read('PAGES_WORKFLOW_FILE'),
    branch: read('PAGES_DEPLOY_BRANCH'),
    ...(watchedRunId ? { watchedRunId: Number(watchedRunId) } : {}),
  };
}

async function reportRecovery(watch: PagesPipelineWatch) {
  const cancelledList = watch.cancelled.map((run) => `[${run.id}](${run.url})`).join(', ');
  const followUp = watch.startedReplacement
    ? 'Nothing was queued behind it, so a fresh run was started and has finished.'
    : 'The run queued behind it has finished.';
  // Shown as an annotation on the watcher run, so a recovery is visible without reading the log.
  console.log(`::warning title=Hung Pages deploy cancelled::Cancelled run ${watch.cancelled.map((run) => run.id).join(', ')}. ${followUp}`);
  const summaryFile = (process.env.GITHUB_STEP_SUMMARY ?? '').trim();
  if (summaryFile) {
    await appendFile(
      summaryFile,
      `### Hung Pages deploy recovered\n\nCancelled ${cancelledList} after it held the pipeline for more than ` +
      `${minutes(HUNG_AFTER_MS)}. ${followUp}\n`
    );
  }
}

async function main() {
  const pipeline = createGitHubPagesPipeline(readConfig());

  if (process.argv.includes('--dry-run')) {
    const unfinished = await pipeline.listUnfinishedRuns();
    const hung = new Set(findHungRuns(unfinished, Date.now()).map((run) => run.id));
    if (unfinished.length === 0) console.log('The Pages pipeline is idle.');
    for (const run of unfinished) {
      console.log(
        `${hung.has(run.id) ? 'HUNG, would cancel' : 'ok'}  run ${run.id}  ${run.status}  ` +
        `executing since ${run.executingSince ?? 'not started'}  ${run.url}`
      );
    }
    return;
  }

  const watch = await watchPagesPipeline(pipeline);
  if (watch.cancelled.length === 0) {
    console.log('The Pages pipeline is idle. Nothing needed recovering.');
    return;
  }
  await reportRecovery(watch);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.log(`::error title=Pages deploy recovery failed::${errorMessage(error)}`);
    process.exit(1);
  });
}
