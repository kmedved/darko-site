import {
    getActivePlayers,
    getLeaderboardSeasons,
    getSeasonStartPlayers
} from '$lib/server/supabase.js';
import { AS_OF_EDGE_CACHE, getPlayersOnDate } from '$lib/server/history.js';
import { projectPlayers } from '$lib/server/playerViews.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { AS_OF_PARAM, latestDate, parseAsOfDate } from '$lib/utils/timeMachine.js';
import { packRows } from '$lib/utils/columnar.js';
import { withChangeSince } from '$lib/utils/leaderboardViews.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function load({ url, setHeaders }) {
    const asOfDate = parseAsOfDate(url.searchParams.get(AS_OF_PARAM));
    setEdgeCache(setHeaders, asOfDate ? AS_OF_EDGE_CACHE : {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    let seasons;
    let snapshot;
    let today = null;
    let asOf = null;
    let selectedSeason = null;
    if (asOfDate) {
        // Today's board too, for each player's rating now and the change since the date.
        const [allSeasons, result, current] = await Promise.all([
            getLeaderboardSeasons(),
            getPlayersOnDate(asOfDate),
            getActivePlayers()
        ]);
        seasons = allSeasons;
        snapshot = result.rows;
        today = current;
        asOf = { date: asOfDate, dataDate: result.dataDate, season: result.season };
    } else {
        seasons = await getLeaderboardSeasons();
        const requestedSeason = parseSeasonEndYear(url.searchParams.get('season'));
        selectedSeason = seasons.includes(requestedSeason) ? requestedSeason : null;
        snapshot = selectedSeason === null
            ? await getActivePlayers()
            : await getSeasonStartPlayers(selectedSeason);
    }
    const projected = projectPlayers(snapshot, 'leaderboard');
    const players = today ? withChangeSince(projected, today) : projected;

    return {
        // Column by column: every player repeats the same ~22 field names.
        players: packRows(players.map((player, index) => ({
            ...player,
            _rank: index + 1
        }))),
        seasons,
        selectedSeason,
        asOf,
        // Today's board says how fresh it is: the last day any player's rating moved.
        ratingsThrough: asOf || selectedSeason !== null ? null : latestDate(snapshot)
    };
}

function parseSeasonEndYear(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!/^\d{4}$/.test(normalized)) return null;

    const season = Number.parseInt(normalized, 10);
    return Number.isInteger(season) ? season : null;
}
