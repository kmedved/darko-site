import { getCompactFrames, getSeasonCalendar } from '$lib/server/history.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { RACE_SIZE } from '$lib/utils/rewind.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

// Every week since 1996-97 ships once. The page reads the Time Machine date in the browser,
// and this load never reads the URL, so moving the date never reloads it.
export async function load({ setHeaders }) {
    setEdgeCache(setHeaders, { edgeSMaxAge: 21600, swr: 86400, sie: 86400 });

    const [calendar, compact] = await Promise.all([getSeasonCalendar(), getCompactFrames()]);
    if (!calendar || !compact) {
        return { available: false, calendar: [], frames: [], names: {} };
    }

    const names = {};
    const frames = compact.frames.map((frame) => ({
        date: frame.date,
        season: frame.season,
        players: frame.players.slice(0, RACE_SIZE).map(([nbaId, dpm, offense, tmId]) => {
            names[nbaId] ??= compact.names[nbaId];
            return [nbaId, Math.round(dpm * 100), Math.round(offense * 100), tmId];
        })
    }));
    return { available: true, calendar, frames, names };
}
