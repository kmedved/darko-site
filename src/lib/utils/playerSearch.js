import { searchByName } from './nameSearch.js';

export const PLAYER_SEARCH_MIN_QUERY_LENGTH = 2;
export const PLAYER_SEARCH_RESULTS_LIMIT = 8;

export function normalizePlayerId(value) {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isInteger(parsed) ? parsed : null;
}

export function filterExcludedPlayers(
    players,
    exclude = [],
    limit = PLAYER_SEARCH_RESULTS_LIMIT
) {
    const excludeSet = new Set(
        (exclude || []).map(normalizePlayerId).filter((id) => id !== null)
    );

    return (players || [])
        .filter((player) => !excludeSet.has(normalizePlayerId(player?.nba_id)))
        .slice(0, limit);
}

export function filterPlayerSearchResults(
    players,
    query,
    exclude = [],
    limit = PLAYER_SEARCH_RESULTS_LIMIT
) {
    const normalizedQuery = String(query || '').trim();
    if (normalizedQuery.length < PLAYER_SEARCH_MIN_QUERY_LENGTH) {
        return [];
    }

    // Accents, word order, initials and typos forgiven (nameSearch.js); better players first at
    // equal strength.
    const matchingPlayers = searchByName(players, normalizedQuery, {
        rank: (player) => {
            const dpm = Number.parseFloat(player?.dpm);
            return Number.isFinite(dpm) ? dpm : -99;
        }
    });

    return filterExcludedPlayers(matchingPlayers, exclude, limit);
}
