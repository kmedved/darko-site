import { json } from '@sveltejs/kit';

import { getActivePlayers } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function GET({ url, setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const team = url.searchParams.get('team')?.trim() || '';

    const players = await getActivePlayers(team ? { teamName: team } : {});
    return json(players);
}
