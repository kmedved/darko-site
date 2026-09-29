import { withLatestRapm } from '../utils/latestRapm.js';
import { withLatestTeam } from '../utils/latestTeam.js';
import { careerGames } from '../utils/playerProfile.js';

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
    getComparePlayerColors,
    // Each player's season table (player_seasons), for games played as profiles count them.
    loadSeasons = null
}) {
    const ids = parseCompareIds(rawIds);
    if (ids.length === 0) {
        return {
            preloadedPlayers: [],
            notice: null
        };
    }

    const colors = getComparePlayerColors();
    const [results, seasonResults] = await Promise.all([
        Promise.allSettled(ids.map((id) => loadFullHistory(id))),
        Promise.allSettled(ids.map((id) => (loadSeasons ? loadSeasons(id) : Promise.resolve(null))))
    ]);
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

        const currentRow = withLatestRapm(withLatestTeam(rows.at(-1) ?? {}, rows), rows);
        // Games played, regular season and playoffs, from the season table; career_game_num
        // counts model rows, not games. Without the table the games are left unknown.
        const seasons = seasonResults[index].status === 'fulfilled' ? seasonResults[index].value : null;
        const games = Array.isArray(seasons) && seasons.length > 0 ? careerGames(seasons) : null;
        preloadedPlayers.push({
            ...buildComparePlayer({
                currentRow,
                rows,
                color: colors[preloadedPlayers.length % colors.length]
            }),
            games_regular: games?.regular ?? null,
            games_playoffs: games?.playoffs ?? null
        });
    }

    return {
        preloadedPlayers,
        notice:
            failures.length > 0
                ? `Some requested players could not be loaded: ${failures.join(', ')}`
                : null
    };
}
