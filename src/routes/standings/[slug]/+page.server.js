import { error } from '@sveltejs/kit';
import { getTeamPageData } from '$lib/server/supabase.js';
import { normalizeTeamSlug } from '$lib/utils/teamRouteUtils.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function load({ params, setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const teamName = normalizeTeamSlug(params.slug || '').trim();
    if (!teamName) {
        throw error(400, 'Team not specified');
    }

    const teamData = await getTeamPageData(teamName);

    return {
        teamName,
        ...teamData
    };
}
