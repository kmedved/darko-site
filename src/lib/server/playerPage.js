import { error } from '@sveltejs/kit';

const PLAYER_HISTORY_CACHE = {
    edgeSMaxAge: 3600,
    swr: 86400,
    sie: 86400
};

export function parsePlayerRouteId(nbaIdParam) {
    const nbaId = Number.parseInt(String(nbaIdParam || ''), 10);
    if (!Number.isInteger(nbaId) || nbaId <= 0) {
        error(400, 'Invalid nba_id');
    }

    return nbaId;
}

export async function loadPlayerPageData({
    nbaIdParam,
    setHeaders,
    setCacheHeaders,
    loadFullHistory
}) {
    const nbaId = parsePlayerRouteId(nbaIdParam);

    if (setHeaders && setCacheHeaders) {
        setCacheHeaders(setHeaders, PLAYER_HISTORY_CACHE);
    }

    const payload = await loadFullHistory(nbaId);
    const historyRows = Array.isArray(payload?.rows) ? payload.rows : [];

    if (historyRows.length === 0) {
        error(404, `Player ${nbaId} not found`);
    }

    return {
        nbaId,
        playerInfo: historyRows.at(-1) ?? null,
        historyRows,
        historyMeta: {
            truncated: Boolean(payload?.truncated),
            maxRows: payload?.maxRows ?? null
        }
    };
}
