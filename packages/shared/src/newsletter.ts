/**
 * The public newsletter signup contract.
 *
 * greenpill.network sends an email address to the agent's
 * `POST /newsletter/subscribe`, and the agent adds it to the Greenpill
 * publication on Paragraph. The agent keeps nothing, and no answer ever
 * carries the address back: a response is exactly one of the shapes below.
 */

type UnknownRecord = Record<string, unknown>;

export const NEWSLETTER_SUBSCRIBE_ROUTE = '/newsletter/subscribe';

/** Paragraph's limit for a subscriber email (`maxLength` in its API spec). */
export const NEWSLETTER_EMAIL_MAX_LENGTH = 254;

/**
 * The honeypot field. The form renders it off-screen and hidden from
 * assistive technology, so people leave it empty. A request that fills it
 * gets the same answer as a real signup, and nothing reaches Paragraph.
 */
export const NEWSLETTER_TRAP_FIELD = 'website';

export const NEWSLETTER_SUBSCRIBE_STATUSES = ['subscribed', 'already_subscribed'] as const;

export const NEWSLETTER_SUBSCRIBE_ERRORS = [
  'invalid_email',
  'newsletter_rate_limited',
  'newsletter_not_configured',
  'newsletter_unavailable',
] as const;

export type NewsletterSubscribeStatus = (typeof NEWSLETTER_SUBSCRIBE_STATUSES)[number];
export type NewsletterSubscribeError = (typeof NEWSLETTER_SUBSCRIBE_ERRORS)[number];

export type NewsletterSubscribeResponse =
  | { ok: true; status: NewsletterSubscribeStatus }
  | { ok: false; error: NewsletterSubscribeError };

/** What the signup form sends. */
export interface NewsletterSubscribeRequest {
  email: string;
  website?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function normalizeNewsletterEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidNewsletterEmail(value: unknown): boolean {
  const email = normalizeNewsletterEmail(value);
  return email.length <= NEWSLETTER_EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email);
}

/**
 * Reads a signup request body. A body that is not an object reads as an
 * empty email. The honeypot is empty when it is missing, null or a blank
 * string; any other value counts as filled, whatever its type.
 */
export function readNewsletterSubscribeRequest(input: unknown): { email: string; trapFilled: boolean } {
  const record = isRecord(input) ? input : {};
  const trap = record[NEWSLETTER_TRAP_FIELD];
  const trapFilled = typeof trap === 'string' ? trap.trim() !== '' : trap !== undefined && trap !== null;
  return { email: normalizeNewsletterEmail(record.email), trapFilled };
}

/** True only for an exact contract body: the right keys, nothing more. */
export function isNewsletterSubscribeResponse(payload: unknown): payload is NewsletterSubscribeResponse {
  if (!isRecord(payload)) return false;
  const keys = Object.keys(payload).sort().join(',');
  if (payload.ok === true) {
    return keys === 'ok,status' && (NEWSLETTER_SUBSCRIBE_STATUSES as readonly unknown[]).includes(payload.status);
  }
  if (payload.ok === false) {
    return keys === 'error,ok' && (NEWSLETTER_SUBSCRIBE_ERRORS as readonly unknown[]).includes(payload.error);
  }
  return false;
}

/** The agent's guard: the route answers only with an exact contract body. */
export function assertPublicNewsletterSubscribeResponse(payload: unknown): NewsletterSubscribeResponse {
  if (!isNewsletterSubscribeResponse(payload)) {
    throw new Error('Public newsletter response does not match the signup contract');
  }
  return payload;
}

/**
 * The website's reader. An answer that is missing or does not match the
 * contract reads as `newsletter_unavailable`, so the form offers the
 * Paragraph link instead of guessing.
 */
export function readNewsletterSubscribeResponse(payload: unknown): NewsletterSubscribeResponse {
  if (!isNewsletterSubscribeResponse(payload)) return { ok: false, error: 'newsletter_unavailable' };
  return payload.ok
    ? { ok: true, status: payload.status }
    : { ok: false, error: payload.error };
}
