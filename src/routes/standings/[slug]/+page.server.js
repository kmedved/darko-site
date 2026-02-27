import { error } from '@sveltejs/kit';
import { getTeamPageData } from '$lib/supabase.js';
import { normalizeTeamSlug } from '$lib/utils/teamRouteUtils.js';

export async function load({ params, setHeaders }) {
    setHeaders({
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
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
