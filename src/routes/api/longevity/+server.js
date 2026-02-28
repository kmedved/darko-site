import { error, json } from '@sveltejs/kit';

import { getLongevityRows } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    try {
        const rows = await getLongevityRows({ activeOnly: true });
        return json(rows);
    } catch (e) {
        throw error(500, e?.message || 'Failed to load longevity data');
    }
}

