import {
  isValidOwnerEmail,
  normalizeOwnerEmail,
} from './map-nodes.js';

type FetchLike = typeof fetch;
type UnknownRecord = Record<string, any>;

export const NEWSLETTER_SUBSCRIBE_ROUTE = '/newsletter/subscribe';
export const RESEND_CONTACTS_ENDPOINT = 'https://api.resend.com/contacts';
export const RESEND_CONTACTS_USER_AGENT = 'greenpill-network-agent/0.1 newsletter-subscribe';

export type NewsletterSubscribeBody = (
  | { ok: true; status: 'subscribed' }
  | { ok: false; error: 'invalid_email' | 'newsletter_not_configured' | 'newsletter_unavailable' }
);

export interface NewsletterSubscribeResult {
  status: 200 | 400 | 502 | 503;
  body: NewsletterSubscribeBody;
}

export interface NewsletterRepository {
  subscribe(input: unknown): Promise<NewsletterSubscribeResult>;
}

export interface NewsletterRepositoryOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
}

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function getInputEmail(input: unknown): string {
  return normalizeOwnerEmail(
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as UnknownRecord).email
      : undefined
  );
}

function newsletterConfig(env: Record<string, string | undefined>) {
  return {
    apiKey: cleanString(env.RESEND_API_KEY),
    segmentId: cleanString(env.RESEND_NEWSLETTER_SEGMENT_ID),
    topicId: cleanString(env.RESEND_NEWSLETTER_TOPIC_ID),
  };
}

function buildContactPayload(email: string, config: ReturnType<typeof newsletterConfig>): UnknownRecord {
  return {
    email,
    unsubscribed: false,
    properties: {
      source: 'garden',
      signup_path: '/garden',
    },
    ...(config.segmentId ? { segments: [{ id: config.segmentId }] } : {}),
    ...(config.topicId ? { topics: [{ id: config.topicId, subscription: 'opt_in' }] } : {}),
  };
}

function isExistingContactResponse(status: number, payload: unknown): boolean {
  if (status === 409) return true;
  if (!payload || typeof payload !== 'object') return false;
  const serialized = JSON.stringify(payload).toLowerCase();
  return (
    serialized.includes('already exists') ||
    serialized.includes('already_exist') ||
    serialized.includes('contact_exists') ||
    serialized.includes('duplicate')
  );
}

export async function subscribeToNewsletter(
  input: unknown,
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
  }: NewsletterRepositoryOptions = {}
): Promise<NewsletterSubscribeResult> {
  const email = getInputEmail(input);
  if (!isValidOwnerEmail(email)) {
    return {
      status: 400,
      body: { ok: false, error: 'invalid_email' },
    };
  }

  const config = newsletterConfig(env);
  if (!config.apiKey || typeof fetchImpl !== 'function') {
    return {
      status: 503,
      body: { ok: false, error: 'newsletter_not_configured' },
    };
  }

  try {
    const response = await fetchImpl(RESEND_CONTACTS_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        'user-agent': RESEND_CONTACTS_USER_AGENT,
      },
      body: JSON.stringify(buildContactPayload(email, config)),
    });

    let payload: unknown = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (response.ok || isExistingContactResponse(response.status, payload)) {
      return {
        status: 200,
        body: { ok: true, status: 'subscribed' },
      };
    }
  } catch {
    // Fall through to the public-safe unavailable response.
  }

  return {
    status: 502,
    body: { ok: false, error: 'newsletter_unavailable' },
  };
}

export function createNewsletterRepository(options: NewsletterRepositoryOptions = {}): NewsletterRepository {
  return {
    subscribe(input: unknown) {
      return subscribeToNewsletter(input, options);
    },
  };
}
