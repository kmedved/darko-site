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

export async function getLineupsPagePayload({
    loadLineupRatings,
    lineupSize = DEFAULT_LINEUP_SIZE
}) {
    const {
        lineupSize: resolvedLineupSize,
        config: sizeConfig
    } = resolveLineupSizeConfig(lineupSize);
    const minPoss = sizeConfig.minPoss;
    const sizePayloads = await Promise.all(
        VALID_LINEUP_SIZES.map(async (size) => {
            const config = LINEUP_SIZE_CONFIG[size] ?? LINEUP_SIZE_CONFIG[DEFAULT_LINEUP_SIZE];
            const lineupsByVariant = normalizeLineupsByVariant(
                await loadLineupRatings({ lineupSize: size, minPoss: config.minPoss })
            );

            return {
                lineupSize: size,
                label: config.label,
                minPoss: config.minPoss,
                lineupsByVariant
            };
        })
    );
    const lineupsBySize = Object.fromEntries(
        sizePayloads.map((payload) => [payload.lineupSize, payload.lineupsByVariant])
    );
    const lineupsByVariant = lineupsBySize[resolvedLineupSize] ?? {
        pi: [],
        npi: []
    };
    const lineupSizeSummaries = sizePayloads.map((payload) => ({
        lineupSize: payload.lineupSize,
        label: payload.label,
        minPoss: payload.minPoss,
        piCount: payload.lineupsByVariant.pi.length,
        npiCount: payload.lineupsByVariant.npi.length
    }));

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
