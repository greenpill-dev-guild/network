import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { emDashHits, scanWebsiteCopy, stripScriptComments } from './website-em-dashes';

// Built from its code point so this file never holds the character itself.
const DASH = String.fromCodePoint(0x2014);

const lines = (hits: { line: number }[]) => hits.map((hit) => hit.line);

describe('scripts: copy counts, comments do not', () => {
  test('a string, a template literal and an escaped dash are copy', () => {
    const source = [
      `const a = 'Live onboarding is on ${DASH} your node appears';`,
      'const b = `Member · ${place || "' + DASH + '"}`;',
      'const c = "Escaped \\u2014 dash";',
      'const d = "Braced \\u{2014} dash";',
    ].join('\n');
    expect(lines(emDashHits('src/a.ts', source))).toEqual([1, 2, 3, 4]);
  });

  test('line and block comments are skipped', () => {
    const source = [
      `// Equirectangular projection ${DASH} must match`,
      `/* Relationship lines are neutral ${DASH} at rest`,
      `   still a comment ${DASH} */`,
      `const x = 1; // trailing ${DASH} note`,
      'const ok = "clean";',
    ].join('\n');
    expect(emDashHits('src/a.ts', source)).toEqual([]);
  });

  test('a comment inside a template expression is skipped and the template text is still copy', () => {
    const source = [
      'const label = `Shared ${count /* ' + DASH + ' note */} themes',
      `and more ${DASH} copy\`;`,
    ].join('\n');
    expect(lines(emDashHits('src/a.ts', source))).toEqual([2]);
  });

  test('a regular expression with slashes does not start a comment', () => {
    const source = [
      'const isUrl = /https?:\\/\\//.test(href);',
      `const copy = 'After the regex ${DASH} still copy';`,
      'const half = total / 2; // ' + DASH + ' a comment after division',
    ].join('\n');
    expect(lines(emDashHits('src/a.ts', source))).toEqual([2]);
  });

  test('quotes inside comments do not open strings', () => {
    const source = [
      "// Don't treat this apostrophe as a string",
      `const copy = 'Real copy ${DASH} here';`,
    ].join('\n');
    expect(lines(emDashHits('src/a.ts', source))).toEqual([2]);
  });

  test('stripping keeps line breaks so line numbers stay true', () => {
    const source = '/* one\ntwo */\nconst x = 1;';
    expect(stripScriptComments(source).split('\n')).toHaveLength(3);
  });
});

describe('.astro files', () => {
  const page = [
    '---',
    `// Frontmatter comment ${DASH} skipped`,
    `const dek = 'Frontmatter copy ${DASH} reported';`,
    '---',
    '<main>',
    `  <!-- HTML comment ${DASH} skipped -->`,
    `  {/* Template comment ${DASH} skipped */}`,
    `  <p>Template text ${DASH} reported</p>`,
    '  <p>Entity &mdash; reported</p>',
    '</main>',
    '<script>',
    `  // Script comment ${DASH} skipped`,
    `  el.textContent = 'Script copy ${DASH} reported';`,
    '</script>',
    '<style>',
    `  /* Style comment ${DASH} skipped */`,
    `  .x::after { content: '${DASH}'; }`,
    '</style>',
  ].join('\n');

  test('copy in frontmatter, template, scripts and CSS content is reported; comments are not', () => {
    expect(lines(emDashHits('src/pages/x.astro', page))).toEqual([3, 8, 9, 13, 17]);
  });
});

describe('other file types', () => {
  test('a JSON value is reported at its line', () => {
    const json = ['{', '  "title": "Clean",', `  "dek": "Field notes ${DASH} from the network"`, '}'].join('\n');
    expect(lines(emDashHits('src/content/x.json', json))).toEqual([3]);
  });

  test('an escaped dash in JSON counts', () => {
    expect(lines(emDashHits('src/content/x.json', '{ "a": "x \\u2014 y" }'))).toEqual([1]);
  });

  test('CSS comments are skipped', () => {
    expect(emDashHits('src/styles/x.css', `/* Base layer ${DASH} defaults */\n.a { color: red; }`)).toEqual([]);
  });

  test('HTML comments in markdown are skipped and prose is reported', () => {
    expect(lines(emDashHits('src/content/x.md', `<!-- note ${DASH} -->\nProse ${DASH} here`))).toEqual([2]);
  });

  test('binary and unknown file types are ignored', () => {
    expect(emDashHits('public/images/x.png', DASH)).toEqual([]);
  });
});

describe('scanWebsiteCopy', () => {
  test('scans src and public, and skips the Directus snapshot and the podcast feed', () => {
    const root = mkdtempSync(join(tmpdir(), 'website-em-dashes-'));
    const write = (file: string, text: string) => {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), text);
    };
    try {
      write('packages/website/src/content/home.json', `{ "dek": "A ${DASH} B" }`);
      write('packages/website/src/data/operational-content-snapshot.json', `{ "summary": "Steward ${DASH} copy" }`);
      write('packages/website/src/data/podcast-feed-snapshot.json', `{ "title": "Episode ${DASH} title" }`);
      write('packages/website/public/llms.txt', `About ${DASH} us`);
      write('packages/website/public/pdf/book.pdf', DASH);
      write('packages/website/DESIGN.md', `Guide ${DASH} prose`);

      const { hits, files } = scanWebsiteCopy(root);
      expect(hits.map((hit) => hit.file)).toEqual([
        'packages/website/public/llms.txt',
        'packages/website/src/content/home.json',
      ]);
      expect(files).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
