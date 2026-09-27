import { json } from '@sveltejs/kit';
import { getWowyAllTimeFilterOptions } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

export async function GET({ url, setHeaders }) {
    const ratingMode = url.searchParams.get('rating') === 'adjusted' ? 'adjusted' : 'average';
    const options = await getWowyAllTimeFilterOptions(ratingMode);
    // The choices change only when WOWY is republished.
    setEdgeCache(setHeaders, { edgeSMaxAge: 3600, swr: 86400, sie: 86400 });
    return json(options);
}
