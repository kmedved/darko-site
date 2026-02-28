import { error, json } from '@sveltejs/kit';

import { getLongevityTrajectory } from '$lib/server/supabase.js';
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
        const points = await getLongevityTrajectory(nbaId);
        return json(points);
    } catch (e) {
        throw error(500, e?.message || 'Failed to load longevity trajectory');
    }
}

