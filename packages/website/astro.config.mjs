import { defineConfig, passthroughImageService } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import keystatic from '@keystatic/astro';

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
});
