import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { getPlayerComps, getPlayerEchoes } from '$lib/server/comps.js';
import { getPlayerSeasons } from '$lib/server/daily.js';
import { loadPlayerPageData, parsePlayerRouteId } from '$lib/server/playerPage.js';
import { packRows } from '$lib/utils/columnar.js';
import { getActivePlayers, getFullPlayerProfileHistory, MAX_FULL_HISTORY_ROWS } from '$lib/server/supabase.js';
import { echoRows } from '$lib/utils/playerSeasons.js';
import { dpmRank } from '$lib/utils/playerProfile.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function load({ params, setHeaders }) {
    // Comps, echoes and seasons are side panels: without them the page still loads.
    const nbaId = parsePlayerRouteId(params.nbaId);
    const sidePanel = (label, promise) =>
        promise.catch((error) => {
            console.error(`player ${label} failed`, error);
            return [];
        });
    const comps = sidePanel('comps', getPlayerComps(nbaId));
    const seasons = sidePanel('seasons', getPlayerSeasons(nbaId).then((rows) => rows ?? []));
    // Named from the active leaderboard, which every comped player is on.
    const echoes = sidePanel(
        'echoes',
        Promise.all([getPlayerEchoes(nbaId), getActivePlayers()]).then(([rows, active]) =>
            echoRows(rows, new Map(active.map((player) => [Number(player.nba_id), player])))
        )
    );
    // "#4 of 530" in the header, for players on today's board.
    const rank = getActivePlayers()
        .then((active) => dpmRank(nbaId, active))
        .catch((error) => {
            console.error('player rank failed', error);
            return null;
        });
    const { historyRows, ...page } = await loadPlayerPageData({
        nbaIdParam: params.nbaId,
        setHeaders,
        setCacheHeaders: setEdgeCache,
        loadFullHistory: (nbaId) =>
            getFullPlayerProfileHistory(nbaId, {
                maxRows: MAX_FULL_HISTORY_ROWS
            })
    });
    // The career history ships column by column; the page rebuilds the rows.
    return {
        ...page,
        history: packRows(historyRows),
        comps: await comps,
        seasons: await seasons,
        echoes: await echoes,
        dpmRank: await rank
    };
}
