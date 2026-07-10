import test from 'node:test';
import assert from 'node:assert/strict';

import {
    computeSeasonX,
    computeSeasonXFromEndYear,
    formatSeasonEndYearLabel,
    getSeasonStartYear
} from '../src/lib/utils/seasonUtils.js';


test('getSeasonStartYear returns season start year for valid inputs', () => {
    assert.equal(getSeasonStartYear('2024-01-15'), 2023);
    assert.equal(getSeasonStartYear('2024-10-22'), 2024);
    assert.equal(getSeasonStartYear('2024-10-22T11:22:33'), 2024);
});

test('getSeasonStartYear returns null for malformed inputs', () => {
    assert.equal(getSeasonStartYear(null), null);
    assert.equal(getSeasonStartYear(undefined), null);
    assert.equal(getSeasonStartYear(''), null);
    assert.equal(getSeasonStartYear('2024-13-01'), null);
    assert.equal(getSeasonStartYear('invalid-date'), null);
});

test('computeSeasonX skips rows with invalid dates and annotates valid rows', () => {
    const rows = [
        { date: '2023-11-10', marker: 'a' },
        { date: '2024-02-20', marker: 'b' },
        { date: 'invalid', marker: 'skip' },
        { date: null, marker: 'skip-2' },
        { date: '2024-10-10', marker: 'c' }
    ];

    const result = computeSeasonX(rows);

    assert.equal(result.length, 3);
    assert.equal(result[0].marker, 'a');
    assert.equal(result[1].marker, 'b');
    assert.equal(result[2].marker, 'c');
    assert.equal(result[0]._seasonLabel, '2023-24');
    assert.equal(result[1]._seasonLabel, '2023-24');
    assert.equal(result[2]._seasonLabel, '2024-25');
    assert.equal(result[0]._seasonIndex, 2023);
    assert.equal(result[2]._seasonIndex, 2024);
    assert.equal(Number.isFinite(result[0]._seasonX), true);
    assert.equal(Number.isFinite(result[1]._seasonX), true);
    assert.equal(Number.isFinite(result[2]._seasonX), true);
});

test('formatSeasonEndYearLabel formats database season values as NBA season labels', () => {
    assert.equal(formatSeasonEndYearLabel(2026), '2025-26');
    assert.equal(formatSeasonEndYearLabel('2025'), '2024-25');
    assert.equal(formatSeasonEndYearLabel('not-a-season'), null);
});

test('WOWY season positions use the exported finals year for Bubble games', () => {
    const rows = computeSeasonXFromEndYear([
        { date: '2020-08-01', season: 2020, game_id: 'bubble' },
        { date: '2020-12-23', season: 2021, game_id: 'next-season' }
    ]);

    assert.equal(rows[0]._seasonIndex, 2019);
    assert.equal(rows[0]._seasonLabel, '2019-20');
    assert.equal(rows[1]._seasonIndex, 2020);
    assert.equal(rows[1]._seasonLabel, '2020-21');
});
