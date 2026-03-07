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
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (normalizedQuery.length < PLAYER_SEARCH_MIN_QUERY_LENGTH) {
        return [];
    }

    const matchingPlayers = (players || []).filter((player) =>
        String(player?.player_name || '').toLowerCase().includes(normalizedQuery)
    );

    return filterExcludedPlayers(matchingPlayers, exclude, limit);
}
