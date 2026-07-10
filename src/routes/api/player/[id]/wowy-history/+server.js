import { error, json } from '@sveltejs/kit';

import { MAX_WOWY_HISTORY_ROWS, getWowyPlayerHistory } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ params, setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const nbaId = Number(params.id);
    if (!Number.isInteger(nbaId) || nbaId <= 0) {
        throw error(400, 'Invalid nba_id');
    }

    try {
        const result = await getWowyPlayerHistory(nbaId, { maxRows: MAX_WOWY_HISTORY_ROWS });
        if (result.truncated) {
            throw new Error(`WOWY history exceeds the ${MAX_WOWY_HISTORY_ROWS}-row safety cap`);
        }
        return json(result);
    } catch (cause) {
        throw error(500, cause?.message || 'Failed to load WOWY history');
    }
}
