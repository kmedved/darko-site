import { loadTeamPageData } from '$lib/server/teamPage.js';
import { decodeTeamParam } from '$lib/utils/teamRouteUtils.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function load({ params, setHeaders }) {
    return loadTeamPageData({
        rawTeamParam: params.team,
        normalizeTeamParam: decodeTeamParam,
        setHeaders
    });
}
