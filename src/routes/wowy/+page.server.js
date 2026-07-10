import { getActiveWowyPlayers, getWowyPublication } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function load({ setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 300,
        swr: 3600,
        sie: 86400
    });

    const [players, publication] = await Promise.all([
        getActiveWowyPlayers(),
        getWowyPublication()
    ]);

    return { players, publication };
}
