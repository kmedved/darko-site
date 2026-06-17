export const ACTIVE_PLAYERS_CACHE_KEY = 'activePlayers:all';

export function filterActivePlayersByTeam(activePlayers, teamName) {
    const normalizedTeam = (teamName || '').trim();
    if (!normalizedTeam) {
        return activePlayers || [];
    }

    return (activePlayers || []).filter((row) => {
        const rowTeam = String(row.team_name || '').trim();
        return rowTeam === normalizedTeam;
    });
}

export function createActivePlayersAccessor({
    loadAllActivePlayers,
    runCached,
    maxAgeMs
}) {
    if (typeof loadAllActivePlayers !== 'function') {
        throw new TypeError('loadAllActivePlayers must be a function');
    }
    if (typeof runCached !== 'function') {
        throw new TypeError('runCached must be a function');
    }

    async function getActivePlayers(options = {}) {
        const normalizedTeam = (options.teamName || '').trim();
        if (normalizedTeam) {
            const activePlayers = await getActivePlayers();
            return filterActivePlayersByTeam(activePlayers, normalizedTeam);
        }

        return runCached(ACTIVE_PLAYERS_CACHE_KEY, maxAgeMs, loadAllActivePlayers);
    }

    return getActivePlayers;
}
