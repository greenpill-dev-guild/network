import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { assertPagesArtifactSize, measurePagesArtifact, PAGES_SITE_BUDGET_BYTES } from './pages-artifact-size.ts';

test('counts nested files, including hidden files, and reports the largest first', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pages-size-'));
  try {
    await mkdir(join(root, 'pdf'));
    await writeFile(join(root, '.nojekyll'), '');
    await writeFile(join(root, 'index.html'), 'site');
    await writeFile(join(root, 'pdf', 'book.pdf'), 'longer book');
    const size = await measurePagesArtifact(root);
    assert.equal(size.bytes, 15);
    assert.deepEqual(size.files.map((file) => file.path), [join('pdf', 'book.pdf'), 'index.html', '.nojekyll']);
    assert.doesNotThrow(() => assertPagesArtifactSize(size));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects the budget boundary before uploading and names the large file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pages-size-'));
  const pdf = join(root, 'large.pdf');
  try {
    await writeFile(pdf, '');
    // Sparse files exercise real filesystem sizes without writing 990 MB of data.
    await truncate(pdf, PAGES_SITE_BUDGET_BYTES - 1);
    const awaitedSize = await measurePagesArtifact(root);
    assert.doesNotThrow(() => assertPagesArtifactSize(awaitedSize));
    await truncate(pdf, PAGES_SITE_BUDGET_BYTES);
    const sizeAtBudget = await measurePagesArtifact(root);
    assert.throws(() => assertPagesArtifactSize(sizeAtBudget), /largest/i);
    assert.throws(() => assertPagesArtifactSize(sizeAtBudget), /large\.pdf/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects missing output, empty output, and symbolic links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pages-size-'));
  try {
    await assert.rejects(measurePagesArtifact(join(root, 'missing')), /ENOENT/);
    await assert.rejects(measurePagesArtifact(root), /no files/);
    await writeFile(join(root, 'index.html'), 'site');
    await symlink(join(root, 'index.html'), join(root, 'linked.html'));
    await assert.rejects(measurePagesArtifact(root), /symbolic link/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
