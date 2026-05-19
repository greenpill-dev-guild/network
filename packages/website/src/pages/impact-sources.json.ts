import { getOperationalImpactSourceBindings } from '../lib/operational-content';

export async function GET() {
  const impactSources = await getOperationalImpactSourceBindings();

  return new Response(JSON.stringify(impactSources, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
