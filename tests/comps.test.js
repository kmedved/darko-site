import test from 'node:test';
import assert from 'node:assert/strict';

import {
    compPath,
    compsFan,
    MIN_FAN_COMPS,
    normalizeComps,
    seasonEndLine,
    weightedPercentiles
} from '../src/lib/utils/comps.js';

const close = (a, b) => Math.abs(a - b) < 1e-9;

test('weighted percentiles read midpoints of cumulative weight, as numpy.interp does', () => {
    // numpy: v sorted, cw = (cumsum(w) - w / 2) / sum(w), interp(p, cw, v); clamped at the ends.
    const got = weightedPercentiles([3, 1, 2, 5, -1], [1, 2, 1, 4, 2.5]);
    const expected = [-1, 0.222222222222, 2.25, 4.5, 5];
    got.forEach((value, index) => assert.ok(close(value, expected[index]), `${value} vs ${expected[index]}`));
});

function comp(rank, weight, next) {
    return {
        rank,
        comp_id: 100 + rank,
        comp_dpm: 1,
        weight,
        ...Object.fromEntries(next.map((value, index) => [`dpm_next_${index + 1}`, value]))
    };
}

test('the fan weighs comps by their match and needs four still playing', () => {
    const comps = [
        comp(1, 60, [3, 2, 1, null, null]),
        comp(2, 50, [2, 2, null, null, null]),
        comp(3, 40, [1, 1, 1, null, null]),
        comp(4, 30, [0, null, 2, null, null]),
        comp(5, 20, [-1, 0, null, null, 4])
    ];
    const fan = compsFan(comps);
    assert.deepEqual(fan.map((entry) => entry.year), [1, 2, 3, 4, 5]);
    assert.deepEqual(fan.map((entry) => entry.count), [5, 4, 3, 0, 1]);
    // Every comp played the next season; 130 of the 200 weight played the third.
    assert.ok(close(fan[0].share, 1));
    assert.ok(close(fan[2].share, 130 / 200));
    assert.equal(fan[3].share, 0);
    // Four or more comps with a rating get a range; fewer get none.
    assert.equal(MIN_FAN_COMPS, 4);
    assert.ok(fan[1].p50 !== null && fan[1].p10 <= fan[1].p50 && fan[1].p50 <= fan[1].p90);
    assert.deepEqual([fan[2].p10, fan[2].p50, fan[2].p90], [null, null, null]);
    const [p10, p25, p50, p75, p90] = weightedPercentiles([3, 2, 1, 0, -1], [60, 50, 40, 30, 20]);
    assert.deepEqual([fan[0].p10, fan[0].p25, fan[0].p50, fan[0].p75, fan[0].p90], [p10, p25, p50, p75, p90]);
});

test("a comp's path keeps the seasons he missed as gaps", () => {
    assert.deepEqual(compPath(comp(1, 50, [2, null, 1.5, 1, null])), [
        { year: 0, dpm: 1 },
        { year: 1, dpm: 2 },
        { year: 2, dpm: null },
        { year: 3, dpm: 1.5 },
        { year: 4, dpm: 1 },
        { year: 5, dpm: null }
    ]);
});

test('season-end DPM comes from each season’s last real game day', () => {
    const rows = [
        { date: '2025-03-01', season: 2025, tm_id: 10, future_game: 0, dpm: 1.0, age: 24.4 },
        { date: '2025-04-12', season: 2025, tm_id: 10, future_game: 0, dpm: 1.4, age: 24.5 },
        { date: '2026-04-30', season: 2026, tm_id: 10, future_game: 0, dpm: 2.0, age: 25.5 },
        // A next-game projection and the offseason row are not game days.
        { date: '2026-05-02', season: 2026, tm_id: 10, future_game: 1, dpm: 2.1, age: 25.5 },
        { date: '2026-07-26', season: 2026, tm_id: -999, future_game: 1, dpm: 1.7, age: 25.7 }
    ];
    assert.deepEqual(seasonEndLine(rows), [
        { season: 2025, date: '2025-04-12', age: 24.5, dpm: 1.4 },
        { season: 2026, date: '2026-04-30', age: 25.5, dpm: 2.0 }
    ]);
});

test('published rows become numbers in rank order', () => {
    const comps = normalizeComps([
        { rank: '2', comp_id: '7', comp_name: 'B', similarity: '61.2', weight: '61.2', age: '24.1', dpm: '3' },
        { rank: 1, comp_id: 8, comp_name: 'A', similarity: 70, weight: 70, age: 24.1, dpm: 3 },
        { rank: null, comp_id: 9 }
    ]);
    assert.deepEqual(comps.map((row) => [row.rank, row.comp_id, row.similarity]), [
        [1, 8, 70],
        [2, 7, 61.2]
    ]);
    assert.deepEqual(normalizeComps(null), []);
});
