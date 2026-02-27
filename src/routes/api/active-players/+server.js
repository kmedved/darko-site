import { error, json } from '@sveltejs/kit';

import { getActivePlayers } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ url, setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const team = url.searchParams.get('team')?.trim() || '';

    try {
        const players = await getActivePlayers(team ? { teamName: team } : {});
        return json(players);
    } catch (e) {
        throw error(500, e?.message || 'Failed to load active players');
    }
}
