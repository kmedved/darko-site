import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import {
    getAgeRecords,
    getBiggestUpdates,
    getRatingMoves,
    getRatingSeries,
    getSeasonLeaders
} from '$lib/server/daily.js';
import { AS_OF_EDGE_CACHE, getPlayersOnDate } from '$lib/server/history.js';
import { getActivePlayers } from '$lib/server/supabase.js';
import {
    BOARD_SIZE,
    UPDATE_MIN_MINUTES,
    UPDATES_SHOWN,
    WINDOWS,
    boardRows,
    daysBefore,
    movesByWindow,
    pickMovers,
    seasonFromStart,
    watchCards
} from '$lib/utils/daily.js';
import { AS_OF_PARAM, parseAsOfDate } from '$lib/utils/timeMachine.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1'],
    maxDuration: 60
};

const SUGGESTED_ROOKIES = 4;

export async function load({ url, setHeaders }) {
    const asOfDate = parseAsOfDate(url.searchParams.get(AS_OF_PARAM));
    setEdgeCache(setHeaders, asOfDate ? AS_OF_EDGE_CACHE : { edgeSMaxAge: 3600, swr: 86400, sie: 86400 });
    return asOfDate ? rewound(asOfDate) : latest();
}

/** A Time Machine date: that day's board and that season's best, from the history tables. */
async function rewound(date) {
    const onDate = await getPlayersOnDate(date);
    const leaders = onDate.season ? await getSeasonLeaders(onDate.season) : null;
    return {
        mode: 'rewound',
        date,
        dataDate: onDate.dataDate,
        season: onDate.season,
        board: boardRows(onDate.rows, 12),
        leaders
    };
}

/** Today's edition: the board, the movers and single-game updates of each window, age records. */
async function latest() {
    const [players, moveRows] = await Promise.all([getActivePlayers(), getRatingMoves()]);
    const board = boardRows(players, BOARD_SIZE);
    const rookieSeason = Math.max(...(players ?? []).map((player) => Number(player.season) || 0));
    const suggestedIds = boardRows(
        (players ?? []).filter((player) => Number(player.rookie_season) === rookieSeason),
        SUGGESTED_ROOKIES
    ).map((row) => row.id);
    if (!moveRows?.length) {
        return { mode: 'latest', available: false, board, windows: {}, updates: {}, records: null, series: {}, suggested: [] };
    }

    const byWindow = movesByWindow(moveRows);
    const seasonWindow = byWindow.season;
    const end = seasonWindow.end;
    const seasonStart = seasonWindow.start;
    const starts = Object.fromEntries(
        WINDOWS.map(({ key, days }) => [key, key === 'season' ? daysBefore(seasonStart, 1) : daysBefore(end, days)])
    );
    const updateLists = await Promise.all(
        WINDOWS.map(({ key }) => getBiggestUpdates(starts[key], end, UPDATES_SHOWN, { minMinutes: UPDATE_MIN_MINUTES }))
    );
    const updates = Object.fromEntries(WINDOWS.map(({ key }, index) => [key, updateLists[index] ?? []]));

    // Sparklines for everyone the page can show: the board, every window's movers, the rookies.
    const shown = new Set([...board.map((row) => row.id), ...suggestedIds]);
    for (const { key } of WINDOWS) {
        const { risers, fallers } = pickMovers(byWindow[key], key);
        for (const row of [...risers, ...fallers]) shown.add(row.id);
    }
    const season = seasonFromStart(seasonStart);
    const [series, records] = await Promise.all([getRatingSeries([...shown], seasonStart), getAgeRecords(season)]);

    return {
        mode: 'latest',
        available: true,
        end,
        season,
        seasonStart,
        starts,
        board,
        windows: byWindow,
        updates,
        records,
        series,
        suggested: watchCards(suggestedIds, { players, byWindow, series })
    };
}
