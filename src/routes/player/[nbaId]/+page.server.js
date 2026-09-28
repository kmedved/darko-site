import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { getPlayerComps } from '$lib/server/comps.js';
import { loadPlayerPageData, parsePlayerRouteId } from '$lib/server/playerPage.js';
import { packRows } from '$lib/utils/columnar.js';
import { getFullPlayerProfileHistory, MAX_FULL_HISTORY_ROWS } from '$lib/server/supabase.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function load({ params, setHeaders }) {
    // Comps are a side panel: without them the page still loads.
    const comps = getPlayerComps(parsePlayerRouteId(params.nbaId)).catch((error) => {
        console.error('player comps failed', error);
        return [];
    });
    const { historyRows, ...page } = await loadPlayerPageData({
        nbaIdParam: params.nbaId,
        setHeaders,
        setCacheHeaders: setEdgeCache,
        loadFullHistory: (nbaId) =>
            getFullPlayerProfileHistory(nbaId, {
                maxRows: MAX_FULL_HISTORY_ROWS
            })
    });
    // The career history ships column by column; the page rebuilds the rows.
    return { ...page, history: packRows(historyRows), comps: await comps };
}
