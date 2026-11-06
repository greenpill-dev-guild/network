import { lstat, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

// Leave room for the upload archive and future content below Pages' 1 GB limit.
export const PAGES_SITE_BUDGET_BYTES = 990_000_000;

export interface PagesArtifactSize {
  bytes: number;
  files: { path: string; bytes: number }[];
}

export async function measurePagesArtifact(directory: string): Promise<PagesArtifactSize> {
  const root = resolve(directory);
  const files: PagesArtifactSize['files'] = [];

  async function visit(path: string): Promise<void> {
    const entry = await lstat(path);
    if (entry.isSymbolicLink()) throw new Error(`Pages output contains a symbolic link: ${path}`);
    if (entry.isDirectory()) {
      for (const name of await readdir(path)) await visit(join(path, name));
    } else if (entry.isFile()) {
      files.push({ path: relative(root, path), bytes: entry.size });
    } else {
      throw new Error(`Pages output contains an unsupported file: ${path}`);
    }
  }

  await visit(root);
  if (!files.length) throw new Error('Pages output contains no files');
  files.sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
  return { bytes: files.reduce((total, file) => total + file.bytes, 0), files };
}

export function assertPagesArtifactSize(size: PagesArtifactSize): void {
  if (size.bytes >= PAGES_SITE_BUDGET_BYTES) {
    const largest = size.files.slice(0, 10).map((file) => `  ${file.bytes} bytes: ${file.path}`).join('\n');
    throw new Error(
      `Pages output is ${size.bytes} bytes; it must be below the ${PAGES_SITE_BUDGET_BYTES}-byte budget.\n` +
      `Largest files:\n${largest}`
    );
  }
}

if (import.meta.main) {
  try {
    const size = await measurePagesArtifact(process.argv[2] ?? 'packages/website/dist');
    assertPagesArtifactSize(size);
    console.log(`Pages size: ${size.bytes} bytes in ${size.files.length} files; budget < ${PAGES_SITE_BUDGET_BYTES} bytes.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
