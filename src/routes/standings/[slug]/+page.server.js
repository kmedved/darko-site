import { loadTeamPageData } from '$lib/server/teamPage.js';
import { normalizeTeamSlug } from '$lib/utils/teamRouteUtils.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function load({ params, setHeaders }) {
    return loadTeamPageData({
        rawTeamParam: params.slug,
        normalizeTeamParam: normalizeTeamSlug,
        setHeaders
    });
}
