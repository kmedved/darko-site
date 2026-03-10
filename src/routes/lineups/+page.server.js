import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { loadLineupsPageData } from '$lib/server/lineupsPage.js';
import { getLineupRatings } from '$lib/server/supabase.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

/** @type {import('./$types').PageServerLoad} */
export async function load({ setHeaders }) {
    return loadLineupsPageData({
        setHeaders,
        setCacheHeaders: setEdgeCache,
        loadLineupRatings: getLineupRatings
    });
}
