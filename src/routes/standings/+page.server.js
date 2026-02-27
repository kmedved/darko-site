import { getConferenceStandings } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function load({ setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const [eastStandings, westStandings] = await Promise.all([
        getConferenceStandings('East'),
        getConferenceStandings('West')
    ]);

    return {
        eastStandings,
        westStandings
    };
}
