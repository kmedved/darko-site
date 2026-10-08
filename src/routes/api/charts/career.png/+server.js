import { json } from '@sveltejs/kit';
import { readCareerQuery } from '$lib/utils/careerChartSpec.js';
import { buildCareerChart } from '$lib/server/charts/service.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

export const config = { regions: ['pdx1'], maxDuration: 60 };

export async function GET({ url, setHeaders }) {
  const width = url.searchParams.get('width') || '1200';
  if (!['1200', '2400'].includes(width)) return json({ error: 'width must be 1200 or 2400' }, { status: 400 });
  for (const key of ['min', 'max', 'ymin', 'ymax', 'at']) {
    const value = url.searchParams.get(key);
    if (value !== null && value !== '' && !Number.isFinite(Number(value))) return json({ error: `${key} must be a finite number` }, { status: 400 });
  }
  try {
    const result = await buildCareerChart(readCareerQuery(url.searchParams));
    const spec = result.metadata.specification;
    setEdgeCache(setHeaders, { edgeSMaxAge: 300, swr: 300, sie: 300 });
    const filename = `darko-career-${spec.metric}-${spec.scale}-${spec.format}-${spec.ids.join('-')}.png`;
    return new Response(new Uint8Array(width === '2400' ? result.download : result.display), {
      headers: {
        'content-type': 'image/png', 'x-content-type-options': 'nosniff',
        'content-disposition': `${url.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="${filename}"`,
        'x-darko-data-through': result.metadata.dataset_as_of || 'unavailable'
      }
    });
  } catch (error) {
    const invalid = error?.name === 'ZodError';
    const busy = error?.message?.includes('renderer is busy');
    return json({ error: invalid ? 'Invalid chart specification' : 'Chart unavailable', details: invalid ? error.issues.map((issue) => issue.message) : undefined,
      message: invalid ? undefined : error?.message || 'Chart unavailable' }, { status: invalid ? 400 : busy ? 503 : 422 });
  }
}
