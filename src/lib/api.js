async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok) {
        const message = (await response.text().catch(() => response.statusText)) || `Request failed (${response.status})`;
        throw new Error(message);
    }

    return response.json();
}

const activePlayersPromiseCache = new Map();
export const ACTIVE_PLAYERS_CACHE_TTL_MS = 5 * 60 * 1000;

export async function apiPlayerHistory(nbaId, { limit, full = false, includeMetadata = false } = {}) {
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
    const payload = await fetchJson(`/api/player/${id}/history${suffix}`);

    if (!full) {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.rows)) return payload.rows;
        return [];
    }

    if (includeMetadata) {
        if (Array.isArray(payload)) {
            return {
                rows: payload,
                truncated: false,
                maxRows: null
            };
        }
        if (payload && typeof payload === 'object') {
            return payload;
        }
        return {
            rows: [],
            truncated: false,
            maxRows: null
        };
    }

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.rows)) return payload.rows;
    return [];
}

export function apiActivePlayers({ team } = {}) {
    const normalizedTeam = typeof team === 'string' ? team.trim() : '';
    const cacheKey = normalizedTeam || '__all__';
    const cached = activePlayersPromiseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.promise;
    }

    if (cached) {
        activePlayersPromiseCache.delete(cacheKey);
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
    activePlayersPromiseCache.set(cacheKey, {
        promise: request,
        expiresAt: Date.now() + ACTIVE_PLAYERS_CACHE_TTL_MS
    });
    return request;
}

export function __resetApiCachesForTests() {
    activePlayersPromiseCache.clear();
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

export async function apiRateVote(winnerId, loserId) {
    const response = await fetch('/api/rate/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_id: winnerId, loser_id: loserId })
    });

    if (!response.ok) {
        const message =
            (await response.text().catch(() => response.statusText)) ||
            `Vote failed (${response.status})`;
        throw new Error(message);
    }

    return response.json();
}

export function apiRateLeaderboard(limit = 50) {
    return fetchJson(`/api/rate/leaderboard?limit=${limit}`);
}
