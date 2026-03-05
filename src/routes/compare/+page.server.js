import { loadComparePageData } from '$lib/server/comparePage.js';
import { buildComparePlayer, getComparePlayerColors } from '$lib/utils/compareUtils.js';
import { getFullPlayerHistory, MAX_FULL_HISTORY_ROWS } from '$lib/server/supabase.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function load({ url }) {
    return loadComparePageData({
        rawIds: url.searchParams.get('ids'),
        loadFullHistory: (nbaId) =>
            getFullPlayerHistory(nbaId, {
                maxRows: MAX_FULL_HISTORY_ROWS
            }),
        buildComparePlayer,
        getComparePlayerColors
    });
}
