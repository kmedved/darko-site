import test from 'node:test';
import assert from 'node:assert/strict';

import { loadComparePageData, parseCompareIds } from '../src/lib/server/comparePage.js';
import { csvText } from '../src/lib/utils/csv.js';
import { compareCsvColumns } from '../src/lib/utils/csvPresets.js';

test('parseCompareIds dedupes, filters invalid ids, and caps at four players', () => {
    assert.deepEqual(parseCompareIds('7,3,7,foo,-1,9,11,13'), [7, 3, 9, 11]);
});

test('compare page load preserves first-seen order in preloaded players', async () => {
    const result = await loadComparePageData({
        rawIds: '7,3,9',
        loadFullHistory: async (nbaId) => ({
            rows: [{ nba_id: nbaId, player_name: `Player ${nbaId}` }]
        }),
        buildComparePlayer: ({ currentRow, rows, color }) => ({
            ...currentRow,
            rows,
            color
        }),
        getComparePlayerColors: () => ['c1', 'c2', 'c3', 'c4']
    });

    assert.deepEqual(
        result.preloadedPlayers.map((player) => player.nba_id),
        [7, 3, 9]
    );
    assert.equal(result.notice, null);
});

test('compare page load keeps successful players and returns a notice for failures', async () => {
    const result = await loadComparePageData({
        rawIds: '7,3,9',
        loadFullHistory: async (nbaId) => {
            if (nbaId === 3) {
                throw new Error('missing');
            }

            if (nbaId === 9) {
                return { rows: [] };
            }

            return {
                rows: [{ nba_id: nbaId, player_name: `Player ${nbaId}` }]
            };
        },
        buildComparePlayer: ({ currentRow, rows, color }) => ({
            ...currentRow,
            rows,
            color
        }),
        getComparePlayerColors: () => ['c1', 'c2', 'c3', 'c4']
    });

    assert.deepEqual(
        result.preloadedPlayers.map((player) => player.nba_id),
        [7]
    );
    assert.match(result.notice, /3, 9/);
});

test('compare page load counts games played from the season table, not model rows', async () => {
    const result = await loadComparePageData({
        rawIds: '977,2544',
        loadFullHistory: async (nbaId) => ({
            rows: [{ nba_id: nbaId, player_name: `Player ${nbaId}`, career_game_num: 1777 }]
        }),
        buildComparePlayer: ({ currentRow, rows, color }) => ({ ...currentRow, rows, color }),
        getComparePlayerColors: () => ['c1', 'c2'],
        loadSeasons: async (nbaId) => {
            if (nbaId === 2544) throw new Error('season table unavailable');
            return [
                { season: 2015, games: 35, playoff_games: 0 },
                { season: 2016, games: 66, playoff_games: 0 },
                { season: 2010, games: 73, playoff_games: 23 }
            ];
        }
    });
    const [kobe, lebron] = result.preloadedPlayers;
    assert.deepEqual([kobe.games_regular, kobe.games_playoffs], [174, 23]);
    // Without the season table the games stay unknown rather than falling back to model rows.
    assert.deepEqual([lebron.games_regular, lebron.games_playoffs], [null, null]);
    assert.equal(result.notice, null);
});

test("Compare's CSV exports the games the page shows, with their coverage and the ratings' date", async () => {
    const result = await loadComparePageData({
        rawIds: '977,2544',
        loadFullHistory: async (nbaId) => ({
            rows: [{
                nba_id: nbaId,
                player_name: nbaId === 977 ? 'Kobe Bryant' : 'LeBron James',
                career_game_num: 1777,
                date: nbaId === 977 ? '2016-04-13' : '2026-07-26'
            }]
        }),
        buildComparePlayer: ({ currentRow, rows, color }) => ({ ...currentRow, rows, color }),
        getComparePlayerColors: () => ['c1', 'c2'],
        loadSeasons: async (nbaId) => {
            if (nbaId === 2544) throw new Error('season table unavailable');
            return [
                { season: 2015, games: 35, playoff_games: 0 },
                { season: 2010, games: 73, playoff_games: 23 }
            ];
        }
    });
    // The real serializer and schema, as the Download CSV button runs them.
    const [header, ...lines] = csvText({ rows: result.preloadedPlayers, columns: compareCsvColumns })
        .replace(/^\uFEFF/, '')
        .split('\r\n')
        .map((line) => line.split(','));
    const column = (name) => lines.map((line) => line[header.indexOf(name)]);
    assert.deepEqual(column('Player'), ['Kobe Bryant', 'LeBron James']);
    assert.deepEqual(column('Regular-season games (since 1996-97)'), ['108', '\u2014']);
    assert.deepEqual(column('Playoff games (since 1996-97)'), ['23', '\u2014']);
    assert.deepEqual(column('Ratings as of'), ['2016-04-13', '2026-07-26']);
    // The model's row count is gone from the export, under any header.
    assert.ok(!header.includes('Career Games'));
    assert.ok(!lines.flat().includes('1777'));
});
