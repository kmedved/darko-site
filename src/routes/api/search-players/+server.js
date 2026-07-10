import { error, json } from '@sveltejs/kit';
import { searchAllPlayers } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ url, setHeaders }) {
    const q = url.searchParams.get('q')?.trim() || '';
    if (q.length < 2) return json([]);

    try {
        const results = await searchAllPlayers(q);
        setEdgeCache(setHeaders, {
            edgeSMaxAge: 120,
            swr: 3600,
            sie: 3600
        });
        return json((results || []).slice(0, 15));
    } catch (e) {
        console.error('player search failed', e);
        throw error(503, 'Player search is temporarily unavailable. Please try again.');
    }
}
