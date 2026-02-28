import { error, json } from '@sveltejs/kit';
import { searchAllPlayers } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ url, setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 120,
        swr: 3600,
        sie: 3600
    });

    const q = url.searchParams.get('q')?.trim() || '';
    if (q.length < 2) return json([]);

    try {
        const results = await searchAllPlayers(q);
        return json((results || []).slice(0, 15));
    } catch (e) {
        throw error(500, e?.message || 'Failed to search players');
    }
}
