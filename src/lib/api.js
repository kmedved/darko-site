async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok) {
        const message = (await response.text().catch(() => response.statusText)) || `Request failed (${response.status})`;
        throw new Error(message);
    }

    return response.json();
}

const activePlayersPromiseCache = new Map();

export function apiPlayerHistory(nbaId, { limit, full = false } = {}) {
    const id = Number.parseInt(nbaId, 10);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`Invalid nba_id: ${nbaId}`);
    }

    const qs = new URLSearchParams();
    if (full) {
        qs.set('full', '1');
    } else if (limit) {
        qs.set('limit', String(limit));
    }

    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return fetchJson(`/api/player/${id}/history${suffix}`);
}

export function apiActivePlayers({ team } = {}) {
    const normalizedTeam = typeof team === 'string' ? team.trim() : '';
    const cacheKey = normalizedTeam || '__all__';
    const cached = activePlayersPromiseCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const qs = new URLSearchParams();
    if (normalizedTeam) {
        qs.set('team', normalizedTeam);
    }

    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const request = fetchJson(`/api/active-players${suffix}`).catch((error) => {
        activePlayersPromiseCache.delete(cacheKey);
        throw error;
    });
    activePlayersPromiseCache.set(cacheKey, request);
    return request;
}

export function apiPlayersIndex() {
    return fetchJson('/api/players-index');
}

export function apiLongevity() {
    return fetchJson('/api/longevity');
}

export function apiPlayerLongevity(nbaId) {
    const id = Number.parseInt(nbaId, 10);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`Invalid nba_id: ${nbaId}`);
    }
    return fetchJson(`/api/player/${id}/longevity`);
}

export function apiSearchPlayers(query) {
    const q = String(query || '').trim();
    const qs = new URLSearchParams({ q });
    return fetchJson(`/api/search-players?${qs}`);
}
