// The home map's list: which visible nodes a search keeps, how they group,
// and what the list announces (docs/design/map-polish-audit.md § 5: "a
// search field labelled 'Search the map' with the placeholder 'Name or
// place'. Search matches names and places, and one polite live region
// announces the count once typing pauses ... grouped by type with counts").
// It has no DOM, so the rules are tested directly
// (scripts/map-node-contract.test.ts); HomeMap.astro draws the rows.

import { MAP_NODE_TYPES, type MapNodeType } from './home-map-filters.js';

export type ListEntry = { type: MapNodeType; name: string; place: string };

/** Lower case without accents, so "cote" finds "Côte d'Ivoire". */
const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** The words of a search, folded. An empty search has none. */
export function searchWords(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}

/** A node matches when every word of the search is in its name or its place. */
export function entryMatchesSearch(entry: Pick<ListEntry, 'name' | 'place'>, words: readonly string[]): boolean {
  if (!words.length) return true;
  const haystack = fold(`${entry.name} ${entry.place}`);
  return words.every((word) => haystack.includes(word));
}

export type ListGroup<T extends ListEntry> = { type: MapNodeType; entries: T[] };

/**
 * The list's groups in the legend's order (chapters, stewards, members),
 * each sorted by name, leaving out empty groups.
 */
export function groupListEntries<T extends ListEntry>(entries: readonly T[]): ListGroup<T>[] {
  return MAP_NODE_TYPES
    .map((type) => ({
      type,
      entries: entries
        .filter((entry) => entry.type === type)
        .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })),
    }))
    .filter((group) => group.entries.length > 0);
}

/**
 * The row that keeps keyboard focus when the rows are rebuilt (a filter, a
 * live update): the same node's row while it is still listed, otherwise the
 * first row after it that remains. Null when nothing after it remains, and
 * the list's first control takes focus instead.
 */
export function rowToFocusAfterRebuild(
  previousIds: readonly string[],
  focusedId: string,
  nextIds: readonly string[]
): string | null {
  if (!focusedId) return null;
  const remaining = new Set(nextIds);
  if (remaining.has(focusedId)) return focusedId;
  const from = previousIds.indexOf(focusedId);
  if (from === -1) return null;
  return previousIds.slice(from + 1).find((id) => remaining.has(id)) ?? null;
}

const nodesWord = (count: number) => (count === 1 ? 'node' : 'nodes');

/** What the list's live region says once typing pauses. */
export function listSearchAnnouncement(matches: number, total: number, query: string): string {
  const shown = query.trim();
  if (!shown) return `${total} ${nodesWord(total)} in the list.`;
  if (matches === 0) return `No nodes match "${shown}".`;
  return `${matches} of ${total} ${nodesWord(total)} ${matches === 1 ? 'matches' : 'match'} "${shown}".`;
}
