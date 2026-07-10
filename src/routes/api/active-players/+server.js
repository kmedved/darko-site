import { json } from '@sveltejs/kit';

import { getActivePlayers } from '$lib/server/supabase.js';
import { ACTIVE_PLAYER_VIEWS, projectPlayers } from '$lib/server/playerViews.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function GET({ url, setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const team = url.searchParams.get('team')?.trim() || '';
    const requestedView = url.searchParams.get('view')?.trim() || '';
    const view = ACTIVE_PLAYER_VIEWS.includes(requestedView) ? requestedView : null;

    const players = await getActivePlayers(team ? { teamName: team } : {});
    const projected = projectPlayers(players, view);
    if (view === 'random') {
        const randomPlayer = projected[Math.floor(Math.random() * projected.length)];
        return json(randomPlayer ? [randomPlayer] : []);
    }
    return json(projected);
}
