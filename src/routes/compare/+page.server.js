import { loadComparePageData } from '$lib/server/comparePage.js';
import { buildComparePlayer, getComparePlayerColors } from '$lib/utils/compareUtils.js';
import { getFullPlayerHistory, MAX_FULL_HISTORY_ROWS } from '$lib/server/supabase.js';
import { getPlayerSeasons } from '$lib/server/daily.js';
import { displayHistory } from '$lib/server/historyDisplay.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function load({ url }) {
    return loadComparePageData({
        rawIds: url.searchParams.get('ids'),
        loadFullHistory: async (nbaId) =>
            displayHistory(await getFullPlayerHistory(nbaId, {
                maxRows: MAX_FULL_HISTORY_ROWS
            })),
        buildComparePlayer,
        getComparePlayerColors,
        loadSeasons: getPlayerSeasons
    });
}
