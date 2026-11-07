/**
 * Which chapters get a public page.
 *
 * A chapter that is no longer running gets no page: its URL returns 404
 * instead of showing a dormant record. Forming chapters keep their pages.
 * Decided by Afo on 2026-11-07 (PRD-625).
 *
 * The rule lives in the loader, not only in the page route, so the chapter
 * index, the home map, the sitemap and related-chapter links can never point
 * at a page that was not built.
 */
const STATUSES_WITHOUT_PAGE: ReadonlySet<string> = new Set(['inactive', 'archived']);

export function hasChapterPage(chapter: { status?: unknown }): boolean {
  const status = typeof chapter.status === 'string' ? chapter.status.trim().toLowerCase() : '';
  return !STATUSES_WITHOUT_PAGE.has(status);
}
