import { error, json } from '@sveltejs/kit';

import { getWowyPublication } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 300,
        swr: 3600,
        sie: 86400
    });

    try {
        const publication = await getWowyPublication();
        if (!publication) throw error(404, 'WOWY publication not found');
        return json(publication);
    } catch (cause) {
        if (cause?.status === 404) throw cause;
        throw error(500, cause?.message || 'Failed to load WOWY publication');
    }
}
