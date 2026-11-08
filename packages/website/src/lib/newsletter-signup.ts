/**
 * The newsletter signup form's view rules (components/page-sections/
 * NewsletterSignup.astro): where it posts, and what each answer from the
 * agent looks like on the page. The agent's answers are the shared contract in
 * `@greenpill-network/shared/newsletter`.
 */

import {
  NEWSLETTER_SUBSCRIBE_ROUTE,
  type NewsletterSubscribeResponse,
} from '@greenpill-network/shared/newsletter';

export const NEWSLETTER_AGENT_ORIGIN = 'https://agent.greenpill.network';
export const NEWSLETTER_LOCAL_AGENT_ORIGIN = 'http://127.0.0.1:3303';

/** How long the form waits for the agent before offering the Paragraph link. */
export const NEWSLETTER_CLIENT_TIMEOUT_MS = 15_000;

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

/** The agent's signup URL: the local agent in development, the live one elsewhere. */
export function newsletterSubscribeUrl(hostname: string): string {
  const origin = LOCAL_HOSTNAMES.has(hostname) ? NEWSLETTER_LOCAL_AGENT_ORIGIN : NEWSLETTER_AGENT_ORIGIN;
  return `${origin}${NEWSLETTER_SUBSCRIBE_ROUTE}`;
}

/** Problems the form finds before or instead of an answer from the agent. */
export type NewsletterSignupProblem = 'empty_email' | 'network_error';

export type NewsletterSignupView =
  | { state: 'done'; title: string; body: string }
  | {
    state: 'error';
    message: string;
    /** The address itself is the problem: mark the field and return focus to it. */
    fieldError: boolean;
    /** Show the "Subscribe on Paragraph" link, because this page cannot finish the signup now. */
    offerParagraph: boolean;
  };

const fieldError = (message: string): NewsletterSignupView => ({
  state: 'error',
  message,
  fieldError: true,
  offerParagraph: false,
});

const paragraphFallback = (message: string): NewsletterSignupView => ({
  state: 'error',
  message,
  fieldError: false,
  offerParagraph: true,
});

export function newsletterSignupView(
  outcome: NewsletterSubscribeResponse | NewsletterSignupProblem,
): NewsletterSignupView {
  if (outcome === 'empty_email') return fieldError('Enter your email address to subscribe.');
  if (outcome === 'network_error') {
    return paragraphFallback("We couldn't connect just now. Check your connection and try again.");
  }
  if ('status' in outcome) {
    return outcome.status === 'already_subscribed'
      ? { state: 'done', title: "You're already subscribed.", body: 'That address is already on the list, so new posts keep coming.' }
      : { state: 'done', title: "You're subscribed.", body: 'New Greenpill posts will arrive in your inbox.' };
  }
  switch (outcome.error) {
    case 'invalid_email':
      return fieldError('Enter a valid email address, like name@example.org.');
    case 'newsletter_rate_limited':
      return paragraphFallback('Too many signups came from your network just now. Try again in a few minutes.');
    case 'newsletter_not_configured':
      return paragraphFallback("Signing up on this page isn't available yet.");
    default:
      return paragraphFallback("The newsletter couldn't be reached just now. Try again in a moment.");
  }
}
