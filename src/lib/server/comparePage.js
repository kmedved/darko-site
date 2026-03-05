function resolveHistoryRows(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.rows)) {
        return payload.rows;
    }

    return [];
}

export function parseCompareIds(rawIds) {
    if (!rawIds) {
        return [];
    }

    const seen = new Set();
    const ids = [];

    for (const value of String(rawIds).split(',')) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) {
            continue;
        }

        seen.add(parsed);
        ids.push(parsed);

        if (ids.length === 4) {
            break;
        }
    }

    return ids;
}

export async function loadComparePageData({
    rawIds,
    loadFullHistory,
    buildComparePlayer,
    getComparePlayerColors
}) {
    const ids = parseCompareIds(rawIds);
    if (ids.length === 0) {
        return {
            preloadedPlayers: [],
            notice: null
        };
    }

    const colors = getComparePlayerColors();
    const results = await Promise.allSettled(ids.map((id) => loadFullHistory(id)));
    const preloadedPlayers = [];
    const failures = [];

    for (const [index, result] of results.entries()) {
        const id = ids[index];

        if (result.status !== 'fulfilled') {
            failures.push(String(id));
            continue;
        }

        const rows = resolveHistoryRows(result.value);
        if (rows.length === 0) {
            failures.push(String(id));
            continue;
        }

        const currentRow = rows.at(-1) ?? {};
        preloadedPlayers.push(
            buildComparePlayer({
                currentRow,
                rows,
                color: colors[preloadedPlayers.length % colors.length]
            })
        );
    }

    return {
        preloadedPlayers,
        notice:
            failures.length > 0
                ? `Some requested players could not be loaded: ${failures.join(', ')}`
                : null
    };
}
