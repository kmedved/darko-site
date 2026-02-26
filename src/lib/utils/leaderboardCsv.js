export function buildLeaderboardCsvRows(sortedPlayers = []) {
    return (sortedPlayers || []).map((player, index) => ({ ...player, rank: index + 1 }));
}

