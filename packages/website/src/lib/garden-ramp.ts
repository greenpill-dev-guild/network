/**
 * The Garden participation ramp, which the home page and /garden both render
 * from `content/garden.json`.
 *
 * When the content has no steps (the list is missing, or an editor emptied
 * it), both pages leave the ramp out. They neither fail the build nor fall
 * back to a copy of the ramp kept in code: the last such copy drifted from the
 * content and still carried an old Telegram invite and a removed signup form.
 */

/** Booking link for a steward call when step 4 of the ramp has none. */
export const DEFAULT_STEWARD_CALL_HREF = 'https://calendar.app.google/gia7UpaSVKwwEKxy5';

const DEFAULT_HERO_CTA = { label: 'Start with Step 1', href: '#step-1' };

export interface GardenRampCta {
  label?: string;
  href?: string;
}

export interface GardenRampStep {
  level?: number | null;
  surfaceType?: string;
  cta?: GardenRampCta | null;
}

/** The configured ramp steps, or none when `garden.json` has no list. */
export function gardenRampSteps<Step>(steps: readonly Step[] | null | undefined): Step[] {
  return Array.isArray(steps) ? [...steps] : [];
}

/**
 * Where a step's button links. The Telegram invite lives only in
 * `content/social-links.json`, so the Telegram step takes it from there and a
 * rotated invite changes in one place.
 */
export function gardenStepHref(step: GardenRampStep, telegramHref: string): string {
  return step.surfaceType === 'telegram' ? telegramHref : step.cta?.href || '';
}

/**
 * The steward call link: the button of the step whose surface is the steward
 * call, wherever an editor moves it; failing that, step 4's button; failing
 * that, the default booking calendar.
 */
export function gardenStewardCallHref(steps: readonly GardenRampStep[]): string {
  const step = steps.find((candidate) => candidate.surfaceType === 'steward-call')
    ?? steps.find((candidate) => (candidate.level ?? 0) === 4);
  return step?.cta?.href || DEFAULT_STEWARD_CALL_HREF;
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
