import { error, json } from '@sveltejs/kit';

import { MAX_FULL_HISTORY_ROWS, getFullPlayerHistory, getPlayerHistory } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ params, url, setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const nbaId = Number(params.id);
    if (!Number.isInteger(nbaId) || nbaId <= 0) {
        throw error(400, 'Invalid nba_id');
    }

    // Contract:
    // - default limit is 1000 when no caller-provided limit exists
    // - bounded limit max is 2000 for non-full requests
    // - full=1 opts into explicit full-history mode via paginated fetch
    const full = url.searchParams.get('full') === '1';
    const limitParam = url.searchParams.get('limit');
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 1000;
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 1000;
    const boundedLimit = Math.max(1, Math.min(2000, limit));

    try {
        if (full) {
            const fullHistory = await getFullPlayerHistory(nbaId, { maxRows: MAX_FULL_HISTORY_ROWS });
            return json(fullHistory);
        }

        const rows = await getPlayerHistory(nbaId, boundedLimit);
        return json(rows);
    } catch (e) {
        throw error(500, e?.message || 'Failed to load player history');
    }
}
