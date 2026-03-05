import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { loadPlayerPageData } from '$lib/server/playerPage.js';
import { getFullPlayerHistory, MAX_FULL_HISTORY_ROWS } from '$lib/server/supabase.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function load({ params, setHeaders }) {
    return loadPlayerPageData({
        nbaIdParam: params.nbaId,
        setHeaders,
        setCacheHeaders: setEdgeCache,
        loadFullHistory: (nbaId) =>
            getFullPlayerHistory(nbaId, {
                maxRows: MAX_FULL_HISTORY_ROWS
            })
    });
}
