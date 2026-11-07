const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats an operational content date ("YYYY", "YYYY-MM" or "YYYY-MM-DD") as
 * words for display: "2026", "Mar 2026", "Mar 5, 2026". A part that is not on
 * the calendar (month 13, February 31) is dropped, so a bad value reads
 * coarser, never wrong. Any other value, including a non-string, returns "".
 */
export function formatContentDate(value: unknown): string {
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(typeof value === 'string' ? value.trim() : '');
  if (!match) return '';
  const [, year, month, day] = match;
  const monthIndex = month ? Number(month) - 1 : -1;
  const monthName = MONTHS[monthIndex];
  if (!monthName) return year;
  const daysInMonth = new Date(Date.UTC(Number(year), monthIndex + 1, 0)).getUTCDate();
  const dayNumber = day ? Number(day) : 0;
  return dayNumber >= 1 && dayNumber <= daysInMonth ? `${monthName} ${dayNumber}, ${year}` : `${monthName} ${year}`;
}
