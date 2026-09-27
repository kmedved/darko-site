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
