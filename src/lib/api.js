async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok) {
        const message = (await response.text().catch(() => response.statusText)) || `Request failed (${response.status})`;
        throw new Error(message);
    }

    return response.json();
}

export function apiPlayerHistory(nbaId, { limit } = {}) {
    const id = Number.parseInt(nbaId, 10);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`Invalid nba_id: ${nbaId}`);
    }

    const qs = limit ? `?limit=${encodeURIComponent(String(limit))}` : '';
    return fetchJson(`/api/player/${id}/history${qs}`);
}

export function apiActivePlayers({ team } = {}) {
    const qs = new URLSearchParams();
    if (team) {
        qs.set('team', team);
    }

    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return fetchJson(`/api/active-players${suffix}`);
}

export function apiPlayersIndex() {
    return fetchJson('/api/players-index');
}
