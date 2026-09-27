import { json } from '@sveltejs/kit';

import { getCompactFrames, getSeasonCalendar } from '$lib/server/history.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

/**
 * The Time Machine strip: the season calendar and the league's No. 1 DPM each week
 * ([date, dpm, name]). Empty until the history tables are published.
 */
export async function GET({ setHeaders }) {
    setEdgeCache(setHeaders, {
        browserMaxAge: 3600,
        edgeSMaxAge: 21600,
        swr: 86400,
        sie: 86400
    });

    const [calendar, compact] = await Promise.all([getSeasonCalendar(), getCompactFrames()]);
    const trace = (compact?.frames ?? []).map((frame) => {
        const [nbaId, dpm] = frame.players[0] ?? [];
        return [frame.date, dpm ?? null, compact.names[nbaId] ?? null];
    });
    return json({ calendar: calendar ?? [], trace });
}
