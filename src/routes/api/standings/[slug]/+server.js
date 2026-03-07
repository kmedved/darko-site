import { error, json } from '@sveltejs/kit';

import {
    getTeamPagePayload,
    setTeamPageCacheHeaders
} from '$lib/server/teamPage.js';
import { normalizeTeamSlug } from '$lib/utils/teamRouteUtils.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ params, setHeaders }) {
    setTeamPageCacheHeaders(setHeaders);

    try {
        const payload = await getTeamPagePayload({
            rawTeamParam: params.slug,
            normalizeTeamParam: normalizeTeamSlug
        });
        return json(payload);
    } catch (e) {
        if (e?.status === 400) {
            throw e;
        }
        throw error(500, e?.message || 'Failed to load team data');
    }
}
