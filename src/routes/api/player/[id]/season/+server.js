import { error, json } from '@sveltejs/kit';

import { getPlayerSeasonRows } from '$lib/server/supabase.js';
import { getPlayerSeasons } from '$lib/server/daily.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

/**
 * One season of a player's ratings for the Seismograph (the About page's "Watch DARKO learn"),
 * with the seasons he has played: ?season=2026, or his latest without it.
 */
export async function GET({ params, url, setHeaders }) {
    const nbaId = Number(params.id);
    if (!Number.isInteger(nbaId) || nbaId <= 0) throw error(400, 'Invalid nba_id');
    const asked = url.searchParams.get('season');
    const wanted = asked === null ? null : Number(asked);
    if (asked !== null && !(Number.isInteger(wanted) && wanted >= 1997 && wanted <= 2100)) {
        throw error(400, 'Invalid season');
    }

    try {
        const seasons = ((await getPlayerSeasons(nbaId)) ?? [])
            .map((row) => Number(row.season))
            .filter(Number.isInteger)
            .sort((a, b) => b - a);
        const season = wanted ?? seasons[0] ?? null;
        const rows = season === null ? [] : await getPlayerSeasonRows(nbaId, season);
        setEdgeCache(setHeaders, { edgeSMaxAge: 3600, swr: 86400, sie: 86400 });
        return json({ nba_id: nbaId, season, seasons, rows });
    } catch (e) {
        throw error(500, e?.message || 'Failed to load the season');
    }
}
