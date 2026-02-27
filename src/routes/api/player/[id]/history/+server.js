import { error, json } from '@sveltejs/kit';

import { supabase } from '$lib/server/supabase.js';
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

    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : null;

    if (Number.isInteger(limit) && limit > 0) {
        const boundedLimit = Math.max(1, Math.min(2000, limit));

        const { data, error: qerr } = await supabase
            .from('darko_shiny_history')
            .select('*')
            .eq('nba_id', nbaId)
            .order('date', { ascending: false })
            .limit(boundedLimit);

        if (qerr) {
            throw error(500, qerr.message || 'Failed to load player history');
        }

        return json((data || []).slice().reverse());
    }

    const pageSize = 1000;
    let page = 0;
    const allRows = [];

    while (true) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error: qerr } = await supabase
            .from('darko_shiny_history')
            .select('*')
            .eq('nba_id', nbaId)
            .order('date', { ascending: true })
            .range(from, to);

        if (qerr) {
            throw error(500, qerr.message || 'Failed to load player history');
        }

        allRows.push(...(data || []));

        if (!data || data.length < pageSize) {
            break;
        }

        page += 1;
    }

    return json(allRows);
}
