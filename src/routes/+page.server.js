import {
    getActivePlayers,
    getLeaderboardSeasons,
    getSeasonStartPlayers
} from '$lib/server/supabase.js';
import { projectPlayers } from '$lib/server/playerViews.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function load({ url, setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const seasons = await getLeaderboardSeasons();
    const requestedSeason = parseSeasonEndYear(url.searchParams.get('season'));
    const selectedSeason = seasons.includes(requestedSeason) ? requestedSeason : null;
    const snapshot = selectedSeason === null
        ? await getActivePlayers()
        : await getSeasonStartPlayers(selectedSeason);
    const players = projectPlayers(snapshot, 'leaderboard');

    return {
        players: players.map((player, index) => ({
            ...player,
            _rank: index + 1
        })),
        seasons,
        selectedSeason
    };
}

function parseSeasonEndYear(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!/^\d{4}$/.test(normalized)) return null;

    const season = Number.parseInt(normalized, 10);
    return Number.isInteger(season) ? season : null;
}
