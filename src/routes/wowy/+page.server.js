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

export async function load({ url, setHeaders }) {
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
        Number.isInteger(publishedSeasonAdjustedFrom) && publishedSeasonAdjustedFrom >= 1978
            ? publishedSeasonAdjustedFrom
            : 1978;
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

function parseSeasonEndYear(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!/^\d{4}$/.test(normalized)) return null;

    const season = Number.parseInt(normalized, 10);
    return Number.isInteger(season) ? season : null;
}
