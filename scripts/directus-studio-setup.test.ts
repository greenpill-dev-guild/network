import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDirectusStudioMetadataPlan } from './directus-studio-setup.ts';

test('Directus Studio metadata plan hides assignment collections and labels content collections', () => {
  const plan = buildDirectusStudioMetadataPlan(
    ['chapters', 'chapter_initiatives', 'guilds', 'projects'],
    ['chapter_editor_assignments', 'guild_editor_assignments']
  );

  const chapters = plan.collections.find((collection) => collection.collection === 'chapters');
  const assignments = plan.collections.find((collection) => collection.collection === 'chapter_editor_assignments');
  const chapterSummary = plan.fields.find((field) => field.collection === 'chapters' && field.field === 'summary');
  const initiativeChapter = plan.fields.find((field) => (
    field.collection === 'chapter_initiatives' &&
    field.field === 'chapter_slug'
  ));
  const projectGuild = plan.fields.find((field) => field.collection === 'projects' && field.field === 'guild_slug');
  const rawData = plan.fields.find((field) => field.collection === 'chapters' && field.field === 'data');

  assert.equal(chapters?.meta.icon, 'location_city');
  assert.equal(chapters?.meta.display_template, '{{ name }}');
  assert.equal(chapters?.meta.archive_field, 'publication_status');
  assert.equal(assignments?.meta.hidden, true);
  assert.equal((chapterSummary?.meta as any).interface, 'input-multiline');
  assert.equal((initiativeChapter?.meta as any).interface, 'select-dropdown-m2o');
  assert.deepEqual((initiativeChapter?.meta as any).special, ['m2o']);
  assert.equal((projectGuild?.meta as any).interface, 'select-dropdown-m2o');
  assert.equal((rawData?.meta as any).hidden, true);
  assert.equal((rawData?.meta as any).readonly, true);
});
