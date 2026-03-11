import {
    LINEUP_SIZE_CONFIG,
    DEFAULT_LINEUP_SIZE
} from './lineupRatings.js';

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
    loadLineupRatings,
    lineupSize = DEFAULT_LINEUP_SIZE
}) {
    const sizeConfig = LINEUP_SIZE_CONFIG[lineupSize] ?? LINEUP_SIZE_CONFIG[DEFAULT_LINEUP_SIZE];
    const minPoss = sizeConfig.minPoss;

    const lineupsByVariant = normalizeLineupsByVariant(
        await loadLineupRatings({ lineupSize, minPoss })
    );

    return {
        lineupsByVariant,
        defaultVariant: 'pi',
        lineupSize,
        minPoss
    };
}

export async function loadLineupsPageData({
    setHeaders,
    setCacheHeaders,
    loadLineupRatings,
    lineupSize = DEFAULT_LINEUP_SIZE
}) {
    if (setHeaders && setCacheHeaders) {
        setCacheHeaders(setHeaders, LINEUPS_PAGE_CACHE);
    }

    return getLineupsPagePayload({
        loadLineupRatings,
        lineupSize
    });
}
