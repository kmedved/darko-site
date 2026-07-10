import { getActivePlayers } from '$lib/server/supabase.js';
import { projectPlayers } from '$lib/server/playerViews.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function load({ setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const players = projectPlayers(await getActivePlayers(), 'leaderboard');

    return {
        players: players.map((player, index) => ({
            ...player,
            _rank: index + 1
        }))
    };
}
