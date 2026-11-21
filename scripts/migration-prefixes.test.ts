import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const migrationsDir = resolve(new URL('..', import.meta.url).pathname, 'packages/agent/migrations');

// Production applied both 018 migrations before this check existed. Renaming
// either would make db:migrate apply it a second time, so they stay.
const KNOWN_DUPLICATE_PREFIXES = new Map([['018', ['018_chapter_editor_assignment_single_chapter.sql', '018_map_location_integrity.sql']]]);

export function duplicatePrefixes(files: string[]) {
  const byPrefix = new Map<string, string[]>();
  for (const file of files) {
    const prefix = file.match(/^(\d+)_/)?.[1];
    assert.ok(prefix, `${file} must start with a numeric prefix and an underscore`);
    byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), file]);
  }
  return [...byPrefix].filter(([, group]) => group.length > 1).map(([prefix, group]) => [prefix, group.sort()] as const);
}

test('no new migration reuses a prefix', () => {
  const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'));
  const unexpected = duplicatePrefixes(files).filter(([prefix, group]) => JSON.stringify(KNOWN_DUPLICATE_PREFIXES.get(prefix)) !== JSON.stringify(group));
  assert.deepEqual(unexpected, []);
});

test('a second migration with an existing prefix is refused', () => {
  const found = duplicatePrefixes(['034_a.sql', '035_b.sql', '035_c.sql']);
  assert.deepEqual(found, [['035', ['035_b.sql', '035_c.sql']]]);
});
