import { getWebsiteBuildMetadata } from '../lib/build-metadata';

export const prerender = true;

export async function GET() {
  const metadata = await getWebsiteBuildMetadata();
  return new Response(`${JSON.stringify(metadata, null, 2)}\n`, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
