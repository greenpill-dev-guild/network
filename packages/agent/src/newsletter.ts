import { createHash } from 'node:crypto';
import {
  NEWSLETTER_SUBSCRIBE_ROUTE,
  isValidNewsletterEmail,
  readNewsletterSubscribeRequest,
  type NewsletterSubscribeResponse,
} from '@greenpill-network/shared/newsletter';

/**
 * The Garden newsletter signup. `POST /newsletter/subscribe` adds an address
 * to the Greenpill publication on Paragraph and keeps nothing: no address is
 * stored or logged, and every answer is one of the shared contract's bodies.
 *
 * Paragraph's API (docs.paragraph.com, "Add a new subscriber"): POST
 * https://public.api.paragraph.com/api/v1/subscribers with
 * `Authorization: Bearer <API key>` and `{"email": "..."}`. The key selects
 * the publication. It answers 200 `{"success": true}`; 400 for a body without
 * a usable email or wallet; 401 for a bad key; 404 when the publication is
 * missing; 500 for its own errors. It does not duplicate an existing
 * subscriber, and its docs do not say what status that case gets.
 */

export { NEWSLETTER_SUBSCRIBE_ROUTE };

export const PARAGRAPH_SUBSCRIBERS_ENDPOINT = 'https://public.api.paragraph.com/api/v1/subscribers';
export const PARAGRAPH_SUBSCRIBE_USER_AGENT = 'greenpill-network-agent/0.1 newsletter-subscribe';
export const PARAGRAPH_REQUEST_TIMEOUT_MS = 10_000;

/** Attempts one client IP may make in a window, counted before any other check. */
export const NEWSLETTER_SUBSCRIBE_RATE_LIMIT = Object.freeze({
  limit: 10,
  windowMs: 10 * 60 * 1000,
});

export type NewsletterHttpStatus = 200 | 400 | 429 | 502 | 503;

export interface NewsletterSubscribeResult {
  status: NewsletterHttpStatus;
  body: NewsletterSubscribeResponse;
  /** Set on a 429, for the `Retry-After` header. */
  retryAfterSeconds?: number;
}

export interface NewsletterSubscribeContext {
  /** The client IP, or `anonymous` when the platform does not supply one. */
  rateLimitKey?: string;
}

export interface NewsletterRepository {
  subscribe(input: unknown, context?: NewsletterSubscribeContext): Promise<NewsletterSubscribeResult>;
}

/** What the agent logs when Paragraph fails: a reason and a status, never an address. */
export interface NewsletterFailureEvent {
  code: 'newsletter_subscribe_failed';
  reason: 'provider_status' | 'provider_unreachable';
  providerStatus?: number;
}

export type NewsletterRateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export interface NewsletterRateLimiter {
  take(key: string, now?: number): NewsletterRateLimitDecision;
}

export interface NewsletterRateLimiterOptions {
  limit?: number;
  windowMs?: number;
  /** Most keys held at once; the oldest window is dropped past it. */
  maxKeys?: number;
  now?: () => number;
}

export interface NewsletterRepositoryOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  rateLimiter?: NewsletterRateLimiter;
  reportFailure?: (event: NewsletterFailureEvent) => void;
  timeoutMs?: number;
}

const SUBSCRIBED: NewsletterSubscribeResult = { status: 200, body: { ok: true, status: 'subscribed' } };
const ALREADY_SUBSCRIBED: NewsletterSubscribeResult = { status: 200, body: { ok: true, status: 'already_subscribed' } };
const INVALID_EMAIL: NewsletterSubscribeResult = { status: 400, body: { ok: false, error: 'invalid_email' } };
const NOT_CONFIGURED: NewsletterSubscribeResult = { status: 503, body: { ok: false, error: 'newsletter_not_configured' } };
const UNAVAILABLE: NewsletterSubscribeResult = { status: 502, body: { ok: false, error: 'newsletter_unavailable' } };

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const copy = (result: NewsletterSubscribeResult): NewsletterSubscribeResult => ({ ...result, body: { ...result.body } });

/**
 * A fixed-window counter per client, held in memory only. Keys are hashed, so
 * the map holds no IP address. Each agent machine counts on its own, which is
 * enough to slow a script down; it is not a global quota.
 */
