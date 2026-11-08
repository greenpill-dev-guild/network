import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertAltTextCanBeRequired, parseArgs } from './directus-steward-smoke.ts';

test('parseArgs keeps Directus steward smoke defaults explicit', () => {
  const options = parseArgs([]);

  assert.equal(options.chapter, 'brasil');
  assert.equal(options.unassignedChapter, 'nigeria');
  assert.equal(options.guild, 'dev-guild');
  assert.equal(options.unassignedGuild, 'writers-guild');
  assert.equal(options.agentUrl, 'http://localhost:3303');
  assert.equal(options.keep, false);
});

test('parseArgs accepts an explicit production agent URL', () => {
  const options = parseArgs(['--agent-url', 'https://agent.greenpill.network/']);
  assert.equal(options.agentUrl, 'https://agent.greenpill.network');
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

test('the steward smoke accepts nullable alt text fields with no default', async () => {
  await assertAltTextCanBeRequired({
    async request() {
      return { data: { schema: { is_nullable: true, default_value: null } } };
    },
  });
});

test('the steward smoke refuses stale required-field schema metadata', async () => {
  for (const field of ['chapters/image_alt', 'chapter_update_requests/proposed_image_alt']) {
    for (const schema of [
      { is_nullable: false, default_value: null },
      { is_nullable: true, default_value: "''::text" },
    ]) {
      await assert.rejects(() => assertAltTextCanBeRequired({
        async request(path: string) {
          return { data: { schema: path.endsWith(field) ? schema : { is_nullable: true, default_value: null } } };
        },
      }), /Data Studio cannot require it.*Directus system cache/);
    }
  }
});
