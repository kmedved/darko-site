import { error, json } from '@sveltejs/kit';

import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { AS_OF_EDGE_CACHE } from '$lib/server/history.js';
import { getSeasonTrends, SEASON_TREND_MAX_IDS } from '$lib/server/supabase.js';
import { parseAsOfDate } from '$lib/utils/timeMachine.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

/**
 * The leaderboard's sparklines for one page of players: ?ids=1,2,3&season=2026, plus
 * &through=YYYY-MM-DD with the Time Machine set.
 */
export async function GET({ url, setHeaders }) {
    const ids = String(url.searchParams.get('ids') ?? '')
        .split(',')
        .map((value) => Number.parseInt(value, 10))
        .filter((id) => Number.isInteger(id) && id > 0);
    const season = Number.parseInt(url.searchParams.get('season') ?? '', 10);
    if (!ids.length || !Number.isInteger(season)) throw error(400, 'ids and season are required');
    if (ids.length > SEASON_TREND_MAX_IDS) throw error(400, `At most ${SEASON_TREND_MAX_IDS} ids`);

    const through = parseAsOfDate(url.searchParams.get('through'));
    setEdgeCache(setHeaders, through ? AS_OF_EDGE_CACHE : { edgeSMaxAge: 3600, swr: 86400, sie: 86400 });
    return json({ trends: await getSeasonTrends(ids, season, { through }) });
}
