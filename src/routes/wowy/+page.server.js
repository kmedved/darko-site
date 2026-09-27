import {
    getActiveWowyPlayers,
    getWowyAdjustedAllTimePage,
    getWowyAdjustedSeasonPlayers,
    getWowyAllTimePage,
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

const ADJUSTED_SEASON_FLOOR = 1978;

export async function load({ url, setHeaders }) {
    prefetchRequestedPlayers(url);
    const [seasons, publication] = await Promise.all([
        getWowyLeaderboardSeasons(),
        getWowyPublication()
    ]);
    const requestedSeasonValue = url.searchParams.get('season');
    const requestedSeason = parseSeasonEndYear(requestedSeasonValue);
    const selectedSeason = seasons.includes(requestedSeason) ? requestedSeason : null;
    const requestedCurrent =
        url.searchParams.get('view') === 'current' ||
        (typeof requestedSeasonValue === 'string' && requestedSeasonValue.trim() === 'current');
    let selectedView = selectedSeason !== null
        ? 'season'
        : requestedCurrent
            ? 'current'
            : 'all-time';
    const requestedRatingMode =
        url.searchParams.get('rating') === 'adjusted' ? 'adjusted' : 'average';
    const publishedSeasonAdjustedFrom = Number(publication?.season_adjusted_from);
    const seasonAdjustedFrom =
        Number.isInteger(publishedSeasonAdjustedFrom) && publishedSeasonAdjustedFrom >= ADJUSTED_SEASON_FLOOR
            ? publishedSeasonAdjustedFrom
            : ADJUSTED_SEASON_FLOOR;
    const adjustedAvailable =
        selectedView === 'all-time' ||
        (selectedView === 'season' && selectedSeason >= seasonAdjustedFrom);
    const selectedRatingMode =
        selectedView === 'current' || !adjustedAvailable
            ? 'average'
            : requestedRatingMode;
    let players;
    let allTimeTotal = null;
    let allTimeHasMore = false;
    let isActivationFallback = false;

    if (selectedView === 'season') {
        players = selectedRatingMode === 'adjusted'
            ? await getWowyAdjustedSeasonPlayers(selectedSeason)
            : await getWowySeasonPlayers(selectedSeason);
    } else if (selectedView === 'current') {
        players = await getActiveWowyPlayers();
    } else {
        const page = selectedRatingMode === 'adjusted'
            ? await getWowyAdjustedAllTimePage()
            : await getWowyAllTimePage();
        players = page.players;
        allTimeTotal = page.totalCount;
        allTimeHasMore = page.hasMore;

        // Migration 012 deliberately returns no all-time rows until the
        // separate manual certification operation has committed its marker.
        // Keep the normal page useful during that safe intermediate state.
        if (selectedRatingMode === 'average' && !page.activated) {
            selectedView = 'current';
            players = await getActiveWowyPlayers();
            allTimeTotal = null;
            allTimeHasMore = false;
            isActivationFallback = true;
        }
    }

    if (isActivationFallback) {
        // This same URL must retry after certification rather than serving a
        // stale Current fallback from the browser or any CDN layer.
        setHeaders({
            'cache-control': 'no-store',
            'cdn-cache-control': 'no-store',
            'vercel-cdn-cache-control': 'no-store'
        });
    } else {
        setEdgeCache(setHeaders, {
            edgeSMaxAge: 300,
            swr: 3600,
            sie: 86400
        });
    }

    return {
        players,
        publication,
        seasons,
        selectedSeason,
        selectedView,
        selectedRatingMode,
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
    const adjusted = url.searchParams.get('rating') === 'adjusted';
    let request;
    if (season !== null) {
        if (season < 1947 || season > new Date().getUTCFullYear() + 1) return;
        request = adjusted && season >= ADJUSTED_SEASON_FLOOR
            ? getWowyAdjustedSeasonPlayers(season)
            : getWowySeasonPlayers(season);
    } else if (url.searchParams.get('view') === 'current' || seasonValue?.trim() === 'current') {
        request = getActiveWowyPlayers();
    } else {
        request = adjusted ? getWowyAdjustedAllTimePage() : getWowyAllTimePage();
    }
    request.catch(() => {});
}

function parseSeasonEndYear(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!/^\d{4}$/.test(normalized)) return null;

    const season = Number.parseInt(normalized, 10);
    return Number.isInteger(season) ? season : null;
}
