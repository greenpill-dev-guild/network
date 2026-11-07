// Display helpers shared by the story index and story pages. Files that start
// with an underscore are not routes, so this module only serves the two pages.

// Labels match the category options editors pick from in keystatic.config.ts.
const CATEGORY_LABELS: Record<string, string> = {
  chapter: 'Chapter update',
  guild: 'Guild update',
  program: 'Program update',
  essay: 'Essay',
  'field-report': 'Field report',
};

const REGION_LABELS: Record<string, string> = {
  global: 'Global',
  americas: 'Americas',
  africa: 'Africa',
  asia: 'Asia',
  europe: 'Europe',
  oceania: 'Oceania',
};

const WORDS_PER_MINUTE = 200;

const dayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const monthFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function storyCategoryLabel(category?: string) {
  return CATEGORY_LABELS[category ?? ''] ?? 'Story';
}

export function storyRegionLabel(region?: string) {
  return REGION_LABELS[region ?? ''] ?? 'Global';
}

/**
 * Formats an authored YYYY, YYYY-MM or YYYY-MM-DD date for readers
 * ("2026", "Mar 2026", "Mar 14, 2026"). Any other text is shown as written.
 */
export function formatStoryDate(value?: string) {
  const text = (value ?? '').trim();
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(text);
  if (!match) return text;

  const [, year, month, day] = match;
  if (!month) return year;

  const y = Number(year);
  const m = Number(month);
  const d = Number(day ?? 1);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Date.UTC rolls impossible parts over (2026-13 would become Jan 2027), so a
  // date that does not survive the round trip is shown exactly as written.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return text;
  return day ? dayFormat.format(date) : monthFormat.format(date);
}

/** Reading time estimated from the story body, used when the editor leaves Read Time empty. */
export function storyReadTime(body?: string) {
  const words = (body ?? '').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}

/** Meta row for story cards and headers: category, region and date. */
export function storyMetaItems(data: { category?: string; region?: string; publishDate?: string }) {
  return [storyCategoryLabel(data.category), storyRegionLabel(data.region), formatStoryDate(data.publishDate)].filter(
    Boolean,
  );
}
