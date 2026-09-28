import { NBA_TEAMS } from './teamAbbreviations.js';

export function decodeTeamParam(value = '') {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function normalizeTeamSlug(value = '') {
    return decodeTeamParam(value)
        .replace(/_/g, ' ')
        .trim();
}

/**
 * Team pages query by full team name, so /team/OKC or /team/oklahoma city thunder would find
 * nothing. Map an abbreviation or a differently-cased name to the canonical name; anything else
 * passes through unchanged.
 */
export function canonicalTeamName(teamName = '') {
    const key = teamName.trim().toLowerCase();
    const match = NBA_TEAMS.find((team) => team.abbr.toLowerCase() === key || team.name.toLowerCase() === key);
    return match ? match.name : teamName;
}

/**
 * The canonical name of one of the 30 teams, or null. The data names every season's teams by
 * today's franchises (a 2005 Sonics row says Oklahoma City Thunder), so any other name has no page.
 */
export function knownTeamName(teamName = '') {
    const canonical = canonicalTeamName(teamName);
    return NBA_TEAMS.some((team) => team.name === canonical) ? canonical : null;
}
