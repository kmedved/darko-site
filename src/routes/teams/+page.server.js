import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { getTeamsOverviewData } from '$lib/server/supabase.js';
import { teamsOverview } from '$lib/utils/teamsOverview.js';

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

    const { ratings, sim, playedSeason } = await getTeamsOverviewData();
    return { ...teamsOverview(ratings, sim), playedSeason };
}
