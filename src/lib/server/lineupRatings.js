export const LINEUP_QUERY_VARIANTS = Object.freeze(['pi', 'raw', 'npi']);
export const LINEUP_MIN_POSSESSIONS = 100;
export const TEAM_PENDING_LABEL = 'Team pending';

const PLAYER_NAME_KEYS = ['player_1', 'player_2', 'player_3', 'player_4', 'player_5'];
const PLAYER_ID_KEYS = ['player_1_id', 'player_2_id', 'player_3_id', 'player_4_id', 'player_5_id'];
const PLAYER_SLOTS = [1, 2, 3, 4, 5];

const TM_ID_TO_NAME = {
    1610612737: 'Atlanta Hawks',
    1610612738: 'Boston Celtics',
    1610612751: 'Brooklyn Nets',
    1610612766: 'Charlotte Hornets',
    1610612741: 'Chicago Bulls',
    1610612739: 'Cleveland Cavaliers',
    1610612742: 'Dallas Mavericks',
    1610612743: 'Denver Nuggets',
    1610612765: 'Detroit Pistons',
    1610612744: 'Golden State Warriors',
    1610612745: 'Houston Rockets',
    1610612754: 'Indiana Pacers',
    1610612746: 'Los Angeles Clippers',
    1610612747: 'Los Angeles Lakers',
    1610612763: 'Memphis Grizzlies',
    1610612748: 'Miami Heat',
    1610612749: 'Milwaukee Bucks',
    1610612750: 'Minnesota Timberwolves',
    1610612740: 'New Orleans Pelicans',
    1610612752: 'New York Knicks',
    1610612760: 'Oklahoma City Thunder',
    1610612753: 'Orlando Magic',
    1610612755: 'Philadelphia 76ers',
    1610612756: 'Phoenix Suns',
    1610612757: 'Portland Trail Blazers',
    1610612758: 'Sacramento Kings',
    1610612759: 'San Antonio Spurs',
    1610612761: 'Toronto Raptors',
    1610612762: 'Utah Jazz',
    1610612764: 'Washington Wizards'
};

export function teamNameFromId(tmId) {
    if (tmId == null) return null;
    return TM_ID_TO_NAME[tmId] ?? null;
}

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

    const playerSlots = PLAYER_SLOTS.map((i) => {
        const name = players[i - 1];
        const rawId = row?.[`player_${i}_id`];
        const id = rawId != null && rawId !== '' ? String(rawId).trim() : null;
        return { name, id };
    });

    return {
        row_key: `${variant}:${identity}`,
        variant,
        lineup_label: lineupLabel,
        team_name: teamNameFromId(row?.tm_id) ?? TEAM_PENDING_LABEL,
        possessions,
        net_pm: netPm,
        off_pm: offPm,
        def_pm: defPm,
        off_synergy: toFiniteNumber(row?.off_synergy),
        def_synergy: toFiniteNumber(row?.def_synergy),
        players: playerSlots,
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
