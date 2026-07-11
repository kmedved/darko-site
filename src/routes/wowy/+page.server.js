import {
    getActiveWowyPlayers,
    getWowyAllTimePlayers,
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
    let players;
    let isActivationFallback = false;

    if (selectedView === 'season') {
        players = await getWowySeasonPlayers(selectedSeason);
    } else if (selectedView === 'current') {
        players = await getActiveWowyPlayers();
    } else {
        players = await getWowyAllTimePlayers();

        // Migration 012 deliberately returns no all-time rows until the
        // separate manual certification operation has committed its marker.
        // Keep the normal page useful during that safe intermediate state.
        if (players.length === 0) {
            selectedView = 'current';
            players = await getActiveWowyPlayers();
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

    return { players, publication, seasons, selectedSeason, selectedView };
}

function parseSeasonEndYear(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!/^\d{4}$/.test(normalized)) return null;

    const season = Number.parseInt(normalized, 10);
    return Number.isInteger(season) ? season : null;
}
