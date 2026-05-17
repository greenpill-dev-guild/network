import { getCollection } from 'astro:content';
import {
  CHAPTER_IMPACT_SOURCES_VERSION,
  toPublicImpactSourceBinding,
} from '@greenpill-network/shared/chapter-impact';

const isImpactBinding = (binding: ReturnType<typeof toPublicImpactSourceBinding>) => binding !== null;

export async function GET() {
  const chapters = await getCollection('chapters');
  const impactSources = chapters
    .map(toPublicImpactSourceBinding)
    .filter(isImpactBinding)
    .sort((a, b) => a.chapterName.localeCompare(b.chapterName));

  return new Response(JSON.stringify({
    version: CHAPTER_IMPACT_SOURCES_VERSION,
    generatedAt: new Date().toISOString(),
    chapters: impactSources,
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
