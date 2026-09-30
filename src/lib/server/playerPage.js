import { error } from '@sveltejs/kit';

import { withLatestTeam } from '../utils/latestTeam.js';

const PLAYER_HISTORY_CACHE = {
    edgeSMaxAge: 3600,
    swr: 86400,
    sie: 86400
};

/**
 * A player's id from the URL: digits only, no leading zero. Anything else (abc, 0, -5, or a
 * decimal that would load the same player at a second address) has no page.
 */
export function parsePlayerRouteId(nbaIdParam) {
    const raw = String(nbaIdParam ?? '');
    if (!/^[1-9]\d{0,9}$/.test(raw)) {
        error(404, 'Player not found');
    }

    return Number(raw);
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
        playerInfo: withLatestTeam(payload?.playerInfo ?? historyRows.at(-1) ?? null, historyRows),
        historyRows,
        historyMeta: {
            truncated: Boolean(payload?.truncated),
            maxRows: payload?.maxRows ?? null
        }
    };
}
