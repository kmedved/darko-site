import {
    getActiveWowyPlayers,
    getWowyAdjustedAllTimePage,
    getWowyAdjustedSeasonPlayers,
    getWowyLeaderboardSeasons,
    getWowyPublication
} from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

const ADJUSTED_SEASON_FLOOR = 1978;

// The leaderboard shows Season-Adjusted WOWY only: all time, or one season from the first
// adjusted season on. Current keeps the latest observed game-level ratings. Links from before
// (?rating=average, or a season without adjusted ratings) open the all-time table instead.
export async function load({ url, setHeaders }) {
    prefetchRequestedPlayers(url);
    const [publishedSeasons, publication] = await Promise.all([
        getWowyLeaderboardSeasons(),
        getWowyPublication()
    ]);
    const publishedSeasonAdjustedFrom = Number(publication?.season_adjusted_from);
    const seasonAdjustedFrom =
        Number.isInteger(publishedSeasonAdjustedFrom) && publishedSeasonAdjustedFrom >= ADJUSTED_SEASON_FLOOR
            ? publishedSeasonAdjustedFrom
            : ADJUSTED_SEASON_FLOOR;
    const seasons = publishedSeasons.filter((season) => season >= seasonAdjustedFrom);
    const requestedSeasonValue = url.searchParams.get('season');
    const requestedSeason = parseSeasonEndYear(requestedSeasonValue);
    const selectedSeason = seasons.includes(requestedSeason) ? requestedSeason : null;
    const requestedCurrent =
        url.searchParams.get('view') === 'current' ||
        (typeof requestedSeasonValue === 'string' && requestedSeasonValue.trim() === 'current');
    const selectedView = selectedSeason !== null
        ? 'season'
        : requestedCurrent
            ? 'current'
            : 'all-time';
    let players;
    let allTimeTotal = null;
    let allTimeHasMore = false;

    if (selectedView === 'season') {
        players = await getWowyAdjustedSeasonPlayers(selectedSeason);
    } else if (selectedView === 'current') {
        players = await getActiveWowyPlayers();
    } else {
        const page = await getWowyAdjustedAllTimePage();
        players = page.players;
        allTimeTotal = page.totalCount;
        allTimeHasMore = page.hasMore;
    }

    setEdgeCache(setHeaders, {
        edgeSMaxAge: 300,
        swr: 3600,
        sie: 86400
    });

    return {
        players,
        publication,
        seasons,
        selectedSeason,
        selectedView,
        // A team code (or, for Current, a team name) to filter by, from a clicked team.
        selectedTeam: parseTeamParam(url.searchParams.get('team')),
        allTimeTotal,
        allTimeHasMore
    };
}

// Start the player query the URL asks for alongside the season list and publication, rather than
// after them, so a cold load waits for one round of database calls instead of two. The checks in
// load() still decide what is shown; the matching call there reuses this in-flight request.
function prefetchRequestedPlayers(url) {
    const seasonValue = url.searchParams.get('season');
    const season = parseSeasonEndYear(seasonValue);
    let request;
    if (season !== null) {
        if (season < ADJUSTED_SEASON_FLOOR || season > new Date().getUTCFullYear() + 1) return;
        request = getWowyAdjustedSeasonPlayers(season);
    } else if (url.searchParams.get('view') === 'current' || seasonValue?.trim() === 'current') {
        request = getActiveWowyPlayers();
    } else {
        request = getWowyAdjustedAllTimePage();
    }
    request.catch(() => {});
}

function parseSeasonEndYear(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!/^\d{4}$/.test(normalized)) return null;

    const season = Number.parseInt(normalized, 10);
    return Number.isInteger(season) ? season : null;
}

function parseTeamParam(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized && normalized.length <= 60 ? normalized : null;
}
