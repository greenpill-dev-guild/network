import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const codexSkillPath = resolve(rootDir, '.agents/skills/greenpill-review/SKILL.md');
const codexMetadataPath = resolve(rootDir, '.agents/skills/greenpill-review/agents/openai.yaml');
const canonicalSkillPath = resolve(rootDir, '.claude/skills/review/SKILL.md');

test('Codex discovers the Greenpill review workflow without shadowing built-in review', async () => {
  await Promise.all([
    access(codexMetadataPath),
    access(canonicalSkillPath),
  ]);

  const skill = await readFile(codexSkillPath, 'utf8');
  assert.match(skill, /^---\nname: greenpill-review\n/m);
  assert.doesNotMatch(skill, /^name: review$/m);
  assert.match(skill, /\.\.\/\.\.\/\.\.\/\.claude\/skills\/review\/SKILL\.md/);
  assert.match(skill, /Codex's built-in `\/review` remains a separate built-in review mode/);
});

test('Codex skill metadata exposes a clear Greenpill Review label', async () => {
  const metadata = await readFile(codexMetadataPath, 'utf8');
  assert.match(metadata, /display_name: "Greenpill Review"/);
  assert.match(metadata, /production-readiness review/);
});
