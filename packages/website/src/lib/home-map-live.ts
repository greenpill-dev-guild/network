// Rules for the home map's live layer: how often it asks the agent for
// /map/state, what the Live pill says about how current the stewards and
// members on the map are, and when a failed request becomes an error on the
// map. It has no DOM, so its rules are tested directly
// (scripts/map-node-contract.test.ts); HomeMap.astro keeps the feed and draws
// what these functions return, wherever the pill and the error sit.

export type MapIntakeMode = 'live' | 'moderated';

/** What the map knows about its own /map/state requests. */
export type MapStateFeed = {
  /** When the last successful response arrived, in ms since the epoch; null before the first. */
  lastSuccessAt: number | null;
  /** Requests that failed since the last success. */
  consecutiveFailures: number;
};

/** Poll cadence while live intake is on, so new people appear within seconds. */
export const LIVE_POLL_INTERVAL_MS = 2000;
/** Poll cadence otherwise, so an open page still notices live intake and new approvals. */
export const WATCH_POLL_INTERVAL_MS = 5000;
/** The longest wait between retries while the agent keeps failing. */
export const MAX_RETRY_INTERVAL_MS = 60_000;
/** Each retry lands within this fraction of its delay, so pages that lost the agent together do not return together. */
export const RETRY_JITTER = 0.2;
/** One failed refresh after a load reads as a blip; this many in a row is an error. */
export const STALE_AFTER_FAILURES = 2;

/** The /map/state source that carries approved stewards and members. */
const PEOPLE_SOURCE = 'approved-map-nodes';
const FAILED_SOURCE_STATUSES = new Set(['unavailable', 'not_configured']);

/**
 * Whether a /map/state answer carries the people layer. The agent answers
 * 200 even while its database is down: `counts.sources` then marks
 * `approved-map-nodes` as unavailable (or not configured), there are no
 * people, and intake falls back to moderated. Such an answer is a failed
 * refresh, not an empty map, so the people already drawn stay and the error
 * and backoff carry on. An answer that is not a map state at all fails too;
 * one without source statuses is taken as it comes.
 */
export function mapStateHasPeopleLayer(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  const sources = (state as { counts?: { sources?: unknown } }).counts?.sources;
  if (!Array.isArray(sources)) return true;
  const people = sources.find((source) => source?.source === PEOPLE_SOURCE);
  return !people || !FAILED_SOURCE_STATUSES.has(people.status);
}

export const startMapStateFeed = (): MapStateFeed => ({ lastSuccessAt: null, consecutiveFailures: 0 });

export const recordMapStateSuccess = (at: number): MapStateFeed => ({ lastSuccessAt: at, consecutiveFailures: 0 });

export const recordMapStateFailure = (feed: MapStateFeed): MapStateFeed => ({
  ...feed,
  consecutiveFailures: feed.consecutiveFailures + 1,
});

/**
 * How long to wait before the next request. A healthy feed keeps the mode's
 * cadence. Failures back off from that cadence, doubling each time up to a
 * minute, with jitter; `random` is injectable for tests.
 */
export function nextMapStatePollDelay(
  feed: MapStateFeed,
  intakeMode: MapIntakeMode,
  random: () => number = Math.random
): number {
  const cadence = intakeMode === 'live' ? LIVE_POLL_INTERVAL_MS : WATCH_POLL_INTERVAL_MS;
  if (feed.consecutiveFailures < 1) return cadence;
  const backoff = cadence * 2 ** (feed.consecutiveFailures - 1);
  const jitter = 1 - RETRY_JITTER + 2 * RETRY_JITTER * random();
  return Math.round(Math.min(MAX_RETRY_INTERVAL_MS, backoff * jitter));
}

/** "just now", "4 min ago", "2 hours ago", "1 day ago". */
export function formatUpdatedAgo(ageMs: number): string {
  const minutes = Math.floor(Math.max(0, ageMs) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export type MapStateProblem = {
  /** `unavailable`: no stewards or members have loaded yet. `stale`: the last load is getting old. */
  kind: 'unavailable' | 'stale';
  message: string;
};

export type MapStateStatus = {
  /** The Live pill. `tone` is `live` while live intake is current, `stale` while refreshes fail. */
  pill: { visible: boolean; tone: 'live' | 'stale'; label: string; age: string };
  /** The error on the map, or null. Chapters come with the page, so only the people layer can fail. */
  problem: MapStateProblem | null;
};

export const MAP_STATE_UNAVAILABLE_MESSAGE = "Couldn't load stewards and members.";
export const MAP_STATE_STALE_MESSAGE = "Couldn't refresh stewards and members.";

/**
 * What the pill and the error say for a feed at a moment. A first load that
 * fails is an error at once: the map is missing a layer. After a load, one
 * failed refresh is let go as a blip; from the second, the pill drops its
 * Live claim and shows the age of what is on the map. The pill stays hidden
 * in moderated intake while all is well, as it always has.
 */
export function describeMapStateFeed(feed: MapStateFeed, intakeMode: MapIntakeMode, now: number): MapStateStatus {
  const hidden = { visible: false, tone: 'live' as const, label: 'Live', age: '' };
  if (feed.lastSuccessAt === null) {
    return {
      pill: hidden,
      problem: feed.consecutiveFailures > 0 ? { kind: 'unavailable', message: MAP_STATE_UNAVAILABLE_MESSAGE } : null,
    };
  }
  const age = `Updated ${formatUpdatedAgo(now - feed.lastSuccessAt)}`;
  if (feed.consecutiveFailures >= STALE_AFTER_FAILURES) {
    return {
      pill: { visible: true, tone: 'stale', label: '', age },
      problem: { kind: 'stale', message: MAP_STATE_STALE_MESSAGE },
    };
  }
  if (intakeMode === 'live') {
    return { pill: { visible: true, tone: 'live', label: 'Live', age }, problem: null };
  }
  return { pill: hidden, problem: null };
}

/**
 * What a screen reader hears when the status changes, or '' when nothing it
 * needs to know changed. The pill's age changes every minute and is not
 * announced; going live, an error starting or changing, and recovering are.
 */
export function mapStateAnnouncement(previous: MapStateStatus | null, next: MapStateStatus): string {
  if (next.problem) {
    return next.problem.kind === previous?.problem?.kind ? '' : next.problem.message;
  }
  if (previous?.problem) return 'Stewards and members are up to date.';
  const isLive = next.pill.visible && next.pill.tone === 'live';
  const wasLive = Boolean(previous?.pill.visible && previous.pill.tone === 'live');
  return isLive && !wasLive ? 'The map is live: new stewards and members appear as they join.' : '';
}
