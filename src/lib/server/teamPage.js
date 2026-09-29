import { error } from '@sveltejs/kit';

import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { getLatestGameDate } from '$lib/server/daily.js';
import { getTeamPageData } from '$lib/server/supabase.js';
import { knownTeamName } from '$lib/utils/teamRouteUtils.js';

export const TEAM_PAGE_CACHE = Object.freeze({
    edgeSMaxAge: 3600,
    swr: 86400,
    sie: 86400
});

export function setTeamPageCacheHeaders(setHeaders) {
    setEdgeCache(setHeaders, TEAM_PAGE_CACHE);
}

export function resolveTeamPageName(rawTeamParam, normalizeTeamParam) {
    const teamName = normalizeTeamParam(rawTeamParam || '').trim();
    if (!teamName) {
        throw error(400, 'Team not specified');
    }

    const known = knownTeamName(teamName);
    if (!known) {
        throw error(404, 'Team not found');
    }
    return known;
}

export async function getTeamPagePayload({
    rawTeamParam,
    normalizeTeamParam
}) {
    const teamName = resolveTeamPageName(rawTeamParam, normalizeTeamParam);
    // The rating says how fresh it is: the last game its players' ratings take in.
    const [teamData, ratingsThrough] = await Promise.all([getTeamPageData(teamName), getLatestGameDate()]);

    return {
        teamName,
        ...teamData,
        ratingsThrough
    };
}

export async function loadTeamPageData({
    rawTeamParam,
    normalizeTeamParam,
    setHeaders
}) {
    setTeamPageCacheHeaders(setHeaders);

    return getTeamPagePayload({
        rawTeamParam,
        normalizeTeamParam
    });
}
