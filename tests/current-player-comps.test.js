import test from 'node:test';
import assert from 'node:assert/strict';
import { currentPlayerComps } from '../src/lib/utils/currentPlayerComps.js';

const player = (nba_id, overrides = {}) => ({
    nba_id, player_name: `Player ${nba_id}`, team_name: 'Charlotte Hornets',
    dpm: 0.6, o_dpm: 1.8, d_dpm: -1.2, age: 26,
    x_pts_100: 33, x_ast_100: 6, x_orb_100: 1, x_drb_100: 6,
    x_blk_100: 0.4, x_stl_100: 1, x_tov_100: 4,
    x_fga_100: 25, x_fg3a_100: 13, x_fta_100: 9,
    ...overrides
});

test('the current player is first at 100, even with an identical profile or stale reference', () => {
    const reference = player(2);
    const rows = currentPlayerComps({ ...reference, dpm: 99 }, [player(1), reference, player(3, { dpm: 4 })]);
    assert.equal(rows[0].id, 2);
    assert.equal(rows[0].similarity, 100);
    assert.equal(rows[0].self, true);
    assert.equal(rows[1].similarity, 100);
});

test('returns ten unique current players, nearest first, including the reference', () => {
    const reference = player(1);
    const roster = Array.from({ length: 20 }, (_, index) => player(index + 1, { dpm: 0.6 + index * 0.1 }));
    const rows = currentPlayerComps(reference, [roster[0], ...roster].reverse());
    assert.deepEqual(rows.map((row) => row.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(new Set(rows.map((row) => row.id)).size, 10);
    assert.ok(rows.every((row, index) => index === 0 || row.similarity <= rows[index - 1].similarity));
});

test('rates describe style independent of minutes; box-score differences affect the order', () => {
    const reference = player(1);
    const rows = currentPlayerComps(reference, [reference,
        player(2, { x_minutes: 5 }),
        player(3, { x_pts_100: 25, x_ast_100: 3, x_fg3a_100: 4 })]);
    assert.deepEqual(rows.map((row) => row.id), [1, 2, 3]);
    assert.equal(rows[1].similarity, 100);
    assert.ok(rows[2].similarity < 100);
    assert.equal(rows[0].rebounds, 7);
});

test('retired references match current players without adding themselves or inventing missing data', () => {
    const reference = player(99);
    const rows = currentPlayerComps(reference, [player(1), player(2, { age: null }), player(3, { x_fga_100: 0 })]);
    assert.deepEqual(rows.map((row) => row.id), [1]);
    assert.equal(rows[0].self, false);
    assert.equal(currentPlayerComps({ ...reference, age: null }, [player(1)]).length, 0);
    assert.deepEqual(currentPlayerComps(reference, []), []);
});
