import assert from 'node:assert/strict';
import { lstatSync, readdirSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const skillsDir = resolve(rootDir, '.agents/skills');
const claudeSkillsLink = resolve(rootDir, '.claude/skills');
const adapterPath = resolve(rootDir, '.agents/adapter.md');

const KIT_SKILLS = ['review', 'debug', 'plan', 'ship', 'research'];

function skillNames() {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test('Claude Code and Codex read one skills folder', () => {
  assert.ok(lstatSync(claudeSkillsLink).isSymbolicLink(), '.claude/skills must be a link, not a second copy');
  assert.equal(readlinkSync(claudeSkillsLink), '../.agents/skills');
  assert.equal(realpathSync(claudeSkillsLink), realpathSync(skillsDir));
});

test('every skill folder holds a SKILL.md whose name matches the folder', () => {
  const names = skillNames();
  assert.deepEqual(names, [...KIT_SKILLS, 'greenpill-ui'].sort());
  for (const name of names) {
    const skill = readFileSync(resolve(skillsDir, name, 'SKILL.md'), 'utf8');
    assert.match(skill, new RegExp(`^---\\nname: ${name}\\n`), `${name}/SKILL.md frontmatter`);
    assert.match(skill, /^description: \S/m, `${name}/SKILL.md needs a description`);
  }
});

test('the kit skills read the repository adapter, which has a section for each', () => {
  const adapter = readFileSync(adapterPath, 'utf8');
  for (const section of ['checks', ...KIT_SKILLS]) {
    assert.match(adapter, new RegExp(`^## ${section}\\s*$`, 'm'), `.agents/adapter.md lacks ## ${section}`);
  }
  for (const name of KIT_SKILLS) {
    const skill = readFileSync(resolve(skillsDir, name, 'SKILL.md'), 'utf8');
    assert.match(skill, /\.agents\/adapter\.md/, `${name} must read .agents/adapter.md`);
  }
});

test('the review adapter keeps the repository review lenses', () => {
  const adapter = readFileSync(adapterPath, 'utf8');
  assert.match(adapter, /^### Judgment routing$/m);
  assert.match(adapter, /Agent-Fix-Now/);
  assert.match(adapter, /Human-Judge/);
  assert.match(adapter, /privacy boundary/i);
});
