import { error, json } from '@sveltejs/kit';

import { getRookieStarts } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

/** Where DARKO started each player of a draft class: ?year=2025. */
export async function GET({ url, setHeaders }) {
    const year = Number(url.searchParams.get('year'));
    if (!Number.isInteger(year) || year < 1996 || year > 2100) throw error(400, 'Invalid draft year');
    try {
        const players = await getRookieStarts(year);
        setEdgeCache(setHeaders, { edgeSMaxAge: 3600, swr: 86400, sie: 86400 });
        return json({ year, players });
    } catch (e) {
        throw error(500, e?.message || 'Failed to load the draft class');
    }
}
