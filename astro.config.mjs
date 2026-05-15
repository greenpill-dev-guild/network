import { defineConfig, passthroughImageService } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import keystatic from '@keystatic/astro';

const isDevCommand =
  process.env.npm_lifecycle_event === 'dev' ||
  process.argv.some((arg) => arg === 'dev' || arg.endsWith('/astro dev'));

export default defineConfig({
  integrations: [
    tailwind(),
    ...(isDevCommand ? [keystatic()] : []),
  ],
  output: 'static',
  image: {
    service: passthroughImageService(),
  },
});
