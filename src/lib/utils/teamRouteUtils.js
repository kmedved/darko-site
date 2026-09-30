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
 * nothing. Map an abbreviation, a differently-cased or hyphenated name (new-york-knicks) or the
 * nickname alone (knicks, trail blazers) to the canonical name; anything else passes through
 * unchanged. A city alone (los angeles) names no team.
 */
export function canonicalTeamName(teamName = '') {
    const key = teamName.trim().toLowerCase().replace(/[-_\s]+/g, ' ');
    const match = key
        ? NBA_TEAMS.find((team) => {
              const name = team.name.toLowerCase();
              return team.abbr.toLowerCase() === key || name === key || name.endsWith(` ${key}`);
          })
        : null;
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
