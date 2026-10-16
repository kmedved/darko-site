import { careerShareMetadata } from '$lib/server/charts/share.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { getPlayerComps } from '$lib/server/comps.js';
import { getPlayerSeasons } from '$lib/server/daily.js';
import { loadPlayerPageData, parsePlayerRouteId } from '$lib/server/playerPage.js';
import { packRows } from '$lib/utils/columnar.js';
import { getActivePlayers, getFullPlayerProfileHistory, MAX_FULL_HISTORY_ROWS } from '$lib/server/supabase.js';
import { currentPlayerComps } from '$lib/utils/currentPlayerComps.js';
import { dpmRank } from '$lib/utils/playerProfile.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

export async function load({ params, setHeaders }) {
    // Comps and seasons are side panels: without them the page still loads.
    const nbaId = parsePlayerRouteId(params.nbaId);
    const sidePanel = (label, promise) =>
        promise.catch((error) => {
            console.error(`player ${label} failed`, error);
            return [];
        });
    const active = sidePanel('active players', getActivePlayers());
    const comps = sidePanel('comps', getPlayerComps(nbaId));
    const seasons = sidePanel('seasons', getPlayerSeasons(nbaId).then((rows) => rows ?? []));
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
    const shareUrl = new URL(`/player/${nbaId}?ids=${nbaId}`, 'https://www.darko.app');
    const social = await careerShareMetadata(shareUrl, { title: `${page.playerInfo.player_name} — DARKO`, description: `Explore ${page.playerInfo.player_name}'s DARKO NBA ratings and career history.` });
    social.url = `https://www.darko.app/player/${nbaId}`;
    return {
        ...page, social,
        history: packRows(historyRows),
        comps: await comps,
        seasons: await seasons,
        currentComps: currentPlayerComps(page.playerInfo, await active),
        dpmRank: dpmRank(nbaId, await active)
    };
}
