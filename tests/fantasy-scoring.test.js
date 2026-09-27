import test from 'node:test';
import assert from 'node:assert/strict';

import {
    FANTASY_CATEGORIES,
    FANTASY_PRESETS,
    MIN_PROJECTED_MINUTES,
    buildFantasyBoard,
    categoryScores,
    pointsPerGame,
    projectPerGame
} from '../src/lib/utils/fantasyScoring.js';
import { getFantasyCsvColumns } from '../src/lib/utils/csvPresets.js';
import { projectPlayers } from '../src/lib/server/playerViews.js';

function player(overrides = {}) {
    return {
        nba_id: 1,
        player_name: 'Test Player',
        team_name: 'Denver Nuggets',
        tm_id: 1610612743,
        position: 'G',
        x_minutes: 30,
        x_pace: 100,
        x_pts_100: 30,
        x_ast_100: 10,
        x_orb_100: 2,
        x_drb_100: 8,
        x_stl_100: 2,
        x_blk_100: 1,
        x_tov_100: 4,
        x_fga_100: 24,
        x_fg3a_100: 8,
        x_fta_100: 6,
        x_fg_pct: 0.5,
        x_fg3_pct: 0.4,
        x_ft_pct: 0.8,
        ...overrides
    };
}

function assertClose(actual, expected, tolerance = 1e-9) {
    assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);
}

test('per-game lines use the DARKO props conversion (minutes x pace / 48 possessions)', () => {
    const line = projectPerGame(player());
    assertClose(line.possessions, 62.5);
    assertClose(line.pts, 18.75);
    assertClose(line.reb, 6.25);
    assertClose(line.fga, 15);
    assertClose(line.fgm, 7.5);
    assertClose(line.fg3m, 2);
    assertClose(line.ftm, 3);
});

test('per-game lines clamp negative projected minutes and need minutes and pace', () => {
    assert.equal(projectPerGame(player({ x_minutes: -4 })).minutes, 0);
    assert.equal(projectPerGame(player({ x_pace: null })), null);
    assert.equal(projectPerGame(player({ x_minutes: undefined })), null);
});

test('ESPN points credit makes and debit misses and turnovers', () => {
    const line = projectPerGame(player());
    const k = 0.625;
    const expected = 18.75 + 6.25 + 2 * 10 * k + 4 * 2 * k + 4 * 1 * k + 2 - 2 * 4 * k + 2 * 7.5 - 15 + 3 - 3.75;
    assertClose(pointsPerGame(line, FANTASY_PRESETS.espn.weights), expected);
});

test('the board drops players under the minutes floor and ranks by value', () => {
    const board = buildFantasyBoard(
        [
            player({ nba_id: 1, player_name: 'Lower scorer', x_pts_100: 20 }),
            player({ nba_id: 2, player_name: 'Higher scorer', x_pts_100: 35 }),
            player({ nba_id: 3, player_name: 'Bench', x_minutes: MIN_PROJECTED_MINUTES - 1 })
        ],
        { preset: 'espn' }
    );
    assert.deepEqual(board.map((row) => row.nba_id), [2, 1]);
    assert.deepEqual(board.map((row) => row.rank), [1, 2]);
});

test('custom weights replace the preset weights', () => {
    const [row] = buildFantasyBoard([player()], { preset: 'custom', customWeights: { blk: 10 } });
    assertClose(row.value, 10 * 0.625);
});

test('9-cat z-scores center the pool, reward efficient volume and punish turnovers', () => {
    const players = Array.from({ length: 30 }, (_, index) =>
        player({
            nba_id: index + 1,
            player_name: `Player ${index + 1}`,
            x_pts_100: 15 + index * 0.5,
            x_tov_100: 2 + (index % 5),
            x_fg_pct: 0.42 + (index % 7) * 0.01
        })
    );
    players.push(player({ nba_id: 101, player_name: 'Careful', x_tov_100: 2 }));
    players.push(player({ nba_id: 102, player_name: 'Careless', x_tov_100: 6 }));
    players.push(player({ nba_id: 103, player_name: 'Accurate', x_fg_pct: 0.55 }));
    players.push(player({ nba_id: 104, player_name: 'Inaccurate', x_fg_pct: 0.4 }));

    const board = buildFantasyBoard(players, { preset: 'categories' });
    const byId = new Map(board.map((row) => [row.nba_id, row]));

    for (const { key } of FANTASY_CATEGORIES) {
        const mean = board.reduce((total, row) => total + row.z[key], 0) / board.length;
        assertClose(mean, 0, 1e-9);
    }
    assert.ok(byId.get(101).z.tov > byId.get(102).z.tov);
    assert.ok(byId.get(103).z.fg_pct > byId.get(104).z.fg_pct);
    for (const row of board) {
        assertClose(row.value, FANTASY_CATEGORIES.reduce((total, { key }) => total + row.z[key], 0));
    }
});

test('category scores re-pick the pool from the top totals', () => {
    const lines = Array.from({ length: 10 }, (_, index) => projectPerGame(player({ x_pts_100: 10 + index })));
    const scores = categoryScores(lines, { poolSize: 5 });
    assert.equal(scores.length, 10);
    assert.ok(scores[9].z.pts > scores[0].z.pts);
});

test('fantasy CSV columns switch the value header and add z-scores for 9-cat', () => {
    const points = getFantasyCsvColumns(false).map((column) => column.header);
    const categories = getFantasyCsvColumns(true).map((column) => column.header);
    assert.ok(points.includes('FP/G'));
    assert.ok(!points.includes('Total Z'));
    assert.ok(categories.includes('Total Z'));
    assert.ok(categories.includes('FG% z'));
    assert.equal(categories.length, points.length + FANTASY_CATEGORIES.length);
});

test('fantasy player view keeps projection inputs and drops ratings and salary', () => {
    const [row] = projectPlayers([{ ...player(), dpm: 4.2, surplus_value: 1e6, date: '2026-07-26' }], 'fantasy');
    assert.equal(row.x_pts_100, 30);
    assert.equal(row.date, '2026-07-26');
    assert.equal('dpm' in row, false);
    assert.equal('surplus_value' in row, false);
});
