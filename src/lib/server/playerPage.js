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

// Four decimals keep every chart and table exact to display precision while trimming the
// long float tails that dominate a career history's compressed size.
function roundHistoryValue(value) {
    return typeof value === 'number' && !Number.isInteger(value) ? Math.round(value * 1e4) / 1e4 : value;
}

export function compactHistoryRow(row) {
    const compact = {};
    for (const [key, value] of Object.entries(row)) compact[key] = roundHistoryValue(value);
    return compact;
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
    const historyRows = Array.isArray(payload?.rows) ? payload.rows.map(compactHistoryRow) : [];

    if (historyRows.length === 0) {
        error(404, `Player ${nbaId} not found`);
    }

    return {
        nbaId,
        playerInfo: payload?.playerInfo ?? historyRows.at(-1) ?? null,
        historyRows,
        historyMeta: {
            truncated: Boolean(payload?.truncated),
            maxRows: payload?.maxRows ?? null
        }
    };
}
