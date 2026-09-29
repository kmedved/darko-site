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

// A rotation player's projected minutes a game (the table's MPG), for Ask DARKO's answers and the
// rail's podium cards, so a player who barely plays stays off both.
export const ROTATION_MINUTES = 12;

export function isRotationPlayer(player) {
    return (toNumber(player?.x_minutes) ?? 0) >= ROTATION_MINUTES;
}

// The rail's podium cards count regulars: 20 or more minutes a game (the table's MPG), and at
// least half as many games this season as anyone has played (41 once a season is over). A board
// without this season's games (a past season's opening day, a Time Machine date) counts 20
// games in DARKO's data instead, which include games a player sat out.
export const PODIUM_MINUTES = 20;
const PODIUM_FALLBACK_GAMES = 20;

export function podiumRule(players) {
    const games = (players ?? []).map((player) => toNumber(player?.season_games)).filter((n) => n !== null);
    // Half, rounded down: a player traded mid-season can play 83 games, and the bar stays 41.
    const minGames = games.length > 0 ? Math.max(1, Math.floor(Math.max(...games) / 2)) : null;
    const playedEnough =
        minGames === null
            ? (player) => (toNumber(player?.career_game_num) ?? 0) >= PODIUM_FALLBACK_GAMES
            : (player) => (toNumber(player?.season_games) ?? 0) >= minGames;
    return {
        minGames,
        qualifies: (player) => (toNumber(player?.x_minutes) ?? 0) >= PODIUM_MINUTES && playedEnough(player),
        note:
            minGames === null
                ? `Regulars: ${PODIUM_MINUTES}+ MPG and ${PODIUM_FALLBACK_GAMES}+ games in DARKO's data`
                : `Regulars: ${PODIUM_MINUTES}+ MPG and ${minGames}+ games this season`
    };
}

// The rail's young players, by their year in the league on the board's season.
export const EXPERIENCE_GROUPS = Object.freeze([
    { key: 'rookies', label: 'Rookies', year: 1 },
    { key: 'sophomores', label: 'Sophomores', year: 2 },
    { key: 'third', label: '3rd Year', year: 3 }
]);

/**
 * A player's year in the league on their row's season (1 for a rookie), from the first season
 * DARKO lists for them; null when either is unknown.
 */
export function leagueYear(player) {
    const first = toNumber(player?.rookie_season);
    const season = toNumber(player?.season);
    return first === null || season === null ? null : season - first + 1;
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