export function createNewsletterRateLimiter({
  limit = NEWSLETTER_SUBSCRIBE_RATE_LIMIT.limit,
  windowMs = NEWSLETTER_SUBSCRIBE_RATE_LIMIT.windowMs,
  maxKeys = 10_000,
  now: clock = Date.now,
}: NewsletterRateLimiterOptions = {}): NewsletterRateLimiter {
  const windows = new Map<string, { startedAt: number; count: number }>();

  const dropExpired = (now: number) => {
    for (const [key, window] of windows) {
      if (now - window.startedAt >= windowMs) windows.delete(key);
    }
  };

  return {
    take(key: string, now = clock()): NewsletterRateLimitDecision {
      const bucket = createHash('sha256').update(cleanString(key) || 'anonymous').digest('base64url');
      let window = windows.get(bucket);
      if (!window || now - window.startedAt >= windowMs) {
        if (!window && windows.size >= maxKeys) {
          dropExpired(now);
          const oldest = windows.keys().next();
          if (windows.size >= maxKeys && !oldest.done) windows.delete(oldest.value);
        }
        window = { startedAt: now, count: 0 };
        windows.set(bucket, window);
      }

      if (window.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((window.startedAt + windowMs - now) / 1000)),
        };
      }
      window.count += 1;
      return { allowed: true };
    },
  };
}

function defaultReportFailure(event: NewsletterFailureEvent): void {
  console.warn('newsletter_subscribe_failed', event);
}

function report(reportFailure: (event: NewsletterFailureEvent) => void, event: Omit<NewsletterFailureEvent, 'code'>): void {
  try {
    reportFailure({ code: 'newsletter_subscribe_failed', ...event });
  } catch {
    // The public answer must not depend on telemetry.
  }
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Maps Paragraph's answer to a public result. Nothing from its body reaches the client. */
function resultForParagraphResponse(status: number, payload: unknown): NewsletterSubscribeResult {
  if (status >= 200 && status < 300) {
    const declinedInBody = Boolean(payload) && typeof payload === 'object' && (payload as { success?: unknown }).success === false;
    return declinedInBody ? UNAVAILABLE : SUBSCRIBED;
  }
  // Paragraph's docs list no 409, but a conflict can only mean the address is
  // already on the list, which counts as success.
  if (status === 409) return ALREADY_SUBSCRIBED;
  // The only input is an address the agent already checked, so Paragraph
  // refusing the request means Paragraph refused the address.
  if (status === 400 || status === 422) return INVALID_EMAIL;
  return UNAVAILABLE;
}

export async function subscribeToNewsletter(
  input: unknown,
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    rateLimiter,
    rateLimitKey,
    reportFailure = defaultReportFailure,
    timeoutMs = PARAGRAPH_REQUEST_TIMEOUT_MS,
  }: NewsletterRepositoryOptions & NewsletterSubscribeContext = {}
): Promise<NewsletterSubscribeResult> {
  if (rateLimiter) {
    const decision = rateLimiter.take(cleanString(rateLimitKey) || 'anonymous');
    if (!decision.allowed) {
      return {
        status: 429,
        body: { ok: false, error: 'newsletter_rate_limited' },
        retryAfterSeconds: decision.retryAfterSeconds,
      };
    }
  }

  const request = readNewsletterSubscribeRequest(input);
  if (request.trapFilled) return copy(SUBSCRIBED);
  if (!isValidNewsletterEmail(request.email)) return copy(INVALID_EMAIL);

  const apiKey = cleanString(env.PARAGRAPH_API_KEY);
  if (!apiKey || typeof fetchImpl !== 'function') return copy(NOT_CONFIGURED);

  let response: Response;
  try {
    response = await fetchImpl(PARAGRAPH_SUBSCRIBERS_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'user-agent': PARAGRAPH_SUBSCRIBE_USER_AGENT,
      },
      body: JSON.stringify({ email: request.email }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    report(reportFailure, { reason: 'provider_unreachable' });
    return copy(UNAVAILABLE);
  }

  const result = resultForParagraphResponse(response.status, await readJsonBody(response));
  if (!result.body.ok) {
    report(reportFailure, { reason: 'provider_status', providerStatus: response.status });
  }
  return copy(result);
}

export function createNewsletterRepository(options: NewsletterRepositoryOptions = {}): NewsletterRepository {
  const rateLimiter = options.rateLimiter ?? createNewsletterRateLimiter();
  return {
    subscribe(input: unknown, context: NewsletterSubscribeContext = {}) {
      return subscribeToNewsletter(input, { ...options, rateLimiter, rateLimitKey: context.rateLimitKey });
    },
  };
}
