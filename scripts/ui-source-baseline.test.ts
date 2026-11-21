import assert from 'node:assert/strict';
import test from 'node:test';
import { collectLineSourceFindings, shrinkSourceBaseline } from './ui-verify.ts';

const file = 'packages/website/src/components/Example.astro';

test('a new raw colour in website CSS is a hard source finding', () => {
  const findings = collectLineSourceFindings(file, '.card {\n  color: #ff0066;\n}\n');
  assert.deepEqual(findings.map((f) => [f.code, f.sev, f.line]), [['RAW_DESIGN_VALUE', 'hard', 2]]);
});

test('token colours pass the source check', () => {
  assert.deepEqual(collectLineSourceFindings(file, '.card { color: var(--gp-green-950); }'), []);
});

test('regenerating the baseline keeps covered entries and drops stale ones', () => {
  const entry = (needle: string) => ({ file, code: 'RAW_DESIGN_VALUE', needle, reason: 'reviewed' });
  const [hit] = collectLineSourceFindings(file, 'color: #000;');
  const { kept, dropped, uncovered } = shrinkSourceBaseline([entry('#000'), entry('#fff')], [hit]);
  assert.deepEqual(kept.map((e) => e.needle), ['#000']);
  assert.deepEqual(dropped.map((e) => e.needle), ['#fff']);
  assert.deepEqual(uncovered, []);
});

test('regenerating the baseline cannot add a violation', () => {
  const [hit] = collectLineSourceFindings(file, 'color: #123456;');
  const { kept, uncovered } = shrinkSourceBaseline([], [hit]);
  assert.deepEqual(kept, []);
  assert.equal(uncovered.length, 1);
});
