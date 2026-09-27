/**
 * Compact transport for the lineups page. A server lineup row repeats every player name three
 * times (the player fields, the player slots and the label) under ~20 field names, so a 2-Man page
 * weighed 1.3 MB. Packed, each row is an array: a team index, six numbers rounded to four decimals,
 * and one entry per player slot, with every team and player name listed once. unpackLineups
 * rebuilds the server's row objects exactly, apart from that rounding.
 */

const TEAM_PENDING_LABEL = 'Team pending';
const PLAYER_ID_PATTERN = /^\d+$/;
const NUMBER_FIELDS = ['possessions', 'net_pm', 'off_pm', 'def_pm', 'off_synergy', 'def_synergy'];
const VARIANTS = ['pi', 'npi'];

function round4(value) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10_000) / 10_000 || 0 : null;
}

// Mirrors the server's lineup identity (lineupRatings.js) for the slots a row keeps.
function lineupIdentity(slots, possessions, netPm) {
    const ids = slots.map((slot) => slot.id).filter(Boolean);
    if (ids.length > 0) return `ids:${ids.join(':')}`;
    const names = slots.map((slot) => slot.name).filter(Boolean);
    if (names.length > 0) return `names:${names.join('|')}`;
    return `fallback:${possessions ?? 'na'}:${netPm ?? 'na'}`;
}

function buildRow(variant, lineupSize, team, numbers, slots) {
    const [possessions, netPm, offPm, defPm, offSynergy, defSynergy] = numbers;
    const names = slots.map((slot) => slot.name);
    const row = {
        row_key: `${variant}:${lineupIdentity(slots, possessions, netPm)}`,
        variant,
        lineup_size: lineupSize,
        lineup_label: names.filter(Boolean).join(', ') || 'Unnamed lineup',
        tm_id: team?.[0] ?? null,
        team_name: team?.[1] ?? TEAM_PENDING_LABEL,
        possessions,
        net_pm: netPm,
        off_pm: offPm,
        def_pm: defPm,
        off_synergy: offSynergy,
        def_synergy: defSynergy,
        players: slots
    };
    for (let slot = 1; slot <= 5; slot += 1) {
        row[`player_${slot}`] = lineupSize >= slot ? (names[slot - 1] ?? null) : null;
    }
    return row;
}

/** Pack `{ pi, npi }` lineup rows (lineupRatings.js shape) for one lineup size. */
export function packLineups(lineupsByVariant, lineupSize) {
    const teams = [];
    const teamIndexes = new Map();
    const players = {};
    const keys = {};
    const packed = { lineupSize, teams, players, keys };

    for (const variant of VARIANTS) {
        const rows = Array.isArray(lineupsByVariant?.[variant]) ? lineupsByVariant[variant] : [];
        keys[variant] = {};
        packed[variant] = rows.map((row, index) => {
            const teamKey = `${row.tm_id}\u0000${row.team_name}`;
            let team = teamIndexes.get(teamKey);
            if (team === undefined) {
                team = teams.length;
                teams.push([row.tm_id ?? null, row.team_name ?? TEAM_PENDING_LABEL]);
                teamIndexes.set(teamKey, team);
            }
            const numbers = NUMBER_FIELDS.map((field) => round4(row[field]));
            const slots = (row.players ?? []).map(({ name = null, id = null } = {}) => {
                if (typeof id === 'string' && PLAYER_ID_PATTERN.test(id)) {
                    if (!Object.hasOwn(players, id)) players[id] = name;
                    if (players[id] === name) return id;
                }
                return [name, id];
            });
            // A row whose key the page cannot rebuild (none today) carries it explicitly.
            const rebuilt = buildRow(variant, lineupSize, teams[team], numbers, row.players ?? []);
            if (rebuilt.row_key !== row.row_key) keys[variant][index] = row.row_key;
            return [team, ...numbers, ...slots];
        });
    }
    return packed;
}

/** Rebuild `{ pi, npi }` row objects; rows that already arrived as objects pass through. */
export function unpackLineups(packed) {
    if (!packed || !Array.isArray(packed.teams)) {
        return {
            pi: Array.isArray(packed?.pi) ? packed.pi : [],
            npi: Array.isArray(packed?.npi) ? packed.npi : []
        };
    }
    const { lineupSize, teams, players = {}, keys = {} } = packed;
    const result = {};
    for (const variant of VARIANTS) {
        const rows = Array.isArray(packed[variant]) ? packed[variant] : [];
        result[variant] = rows.map((entry, index) => {
            const slots = entry.slice(1 + NUMBER_FIELDS.length).map((slot) =>
                typeof slot === 'string'
                    ? { name: players[slot] ?? null, id: slot }
                    : { name: slot?.[0] ?? null, id: slot?.[1] ?? null }
            );
            const row = buildRow(variant, lineupSize, teams[entry[0]], entry.slice(1, 1 + NUMBER_FIELDS.length), slots);
            const key = keys[variant]?.[index];
            if (key !== undefined) row.row_key = key;
            return row;
        });
    }
    return result;
}
