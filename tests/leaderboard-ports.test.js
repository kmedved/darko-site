import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { leaderboardTableColumns } from '../src/lib/utils/leaderboardColumns.js';
import {
    filterLeaderboardRows,
    matchesAgeGroup,
    matchesPosition,
    trendSeason,
    withChangeSince
} from '../src/lib/utils/leaderboardViews.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');
const keys = (columns) => columns.map((column) => column.key);

const PLAYERS = [
    { nba_id: 1, position: 'C-F', age: 31.2, dpm: 6.8 },
    { nba_id: 2, position: 'F-C', age: 22.7, dpm: 6.4 },
    { nba_id: 3, position: 'G', age: 24, dpm: 5.6 },
    { nba_id: 4, position: 'F-G', age: 30.9, dpm: 4.6 },
    { nba_id: 5, position: null, age: null, dpm: 1.0 }
];

test('position and age groups, and the watchlist, filter the leaderboard', () => {
    // A listed position counts for every group it names.
    assert.ok(matchesPosition({ position: 'F-C' }, 'centers') && matchesPosition({ position: 'F-C' }, 'forwards'));
    assert.ok(!matchesPosition({ position: 'G' }, 'centers'));
    assert.ok(matchesPosition({ position: null }, 'all'));

    // 24 exactly is 24–29; a player without an age is only in "All ages".
    assert.ok(matchesAgeGroup({ age: 23.99 }, 'u24') && !matchesAgeGroup({ age: 24 }, 'u24'));
    assert.ok(matchesAgeGroup({ age: 24 }, '24-29') && !matchesAgeGroup({ age: 30 }, '24-29'));
    assert.ok(!matchesAgeGroup({ age: null }, '30+') && matchesAgeGroup({ age: null }, 'all'));

    const ids = (rows) => rows.map((row) => row.nba_id);
    assert.deepEqual(ids(filterLeaderboardRows(PLAYERS, { position: 'centers' })), [1, 2]);
    assert.deepEqual(ids(filterLeaderboardRows(PLAYERS, { position: 'centers', age: 'u24' })), [2]);
    assert.deepEqual(ids(filterLeaderboardRows(PLAYERS, { age: '30+' })), [1, 4]);
    assert.deepEqual(ids(filterLeaderboardRows(PLAYERS, { watchlist: new Set([4, 1]) })), [1, 4]);
    assert.deepEqual(ids(filterLeaderboardRows(PLAYERS)), [1, 2, 3, 4, 5]);
});

test("the Time Machine's board carries each player's DPM today and the change since", () => {
    const then = [{ nba_id: 1, dpm: 6.7 }, { nba_id: 2, dpm: 6.3 }, { nba_id: 9, dpm: 2.0 }];
    const today = [{ nba_id: 1, dpm: 6.76 }, { nba_id: 2, dpm: '4.61' }];
    const rows = withChangeSince(then, today);
    assert.deepEqual(rows.map((row) => [row.now_dpm, row.since_dpm]), [
        [6.76, 0.06],
        [4.61, -1.69],
        // Off today's board: no rating now and no change.
        [null, null]
    ]);
});

test('sparklines follow the Time Machine season, then a picked season, then the players', () => {
    assert.equal(trendSeason({ asOf: { season: 2016 }, selectedSeason: 2020, players: [{ season: 2026 }] }), 2016);
    assert.equal(trendSeason({ selectedSeason: 2020, players: [{ season: 2026 }] }), 2020);
    assert.equal(trendSeason({ players: [{ season: 2025 }, { season: '2026' }] }), 2026);
    assert.equal(trendSeason({ players: [] }), null);
});

test('the sparkline, Now and Since sit after Def; the split is drawn in the DPM cell', () => {
    const plain = keys(leaderboardTableColumns());
    assert.equal(plain.indexOf('d_dpm') + 1, plain.indexOf('box_dpm'));
    assert.ok(!plain.includes('_split') && !plain.includes('_trend') && !plain.includes('now_dpm'));

    const dated = leaderboardTableColumns({ trends: true, asOf: true });
    const at = keys(dated).indexOf('d_dpm');
    assert.deepEqual(keys(dated).slice(at, at + 4), ['d_dpm', '_trend', 'now_dpm', 'since_dpm']);
    const trend = dated.find((column) => column.key === '_trend');
    assert.equal(trend.label, 'To date');
    assert.equal(trend.sortable, false);
    assert.equal(leaderboardTableColumns({ trends: true }).find((column) => column.key === '_trend').label, 'Season');
});

test('the leaderboard wires the filters, the watchlist, the sparklines and the Time Machine columns', async () => {
    const [page, server, endpoint, star] = await Promise.all([
        read('src/routes/+page.svelte'),
        read('src/routes/+page.server.js'),
        read('src/routes/api/history/trends/+server.js'),
        read('src/lib/components/WatchStar.svelte')
    ]);

    assert.match(page, /filterLeaderboardRows\(teamScopedPlayers, \{\s*position: positionFilter,\s*age: ageFilter,\s*watchlist: watchOnly \? watchSet : null\s*\}\)/);
    assert.match(page, /<WatchStar nbaId=\{Number\(player\.nba_id\)\} name=\{player\.player_name\} compact \/>/);
    assert.match(page, /<OffenseDefenseBar offense=\{player\.o_dpm\} defense=\{player\.d_dpm\} max=\{6\} \/>/);
    // Sparklines load a page at a time and only when shown; the choice is remembered.
    assert.match(page, /if \(!showTrends \|\| !trendBoard\) return;/);
    assert.match(page, /fetch\(`\/api\/history\/trends\?\$\{params\}`\)/);
    assert.match(page, /localStorage\.setItem\(TRENDS_STORAGE_KEY, value \? '1' : '0'\)/);
    // A sort by a column that has gone falls back to DPM.
    assert.match(page, /const activeSortColumn = \$derived\(sortConfigs\[sortColumn\] \? sortColumn : 'dpm'\);/);

    assert.match(server, /getPlayersOnDate\(asOfDate\),\s*getActivePlayers\(\)/);
    assert.match(server, /const players = today \? withChangeSince\(projected, today\) : projected;/);
    assert.match(endpoint, /getSeasonTrends\(ids, season, \{ through \}\)/);
    assert.match(endpoint, /setEdgeCache\(setHeaders, through \? AS_OF_EDGE_CACHE/);
    assert.match(star, /let \{ nbaId, name = '', compact = false \} = \$props\(\);/);
});
