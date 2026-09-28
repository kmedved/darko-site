import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { loadLineupsPageData } from '$lib/server/lineupsPage.js';
import { getLineupRatings, getLineupSizeCounts, getLineupsComputedOn } from '$lib/server/supabase.js';
import { packLineups } from '$lib/utils/lineupTransport.js';
import { VALID_LINEUP_SIZES, DEFAULT_LINEUP_SIZE } from '$lib/server/lineupRatings.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

/** @type {import('./$types').PageServerLoad} */
export async function load({ url, setHeaders }) {
    const rawSize = Number(url.searchParams.get('size'));
    const lineupSize = VALID_LINEUP_SIZES.includes(rawSize) ? rawSize : DEFAULT_LINEUP_SIZE;

    const [payload, computedOn] = await Promise.all([
        loadLineupsPageData({
            setHeaders,
            setCacheHeaders: setEdgeCache,
            loadLineupRatings: (opts) => getLineupRatings(opts),
            loadLineupSizeCounts: () => getLineupSizeCounts(),
            lineupSize
        }),
        getLineupsComputedOn()
    ]);
    return {
        ...payload,
        computedOn,
        lineupsByVariant: packLineups(payload.lineupsByVariant, payload.lineupSize)
    };
}
