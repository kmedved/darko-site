import { error, json } from '@sveltejs/kit';

import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { getRatingMoves, getRatingSeries } from '$lib/server/daily.js';
import { getActivePlayers } from '$lib/server/supabase.js';
import { movesByWindow, watchCards } from '$lib/utils/daily.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

const MAX_IDS = 24;

/** The Daily's watchlist cards for the players a reader follows (?ids=1,2,3). */
export async function GET({ url, setHeaders }) {
    const ids = String(url.searchParams.get('ids') ?? '')
        .split(',')
        .map((value) => Number.parseInt(value, 10))
        .filter((id) => Number.isInteger(id) && id > 0)
        .slice(0, MAX_IDS);
    if (!ids.length) throw error(400, 'ids is required');
    setEdgeCache(setHeaders, { edgeSMaxAge: 3600, swr: 86400, sie: 86400 });

    const [players, moveRows] = await Promise.all([getActivePlayers(), getRatingMoves()]);
    const byWindow = movesByWindow(moveRows ?? []);
    const series = byWindow.season ? await getRatingSeries(ids, byWindow.season.start) : {};
    return json({ cards: watchCards(ids, { players, byWindow, series }) });
}
