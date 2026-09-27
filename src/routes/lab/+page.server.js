import { getActivePlayers } from '$lib/server/supabase.js';
import { AS_OF_EDGE_CACHE, getPlayersOnDate } from '$lib/server/history.js';
import { projectPlayers } from '$lib/server/playerViews.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { AS_OF_PARAM, parseAsOfDate } from '$lib/utils/timeMachine.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

// Today's rosters, or every roster as of the Time Machine date.
export async function load({ url, setHeaders }) {
    const asOfDate = parseAsOfDate(url.searchParams.get(AS_OF_PARAM));
    setEdgeCache(setHeaders, asOfDate ? AS_OF_EDGE_CACHE : { edgeSMaxAge: 3600, swr: 86400, sie: 86400 });

    if (!asOfDate) {
        return { players: projectPlayers(await getActivePlayers(), 'lab'), asOf: null };
    }
    const result = await getPlayersOnDate(asOfDate);
    return {
        players: projectPlayers(result.rows, 'lab'),
        asOf: { date: asOfDate, dataDate: result.dataDate, season: result.season }
    };
}
