/**
 * Scoring rules for the Garden assessment (`GardenAssessment.astro`). Pure
 * functions, so the component's browser script and the content contract test
 * share one definition.
 */

/** Contribution paths, in tie-break order. */
export const ASSESSMENT_PATHS = ['learn', 'local', 'build', 'story', 'steward'] as const;
export type AssessmentPath = (typeof ASSESSMENT_PATHS)[number];

/** Picks per question id. A single-choice question holds one pick. */
export type AssessmentAnswers = Record<string, AssessmentPath[]>;

export interface AssessmentResult {
  primary: AssessmentPath;
  /** The runner-up when it ties the primary score, shown as "Close second". */
  secondary: AssessmentPath | null;
  /** How many questions pointed to the primary path. */
  score: number;
}

export function isAssessmentPath(value: unknown): value is AssessmentPath {
  return (ASSESSMENT_PATHS as readonly unknown[]).includes(value);
}

/**
 * Every pick gives its path one point. Each question offers one option per
 * path, so a question adds at most one point to any path, and a path's score
 * is the number of questions whose answers pointed to it. The top score wins;
 * equal scores keep ASSESSMENT_PATHS order.
 */
export function scoreAssessment(answers: AssessmentAnswers): AssessmentResult {
  const scores = new Map<AssessmentPath, number>(ASSESSMENT_PATHS.map((path) => [path, 0]));
  for (const picks of Object.values(answers)) {
    for (const path of new Set(picks)) scores.set(path, (scores.get(path) ?? 0) + 1);
  }
  // Array sort is stable, so equal scores keep ASSESSMENT_PATHS order.
  const [primary, runnerUp] = [...ASSESSMENT_PATHS].sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));
  const score = scores.get(primary) ?? 0;
  return { primary, secondary: scores.get(runnerUp) === score ? runnerUp : null, score };
}

/**
 * One question's picks as stored on the device, from either payload shape:
 * version 1 kept one path string per question, version 2 keeps an array of
 * paths. Unknown and repeated values are dropped, and a single-choice
 * question keeps only its first valid pick.
 */
export function storedAssessmentPicks(value: unknown, multiple: boolean): AssessmentPath[] {
  const picks = [...new Set((Array.isArray(value) ? value : [value]).filter(isAssessmentPath))];
  return multiple ? picks : picks.slice(0, 1);
}
