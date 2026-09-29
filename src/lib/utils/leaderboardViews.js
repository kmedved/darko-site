/**
 * The leaderboard's extra filters and Time Machine columns, from the 2026 redesign's Players
 * page (reference/redesign-2026/src/11-players.js): position and age groups, the watchlist,
 * and each player's rating today beside the rating on the Time Machine's date.
 */

export const POSITION_GROUPS = Object.freeze([
    { key: 'all', label: 'All positions' },
    { key: 'guards', label: 'Guards' },
    { key: 'forwards', label: 'Forwards' },
    { key: 'centers', label: 'Centers' }
]);

export const AGE_GROUPS = Object.freeze([
    { key: 'all', label: 'All ages' },
    { key: 'u24', label: 'Under 24' },
    { key: '24-29', label: '24–29' },
    { key: '30+', label: '30 and over' }
]);

function toNumber(value) {
    const n = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
}

/** A listed position like "G-F" counts for every group it names. */
export function matchesPosition(player, group) {
    if (group === 'all') return true;
    const position = String(player?.position || '').toUpperCase();
    if (group === 'guards') return position.includes('G');
    if (group === 'forwards') return position.includes('F');
    if (group === 'centers') return position.includes('C');
    return true;
}

/** Ages are fractional (31.2); a player without one is only in "All ages". */
export function matchesAgeGroup(player, group) {
    if (group === 'all') return true;
    const age = toNumber(player?.age);
    if (age === null) return false;
    if (group === 'u24') return age < 24;
    if (group === '24-29') return age >= 24 && age < 30;
    if (group === '30+') return age >= 30;
    return true;
}

/** `watchlist` is a Set of followed ids, or null to keep everyone. */
export function filterLeaderboardRows(rows, { position = 'all', age = 'all', watchlist = null } = {}) {
    return (rows ?? []).filter(
        (player) =>
            matchesPosition(player, position) &&
            matchesAgeGroup(player, age) &&
            (!watchlist || watchlist.has(Number(player?.nba_id)))
    );
}

/**
 * With the Time Machine set: each player's DPM today (`now_dpm`) and the change from the
 * board's date to today (`since_dpm`). A player off today's board keeps nulls.
 */
export function withChangeSince(rows, currentRows) {
    const today = new Map();
    for (const row of currentRows ?? []) {
        const dpm = toNumber(row?.dpm);
        if (dpm !== null) today.set(Number(row.nba_id), dpm);
    }
    return (rows ?? []).map((row) => {
        const now = today.get(Number(row?.nba_id)) ?? null;
        const then = toNumber(row?.dpm);
        return {
            ...row,
            now_dpm: now,
            since_dpm: now === null || then === null ? null : Math.round((now - then) * 100) / 100
        };
    });
}

/** The season a board's sparklines follow: the Time Machine's, the picked one, or the players'. */
export function trendSeason({ asOf = null, selectedSeason = null, players = [] } = {}) {
    if (asOf?.season) return Number(asOf.season);
    if (selectedSeason !== null && selectedSeason !== undefined) return Number(selectedSeason);
    let latest = null;
    for (const player of players ?? []) {
        const season = Number.parseInt(player?.season, 10);
        if (Number.isInteger(season) && (latest === null || season > latest)) latest = season;
    }
    return latest;
}
