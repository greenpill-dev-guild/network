import { defineConfig, passthroughImageService } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import keystatic from '@keystatic/astro';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(websiteDir, '../..');
const sharedSrcDir = resolve(rootDir, 'packages/shared/src');

const isDevCommand =
  process.env.npm_lifecycle_event === 'dev' ||
  process.argv.some((arg) => arg === 'dev' || arg.endsWith('/astro dev'));

export default defineConfig({
  integrations: [
    tailwind(),
    ...(isDevCommand ? [react(), keystatic()] : []),
  ],
  output: 'static',
  image: {
    service: passthroughImageService(),
  },
  vite: {
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
    },
  },
});
