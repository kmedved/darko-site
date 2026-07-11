import {
    getActiveWowyPlayers,
    getWowyLeaderboardSeasons,
    getWowyPublication,
    getWowySeasonPlayers
} from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function load({ url, setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 300,
        swr: 3600,
        sie: 86400
    });

    const [seasons, publication] = await Promise.all([
        getWowyLeaderboardSeasons(),
        getWowyPublication()
    ]);
    const requestedSeason = parseSeasonEndYear(url.searchParams.get('season'));
    const selectedSeason = seasons.includes(requestedSeason) ? requestedSeason : null;
    const players = selectedSeason === null
        ? await getActiveWowyPlayers()
        : await getWowySeasonPlayers(selectedSeason);

    return { players, publication, seasons, selectedSeason };
}

function parseSeasonEndYear(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!/^\d{4}$/.test(normalized)) return null;

    const season = Number.parseInt(normalized, 10);
    return Number.isInteger(season) ? season : null;
}
