import { getCollection } from 'astro:content';

export async function GET() {
  const chapters = await getCollection('chapters');
  const locations = chapters
    .filter((chapter) => Number.isFinite(chapter.data.lat) && Number.isFinite(chapter.data.long))
    .sort((a, b) => a.data.name.localeCompare(b.data.name))
    .map((chapter) => ({
      id: chapter.id,
      name: chapter.data.name,
      lat: chapter.data.lat,
      long: chapter.data.long,
      link: chapter.data.link || `/chapters/${chapter.id}`,
      kind: 'chapter',
      status: chapter.data.status,
      themes: chapter.data.themeSlugs,
    }));

  return new Response(JSON.stringify(locations, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
