import test from 'node:test';
import assert from 'node:assert/strict';

import {
    computeSeasonX,
    computeSeasonAgeX,
    computeSeasonXFromEndYear,
    currentSeasonEndYear,
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


test('season age fills each played season without changing observations or removing missing years', () => {
    const rows = [
        { date: '2018-11-01', season: 2019, age: 20, value: 1 },
        { date: '2019-04-01', season: 2019, age: 20.4, value: 2 },
        { date: '2019-11-01', season: 2020, age: 21, value: 3 },
        { date: '2020-08-01', season: 2020, age: 21.75, value: 4 },
        { date: '2021-11-01', season: 2022, age: 23, value: 5 }
    ];
    const positioned = computeSeasonAgeX(rows);
    assert.deepEqual(positioned.map(({ _seasonAge, _seasonAgeX, ...row }) => row), rows);
    assert.equal(positioned[1]._seasonAgeX - positioned[0]._seasonAgeX, 0.5);
    assert.equal(positioned[2]._seasonAgeX - positioned[1]._seasonAgeX, 0.5);
    // The Bubble game remains in 2019-20; an entirely absent season keeps its year.
    assert.equal(positioned[3]._seasonAgeX - positioned[2]._seasonAgeX, 0.5);
    assert.equal(positioned[4]._seasonAgeX - positioned[3]._seasonAgeX, 1.75);
    assert.ok(rows.every(row => !('_seasonAgeX' in row)));
    assert.equal(computeSeasonAgeX([{ date: '2020-01-01', age: null }])[0]._seasonAgeX, null);
    assert.deepEqual(computeSeasonAgeX([]), []);
});

test('season age draws the season in progress as its share of 82 games', () => {
    const rows = [
        { date: '2025-11-01', season: 2026, age: 30.42 },
        { date: '2026-03-01', season: 2026, age: 30.75 },
        { date: '2026-10-25', season: 2027, age: 31.4 },
        { date: '2026-10-27', season: 2027, age: 31.41 }
    ];
    const finished = computeSeasonAgeX(rows, { currentSeason: 2028 }).map((row) => row._seasonAgeX);
    const underway = computeSeasonAgeX(rows, { currentSeason: 2027 }).map((row) => row._seasonAgeX);
    assert.deepEqual(underway.slice(0, 2), finished.slice(0, 2));
    // Finished, two games fill their year half a year apart; under way, they are games 1 and 2 of 82.
    assert.ok(Math.abs(finished[3] - finished[2] - 0.5) < 1e-9);
    assert.ok(Math.abs(underway[3] - underway[2] - 1 / 82) < 1e-9);
    assert.ok(Math.abs(underway[2] - finished[2] - (0.5 / 82 - 0.25)) < 1e-9);
    // Without a season given, the one under way today is used.
    assert.deepEqual(computeSeasonAgeX(rows), computeSeasonAgeX(rows, { currentSeason: currentSeasonEndYear() }));
});

test('season age puts every player’s age-25 season in the same column', () => {
    const day = 86_400_000;
    const season = (birth, end) => ['-11-01', '-03-01'].map((monthDay, index) => {
        const date = `${index ? end : end - 1}${monthDay}`;
        return { date, season: end, age: (Date.parse(date) - Date.parse(birth)) / day / 365.2425 };
    });
    // On February 1 LeBron was 25.09 in 2009-10 and Jordan 24.96 in 1987-88: both age-25 seasons.
    const lebron = computeSeasonAgeX(season('1984-12-30', 2010));
    const jordan = computeSeasonAgeX(season('1963-02-17', 1988));
    for (const rows of [lebron, jordan]) {
        assert.ok(rows.every((row) => row._seasonAge === 25 && row._seasonAgeX > 24.5 && row._seasonAgeX < 25.5));
    }
    assert.deepEqual(lebron.map((row) => row._seasonAgeX), jordan.map((row) => row._seasonAgeX));
});

test('the current season is the one under way, or in the offseason the coming one', () => {
    assert.equal(currentSeasonEndYear(new Date('2026-11-05T12:00:00Z')), 2027);
    assert.equal(currentSeasonEndYear(new Date('2026-06-15T12:00:00Z')), 2026);
    assert.equal(currentSeasonEndYear(new Date('2026-08-01T12:00:00Z')), 2027);
});
