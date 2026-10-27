import { getActivePlayers } from '$lib/server/supabase.js';
import { getLatestGameDate } from '$lib/server/daily.js';
import { AS_OF_EDGE_CACHE, getFantasyPlayersOnDate } from '$lib/server/history.js';
import { projectPlayers } from '$lib/server/playerViews.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { AS_OF_PARAM, parseAsOfDate } from '$lib/utils/timeMachine.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

// Today's projections, or every player's as of the Time Machine date (history: null today).
export async function load({ url, setHeaders }) {
    const asOfDate = parseAsOfDate(url.searchParams.get(AS_OF_PARAM));
    setEdgeCache(setHeaders, asOfDate ? AS_OF_EDGE_CACHE : { edgeSMaxAge: 3600, swr: 86400, sie: 86400 });

    if (asOfDate) {
        const result = await getFantasyPlayersOnDate(asOfDate);
        return {
            players: projectPlayers(result.rows, 'fantasy'),
            asOf: result.dataDate,
            history: {
                date: asOfDate,
                season: result.season,
                pastRegularSeason: result.pastRegularSeason
            }
        };
    }

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

    return { players, asOf: asOf || null, history: null };
}
