export const LINEUP_QUERY_VARIANTS = Object.freeze(['pi', 'raw', 'npi']);
export const LINEUP_MIN_POSSESSIONS = 100;
export const TEAM_PENDING_LABEL = 'Team pending';

const PLAYER_NAME_KEYS = ['player_1', 'player_2', 'player_3', 'player_4', 'player_5'];
const PLAYER_ID_KEYS = ['player_1_id', 'player_2_id', 'player_3_id', 'player_4_id', 'player_5_id'];

function toFiniteNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
}

function getPlayerNames(row = {}) {
    return PLAYER_NAME_KEYS.map((key) => normalizeText(row?.[key]));
}

function getPlayerIdentity(row = {}) {
    const idParts = PLAYER_ID_KEYS
        .map((key) => row?.[key])
        .filter((value) => value !== null && value !== undefined && value !== '')
        .map((value) => String(value).trim())
        .filter(Boolean);

    if (idParts.length > 0) {
        return `ids:${idParts.join(':')}`;
    }

    const nameParts = getPlayerNames(row).filter(Boolean);
    if (nameParts.length > 0) {
        return `names:${nameParts.join('|')}`;
    }

    const possessions = toFiniteNumber(row?.min_season_poss);
    const totalNet = toFiniteNumber(row?.total_net_rating);
    return `fallback:${possessions ?? 'na'}:${totalNet ?? 'na'}`;
}

function getSourcePriority(rawVariant, normalizedVariant) {
    if (normalizedVariant !== 'npi') {
        return 1;
    }

    const normalizedSource = normalizeLineupVariant(rawVariant);
    if (normalizedSource === 'npi' && String(rawVariant || '').trim().toLowerCase() === 'npi') {
        return 3;
    }

    if (normalizedSource === 'npi') {
        return 2;
    }

    return 1;
}

export function normalizeLineupVariant(variant) {
    const normalized = String(variant || '').trim().toLowerCase();
    if (normalized === 'pi') {
        return 'pi';
    }

    if (normalized === 'raw' || normalized === 'npi') {
        return 'npi';
    }

    return null;
}

export function normalizeLineupRow(row = {}) {
    const variant = normalizeLineupVariant(row?.variant);
    if (!variant) {
        return null;
    }

    const possessions = toFiniteNumber(row?.min_season_poss);
    const netPm = toFiniteNumber(row?.total_net_rating);
    const offPm = toFiniteNumber(row?.total_off_rating);
    const defPm = toFiniteNumber(row?.total_def_rating);

    if (
        !Number.isFinite(possessions) ||
        possessions <= LINEUP_MIN_POSSESSIONS ||
        !Number.isFinite(netPm) ||
        !Number.isFinite(offPm) ||
        !Number.isFinite(defPm)
    ) {
        return null;
    }

    const players = getPlayerNames(row);
    const lineupLabel = players.filter(Boolean).join(', ') || 'Unnamed lineup';
    const identity = getPlayerIdentity(row);

    return {
        row_key: `${variant}:${identity}`,
        variant,
        lineup_label: lineupLabel,
        team_name: normalizeText(row?.team_name) ?? TEAM_PENDING_LABEL,
        possessions,
        net_pm: netPm,
        off_pm: offPm,
        def_pm: defPm,
        player_1: players[0],
        player_2: players[1],
        player_3: players[2],
        player_4: players[3],
        player_5: players[4]
    };
}

export function groupLineupRows(rows = []) {
    const grouped = {
        pi: [],
        npi: []
    };
    const seen = {
        pi: new Map(),
        npi: new Map()
    };

    for (const row of rows || []) {
        const normalizedRow = normalizeLineupRow(row);
        if (!normalizedRow) {
            continue;
        }

        const bucket = normalizedRow.variant;
        const identity = getPlayerIdentity(row);
        const priority = getSourcePriority(row?.variant, bucket);
        const existing = seen[bucket].get(identity);

        if (!existing) {
            seen[bucket].set(identity, {
                index: grouped[bucket].length,
                priority
            });
            grouped[bucket].push(normalizedRow);
            continue;
        }

        if (priority > existing.priority) {
            grouped[bucket][existing.index] = normalizedRow;
            seen[bucket].set(identity, {
                index: existing.index,
                priority
            });
        }
    }

    return grouped;
}
