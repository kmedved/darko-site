import { readCareerQuery } from '$lib/utils/careerChartSpec.js';
import { buildSocialCard } from '$lib/server/charts/service.js';
import { socialChartResponse } from '$lib/server/charts/share.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

export const config = { regions: ['pdx1'], maxDuration: 60 };

// Link previews: always the wide 1200 × 630 card, whatever the chart link's format or title.
// Cached at the edge for a day; every publish redeploys the site, which clears that cache.
export const GET = (event) => socialChartResponse(event, async ({ url, setHeaders }) => {
  const card = await buildSocialCard(readCareerQuery(url.searchParams));
  setEdgeCache(setHeaders, { edgeSMaxAge: 86400, swr: 86400, sie: 86400 });
  return new Response(new Uint8Array(card.png), {
    headers: {
      'content-type': 'image/png', 'x-content-type-options': 'nosniff',
      'x-darko-data-through': card.metadata.dataset_as_of || 'unavailable'
    }
  });
});
