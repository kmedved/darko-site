import { getActivePlayers } from '$lib/server/supabase.js';
import { getLatestGameDate } from '$lib/server/daily.js';
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

    const [active, latestGame] = await Promise.all([getActivePlayers(), getLatestGameDate().catch(() => null)]);
    const players = projectPlayers(active, 'fantasy');
    // In season each player's latest row is dated his team's next game, so the latest of those is
    // days ahead for teams idle until then; the projections are as of the last game played.
    const asOf =
        latestGame ??
        players.reduce(
            (latest, player) => (typeof player.date === 'string' && player.date > latest ? player.date : latest),
            ''
        );

    return { players, asOf: asOf || null };
}
