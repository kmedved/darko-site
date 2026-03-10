export const LINEUPS_PAGE_CACHE = Object.freeze({
    edgeSMaxAge: 3600,
    swr: 86400,
    sie: 86400
});

function normalizeLineupsByVariant(payload) {
    return {
        pi: Array.isArray(payload?.pi) ? payload.pi : [],
        npi: Array.isArray(payload?.npi) ? payload.npi : []
    };
}

export async function getLineupsPagePayload({
    loadLineupRatings
}) {
    const lineupsByVariant = normalizeLineupsByVariant(await loadLineupRatings());

    return {
        lineupsByVariant,
        defaultVariant: 'pi'
    };
}

export async function loadLineupsPageData({
    setHeaders,
    setCacheHeaders,
    loadLineupRatings
}) {
    if (setHeaders && setCacheHeaders) {
        setCacheHeaders(setHeaders, LINEUPS_PAGE_CACHE);
    }

    return getLineupsPagePayload({
        loadLineupRatings
    });
}
