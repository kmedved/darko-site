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

    const players = projectPlayers(await getActivePlayers(), 'fantasy');
    const asOf = players.reduce(
        (latest, player) => (typeof player.date === 'string' && player.date > latest ? player.date : latest),
        ''
    );

    return { players, asOf: asOf || null };
}
