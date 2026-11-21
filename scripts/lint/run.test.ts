import assert from 'node:assert/strict';
import test from 'node:test';
import { biomeFindings, oxlintFindings, wrapOnceFindings } from './run.mjs';

const formatDiagnostic = (file: string) => ({
  category: 'format',
  message: 'Formatter would have printed',
  location: { path: file },
});

test('biome format diagnostics become one finding per file', () => {
  const doc = {
    summary: { errors: 1, diagnosticsNotPrinted: 0, changed: 0, unchanged: 5 },
    diagnostics: [formatDiagnostic('scripts/a.ts')],
  };
  assert.deepEqual(biomeFindings(doc), [{ rule: 'biome(format)', file: 'scripts/a.ts' }]);
});

test('the lint gate fails closed when a tool reads nothing or reports something else', () => {
  assert.throws(() => oxlintFindings({ diagnostics: [], number_of_files: 0 }), /no files/);
  assert.throws(
    () =>
      biomeFindings({
        summary: { errors: 1, diagnosticsNotPrinted: 0, unchanged: 5, changed: 0 },
        diagnostics: [{ category: 'internalError/fs', message: 'cannot read', location: { path: 'x' } }],
      }),
    /not formatting/,
  );
  assert.throws(
    () =>
      biomeFindings({
        summary: { errors: 3, diagnosticsNotPrinted: 0, unchanged: 5, changed: 0 },
        diagnostics: [formatDiagnostic('a.ts')],
      }),
    /does not match/,
  );
  assert.throws(
    () =>
      biomeFindings({ summary: { errors: 0, diagnosticsNotPrinted: 0, unchanged: 0, changed: 0 }, diagnostics: [] }),
    /no files/,
  );
  assert.throws(() => wrapOnceFindings({ findings: [] }, { scopes: ['packages/no-such-package'] }), /scopes missing/);
});
