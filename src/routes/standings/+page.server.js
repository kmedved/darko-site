import { getConferenceStandings, getLatestPlayedSeason } from '$lib/server/supabase.js';
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

    // The season's label, for when the simulation has nothing left to play (a finished season).
    const [eastStandings, westStandings, playedSeason] = await Promise.all([
        getConferenceStandings('East'),
        getConferenceStandings('West'),
        getLatestPlayedSeason().catch(() => null)
    ]);

    return {
        eastStandings,
        westStandings,
        playedSeason
    };
}
