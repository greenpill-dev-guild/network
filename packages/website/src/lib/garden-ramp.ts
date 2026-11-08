/**
 * The Garden participation ramp, which the home page and /garden both render
 * from `content/garden.json`.
 *
 * When the content has no steps (the list is missing, or an editor emptied
 * it), both pages leave the ramp out. They neither fail the build nor fall
 * back to a copy of the ramp kept in code: the last such copy drifted from the
 * content and still carried an old Telegram invite and a removed signup form.
 */

const DEFAULT_HERO_CTA = { label: 'Start with Step 1', href: '#step-1' };

/** Paragraph's own signup page for the Greenpill publication. */
export const GARDEN_NEWSLETTER_PARAGRAPH_HREF = 'https://paragraph.com/@greenpill/subscribe';
const DEFAULT_NEWSLETTER_FALLBACK = { label: 'Subscribe on Paragraph', href: GARDEN_NEWSLETTER_PARAGRAPH_HREF };

export interface GardenRampCta {
  label?: string;
  href?: string;
}

export interface GardenRampStep {
  level?: number | null;
  surfaceType?: string;
  cta?: GardenRampCta | null;
}

/**
 * The `content/social-links.json` links that ramp steps use. The Telegram
 * invite and the steward booking link live only there, so a rotated invite or
 * a new booking calendar changes in one place; the footer and the
 * assessment's Steward result read the same fields.
 */
export interface GardenRampLinks {
  telegram: string;
  stewardCall: string;
}

/** The configured ramp steps, or none when `garden.json` has no list. */
export function gardenRampSteps<Step>(steps: readonly Step[] | null | undefined): Step[] {
  return Array.isArray(steps) ? [...steps] : [];
}

/**
 * Where a step's button links. The Telegram step and the steward call step
 * take their link from `links`, whatever URL the step itself carries, wherever
 * an editor moves them; every other step uses its own button URL.
 */
export function gardenStepHref(step: GardenRampStep, links: GardenRampLinks): string {
  if (step.surfaceType === 'telegram') return links.telegram;
  if (step.surfaceType === 'steward-call') return links.stewardCall;
  return step.cta?.href || '';
}

/**
 * The email step shows the newsletter signup form in place of a button,
 * wherever an editor moves it.
 */
export function isGardenSignupStep(step: GardenRampStep): boolean {
  return step.surfaceType === 'email';
}

/**
 * The link the signup form offers when it cannot finish a signup itself (no
 * JavaScript, the agent unreachable or not configured): the email step's own
 * button, or Paragraph's signup page when the step has none.
 */
export function gardenSignupFallback(step: GardenRampStep): { label: string; href: string } {
  const href = step.cta?.href?.trim();
  if (!href) return { ...DEFAULT_NEWSLETTER_FALLBACK };
  return { label: step.cta?.label?.trim() || DEFAULT_NEWSLETTER_FALLBACK.label, href };
}

/**
 * The Garden hero button: the content's call to action, or "Start with
 * Step 1". A button that points at a step anchor (`#step-…`) is left out when
 * the ramp has no steps, because that anchor would not exist.
 */
export function gardenHeroCta(
  cta: GardenRampCta | null | undefined,
  stepCount: number,
): { label: string; href: string } | null {
  const chosen = cta?.label
    ? { label: cta.label, href: cta.href || DEFAULT_HERO_CTA.href }
    : { ...DEFAULT_HERO_CTA };
  return stepCount === 0 && chosen.href.startsWith('#step-') ? null : chosen;
}
