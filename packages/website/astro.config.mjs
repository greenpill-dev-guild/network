import { defineConfig, passthroughImageService } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(websiteDir, '../..');
const sharedSrcDir = resolve(rootDir, 'packages/shared/src');

const isDevCommand =
  process.env.npm_lifecycle_event === 'dev' || process.argv.includes('dev');

export default defineConfig({
  site: 'https://greenpill.network',
  integrations: [...(isDevCommand ? [react(), keystatic()] : [])],
  output: 'static',
  // Astro 7's default, 'jsx', drops whitespace that holds a line break
  // between elements, which joins words in inline markup such as
  // breadcrumbs. `true` keeps the HTML whitespace rules the site was built
  // and checked with.
  compressHTML: true,
  image: {
    service: passthroughImageService(),
  },
  vite: {
    build: {
      // Astro builds with target 'esnext', so the CSS minifier would assume
      // the newest browsers and drop vendor prefixes Safari 16.4 to 17 still
      // need, such as -webkit-backdrop-filter. These are the browsers of
      // Vite's 'baseline-widely-available' target, the site's support target.
      cssTarget: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],
    },
    resolve: {
      alias: [
        {
          find: /^@greenpill-network\/shared$/,
          replacement: resolve(sharedSrcDir, 'index.ts'),
        },
        {
          find: /^@greenpill-network\/shared\/(.+)$/,
          replacement: `${sharedSrcDir}/$1.ts`,
        },
      ],
    },
    server: {
      fs: {
        allow: [rootDir],
      },
      watch: {
        // Native file events can be missed by agent/sandboxed edits; polling keeps HMR honest.
        usePolling: true,
        interval: 150,
      },
    },
  },
});
