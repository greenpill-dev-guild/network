// The home map's filter rules: which nodes the type pills and theme chips
// keep, and what each pill says it will do. Afo picked "Narrow, then add"
// (docs/design/map-polish-audit.md § 5): the first press on a type or a
// theme shows only that one, more presses add to it, pressing a picked one
// removes it, and nothing picked shows everything. It has no DOM, so the
// rules are tested directly (scripts/map-node-contract.test.ts); HomeMap.astro
// keeps the picked sets and draws what these functions return.

export type MapNodeType = 'chapter' | 'steward' | 'member';

export const MAP_NODE_TYPES: readonly MapNodeType[] = ['chapter', 'steward', 'member'];

/** Presses a pill: picks it when it was not picked, and removes it when it was. */
export function togglePick<T>(picked: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(picked);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** A node type shows while no type is picked, or when it is picked. */
export const typeIsShown = (picked: ReadonlySet<MapNodeType>, type: MapNodeType): boolean => (
  picked.size === 0 || picked.has(type)
);

/** A theme's threads show while no theme is picked, or when it is picked. */
export const themeIsShown = (picked: ReadonlySet<string>, theme: string): boolean => (
  picked.size === 0 || picked.has(theme)
);

/**
 * A node shows under the picked themes when it carries one of them. A node
 * without themes shows only while no theme is picked, as it did under the
 * all-themes-on rule it replaces.
 */
export const nodeThemesAreShown = (picked: ReadonlySet<string>, nodeThemes: readonly string[]): boolean => (
  picked.size === 0 || nodeThemes.some((theme) => picked.has(theme))
);

/** Where a pill stands among the picks, which decides what pressing it does. */
export type PickState = 'none-picked' | 'others-picked' | 'picked-with-others' | 'only-picked';

export function pickState<T>(picked: ReadonlySet<T>, value: T): PickState {
  if (picked.size === 0) return 'none-picked';
  if (!picked.has(value)) return 'others-picked';
  return picked.size === 1 ? 'only-picked' : 'picked-with-others';
}

const matchCount = (count: number) => `${count} ${count === 1 ? 'matches' : 'match'} current filters`;

/** The "All" theme chip's name, and the name of a theme that is the only one picked. */
export const ALL_THEMES_NAME = 'Show every theme';

/**
 * A type pill's accessible name says what pressing it will do; `aria-pressed`
 * carries the state. The count is how many nodes of that type the theme
 * filters keep. Pressing the only picked type clears the type filter, which
 * shows every node only when no theme narrows the map either.
 */
export function typePillName(options: {
  label: string;
  count: number;
  type: MapNodeType;
  picked: ReadonlySet<MapNodeType>;
  themesNarrow: boolean;
}): string {
  switch (pickState(options.picked, options.type)) {
    case 'none-picked':
      return `Show only ${options.label}; ${matchCount(options.count)}`;
    case 'others-picked':
      return `Add ${options.label}; ${matchCount(options.count)}`;
    case 'picked-with-others':
      return `Remove ${options.label}`;
    case 'only-picked':
      return options.themesNarrow ? 'Show every node type' : 'Show all map nodes';
  }
}

/**
 * A theme chip's accessible name, on the type pills' pattern. The count is
 * how many nodes carrying that theme the type filter keeps.
 */
export function themeChipName(options: {
  label: string;
  count: number;
  theme: string;
  picked: ReadonlySet<string>;
}): string {
  switch (pickState(options.picked, options.theme)) {
    case 'none-picked':
      return `Show only ${options.label}; ${matchCount(options.count)}`;
    case 'others-picked':
      return `Add ${options.label}; ${matchCount(options.count)}`;
    case 'picked-with-others':
      return `Remove ${options.label}`;
    case 'only-picked':
      return ALL_THEMES_NAME;
  }
}

export type ThemeTally = { id: string; count: number };

/**
 * The theme strip's order: picked themes first, then the most used, with
 * the canonical theme order breaking ties. The strip shows as many as fit
 * from the front, so a picked theme is always on it.
 */
export function stripThemeOrder(tallies: readonly ThemeTally[], picked: ReadonlySet<string>): string[] {
  const canonical = new Map(tallies.map((tally, index) => [tally.id, index]));
  return [...tallies]
    .sort((a, b) => (
      Number(picked.has(b.id)) - Number(picked.has(a.id))
      || b.count - a.count
      || (canonical.get(a.id) ?? 0) - (canonical.get(b.id) ?? 0)
    ))
    .map((tally) => tally.id);
}

/**
 * How many of the strip's chips fit, from the front, in `room` px. Each
 * chip takes its width and the gap before it.
 */
export function chipsThatFit(widths: readonly number[], room: number, gap: number): number {
  let used = 0;
  let fit = 0;
  for (const width of widths) {
    const next = used + (fit > 0 ? gap : 0) + width;
    if (next > room) break;
    used = next;
    fit += 1;
  }
  return fit;
}
