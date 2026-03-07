import { error } from '@sveltejs/kit';

import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { getTeamPageData } from '$lib/server/supabase.js';

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

    return teamName;
}

export async function getTeamPagePayload({
    rawTeamParam,
    normalizeTeamParam
}) {
    const teamName = resolveTeamPageName(rawTeamParam, normalizeTeamParam);
    const teamData = await getTeamPageData(teamName);

    return {
        teamName,
        ...teamData
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
