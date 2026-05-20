import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from './directus-steward-smoke.ts';

test('parseArgs keeps Directus steward smoke defaults explicit', () => {
  const options = parseArgs([]);

  assert.equal(options.chapter, 'brasil');
  assert.equal(options.unassignedChapter, 'nigeria');
  assert.equal(options.guild, 'dev-guild');
  assert.equal(options.unassignedGuild, 'writers-guild');
  assert.equal(options.keep, false);
});

test('parseArgs rejects identical assigned and forbidden scopes', () => {
  assert.throws(
    () => parseArgs(['--chapter', 'brasil', '--unassigned-chapter', 'brasil']),
    /must be different/
  );
  assert.throws(
    () => parseArgs(['--guild', 'dev-guild', '--unassigned-guild', 'dev-guild']),
    /must be different/
  );
});
