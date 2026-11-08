import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DIRECTUS_LOCALE_KEYS_FOR_LABELS,
  STEWARD_FACING_COLLECTIONS,
  STUDIO_LABEL_LOCALES,
  keepOtherTranslations,
  withLocaleLabels,
} from './directus-studio-labels.ts';
import { buildDirectusStudioMetadataPlan } from './directus-studio-setup.ts';

type Translation = { language: string; translation: string };

const plan = () => buildDirectusStudioMetadataPlan(
  ['themes', 'people', 'chapters', 'chapter_initiatives', 'guilds', 'projects'],
  ['chapter_editor_assignments', 'guild_editor_assignments'],
  ['chapter_update_requests', 'chapter_update_request_links', 'chapter_update_request_proof_signals'],
  ['map_node_submissions', 'map_node_moderation_notifications', 'map_node_moderation_access_links'],
  ['review_notifications', 'map_node_intake_settings', 'chapter_impact_snapshots']
);

const managedLocales = Object.keys(STUDIO_LABEL_LOCALES);

function assertLocalized(where: string, translations: Translation[] | null | undefined) {
  for (const language of managedLocales) {
    const entries = (translations ?? []).filter((entry) => entry.language === language);
    assert.equal(entries.length, 1, `${where} needs one ${language} label`);
    assert.ok(entries[0].translation.trim().length > 0, `${where} has an empty ${language} label`);
  }
}

test('label locales are keys Directus offers its users', () => {
  assert.ok(managedLocales.some((key) => STUDIO_LABEL_LOCALES[key] === 'pt'));
  assert.ok(managedLocales.some((key) => STUDIO_LABEL_LOCALES[key] === 'es'));
  for (const key of managedLocales) {
    assert.ok(DIRECTUS_LOCALE_KEYS_FOR_LABELS.includes(key), `${key} is not a Directus 11.17.4 language`);
  }
});

test('every visible field and form group of a steward-facing collection has its pt-BR and Spanish label', () => {
  const metadata = plan();
  const stewardFacing = (collection: string) => STEWARD_FACING_COLLECTIONS.includes(collection);

  for (const field of metadata.fields.filter((candidate) => stewardFacing(candidate.collection))) {
    if (field.meta.hidden === true) continue;
    assertLocalized(`${field.collection}.${field.field}`, field.meta.translations as Translation[]);
  }
  for (const group of metadata.groupFields.filter((candidate) => stewardFacing(candidate.collection))) {
    assertLocalized(`${group.collection}.${group.field}`, group.meta.translations as Translation[]);
  }
  // The relation lists content:setup creates on chapters and guilds.
  for (const [collection, field] of [['chapters', 'initiatives'], ['guilds', 'projects']]) {
    const alias = metadata.extraGroupMembers.find((member) => member.collection === collection && member.field === field);
    assertLocalized(`${collection}.${field}`, (alias?.meta as { translations?: Translation[] })?.translations);
  }
});

test('English labels stay as they were, and fields without one do not gain one', () => {
  const metadata = plan();
  const english = (translations: unknown) => ((translations ?? []) as Translation[])
    .filter((entry) => entry.language === 'en-US')
    .map((entry) => entry.translation);

  const group = metadata.groupFields.find((candidate) => candidate.collection === 'chapters' && candidate.field === 'group_identity');
  assert.deepEqual(english(group?.meta.translations), ['Identity & Location']);
  const imageFile = metadata.fields.find((candidate) => candidate.collection === 'chapters' && candidate.field === 'image_file');
  assert.deepEqual(english(imageFile?.meta.translations), ['Chapter image']);
  const summary = metadata.fields.find((candidate) => candidate.collection === 'chapters' && candidate.field === 'summary');
  assert.deepEqual(english(summary?.meta.translations), []);

  // Collections stewards do not use keep their metadata as it was.
  for (const field of metadata.fields.filter((candidate) => !STEWARD_FACING_COLLECTIONS.includes(candidate.collection))) {
    const languages = ((field.meta.translations ?? []) as Translation[]).map((entry) => entry.language);
    assert.deepEqual(languages.filter((language) => managedLocales.includes(language)), [], `${field.collection}.${field.field}`);
  }
});

test('applying the labels again changes nothing, so a rerun adds no duplicates', () => {
  const once = withLocaleLabels('chapters', 'image_alt', [{ language: 'en-US', translation: 'Image alt text' }]);
  const twice = withLocaleLabels('chapters', 'image_alt', once);
  assert.deepEqual(twice, once);
  assert.equal(once?.[0]?.language, 'en-US');
  assert.equal(once?.length, 1 + managedLocales.length);

  // A label edited by hand in Data Studio for a managed locale is replaced, and
  // one in any other language is kept.
  const edited = withLocaleLabels('chapters', 'summary', [
    { language: managedLocales[0], translation: 'edited by hand' },
    { language: 'fr-FR', translation: 'Résumé' },
  ]);
  assert.equal(edited?.filter((entry) => entry.language === managedLocales[0]).length, 1);
  assert.notEqual(edited?.find((entry) => entry.language === managedLocales[0])?.translation, 'edited by hand');
  assert.deepEqual(edited?.find((entry) => entry.language === 'fr-FR'), { language: 'fr-FR', translation: 'Résumé' });

  // Fields outside the steward-facing collections are left alone.
  const untouched = [{ language: 'en-US', translation: 'Auto-off time' }];
  assert.equal(withLocaleLabels('map_node_intake_settings', 'live_onboarding_expires_at', untouched), untouched);
});

test('a rerun keeps labels stored in other languages and replaces the ones it sets', () => {
  // Directus replaces a field's translations list whole, so the stored list is
  // merged in when the metadata is written.
  const planned = {
    group: 'group_story',
    translations: [
      { language: 'en-US', translation: 'Story' },
      { language: 'pt-BR', translation: 'História' },
    ],
  };
  const stored = {
    note: 'stored note',
    translations: [
      { language: 'fr-FR', translation: 'Histoire' },
      { language: 'pt-BR', translation: 'older draft' },
    ],
  };
  const written = keepOtherTranslations(stored, planned);
  assert.deepEqual(written.translations, [
    { language: 'fr-FR', translation: 'Histoire' },
    { language: 'en-US', translation: 'Story' },
    { language: 'pt-BR', translation: 'História' },
  ]);
  // The next run starts from what this one wrote and changes nothing.
  assert.deepEqual(keepOtherTranslations(written, planned).translations, written.translations);
  // Metadata that sets no translations leaves the stored ones alone.
  const groupOnly = { group: 'group_story' };
  assert.equal(keepOtherTranslations(stored, groupOnly), groupOnly);
  assert.deepEqual(keepOtherTranslations(null, planned).translations, planned.translations);
});
