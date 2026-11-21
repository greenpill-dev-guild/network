// Vite's Oxc parser, for the comment codemod. Vite is not a direct dependency of the repository;
// it comes with Astro, so it is found from the website's Astro install. Declaring it at the root
// instead would re-resolve Rolldown for the whole workspace.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const fromWebsite = createRequire(resolve(repoRoot, 'packages/website/package.json'));
const fromAstro = createRequire(fromWebsite.resolve('astro/package.json'));
const vitePackage = fromAstro.resolve('vite/package.json');
const dot = JSON.parse(readFileSync(vitePackage, 'utf8')).exports['.'];
const entry = typeof dot === 'string' ? dot : (dot.import?.default ?? dot.import ?? dot.default);

export const { parseSync } = await import(pathToFileURL(resolve(dirname(vitePackage), entry)).href);
if (typeof parseSync !== 'function') throw new Error(`Vite at ${dirname(vitePackage)} has no parseSync`);
