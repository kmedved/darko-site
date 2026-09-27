import {
    LINEUP_SIZE_CONFIG,
    DEFAULT_LINEUP_SIZE,
    VALID_LINEUP_SIZES
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

function resolveLineupSizeConfig(lineupSize) {
    const parsedLineupSize = Number(lineupSize);
    const resolvedLineupSize = LINEUP_SIZE_CONFIG[parsedLineupSize]
        ? parsedLineupSize
        : DEFAULT_LINEUP_SIZE;

    return {
        lineupSize: resolvedLineupSize,
        config: LINEUP_SIZE_CONFIG[resolvedLineupSize] ?? LINEUP_SIZE_CONFIG[DEFAULT_LINEUP_SIZE]
    };
}

/**
 * Rows for the selected lineup size only; the other sizes contribute their counts, which the size
 * tabs show. Loading every size's rows just to count them tripled a cold load.
 */
export async function getLineupsPagePayload({
    loadLineupRatings,
    loadLineupSizeCounts,
    lineupSize = DEFAULT_LINEUP_SIZE
}) {
    const {
        lineupSize: resolvedLineupSize,
        config: sizeConfig
    } = resolveLineupSizeConfig(lineupSize);
    const minPoss = sizeConfig.minPoss;
    const [selectedPayload, sizeCounts] = await Promise.all([
        loadLineupRatings({ lineupSize: resolvedLineupSize, minPoss }),
        loadLineupSizeCounts ? loadLineupSizeCounts() : null
    ]);
    const lineupsByVariant = normalizeLineupsByVariant(selectedPayload);
    const lineupSizeSummaries = VALID_LINEUP_SIZES.map((size) => {
        const config = LINEUP_SIZE_CONFIG[size] ?? LINEUP_SIZE_CONFIG[DEFAULT_LINEUP_SIZE];
        const counts = size === resolvedLineupSize
            ? { pi: lineupsByVariant.pi.length, npi: lineupsByVariant.npi.length }
            : sizeCounts?.[size];

        return {
            lineupSize: size,
            label: config.label,
            minPoss: config.minPoss,
            piCount: counts?.pi ?? 0,
            npiCount: counts?.npi ?? 0
        };
    });

    return {
        lineupsByVariant,
        lineupSizeSummaries,
        defaultVariant: 'pi',
        lineupSize: resolvedLineupSize,
        minPoss
    };
}

export async function loadLineupsPageData({
    setHeaders,
    setCacheHeaders,
    loadLineupRatings,
    loadLineupSizeCounts,
    lineupSize = DEFAULT_LINEUP_SIZE
}) {
    if (setHeaders && setCacheHeaders) {
        setCacheHeaders(setHeaders, LINEUPS_PAGE_CACHE);
    }

    return getLineupsPagePayload({
        loadLineupRatings,
        loadLineupSizeCounts,
        lineupSize
    });
}
