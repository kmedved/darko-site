import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultRoster, rateRoster } from '../src/lib/utils/rosterLab.js';
import {
    contributionExtent,
    contributionSummary,
    coreOutlook,
    DEEP_BENCH_MINUTES,
    foldDeepBench,
    leagueTeamRatings,
    minutesProfile,
    niceTicks,
    payrollRows,
    ratingContributions,
    ratingWaterfall,
    rosterContributions,
    sortContributions,
    teamRatingSummary
} from '../src/lib/utils/teamDna.js';

function player(id, team, overrides = {}) {
    return {
        nba_id: id,
        player_name: `Player ${id}`,
        team_name: team,
        dpm: 0,
        o_dpm: 0,
        d_dpm: 0,
        x_minutes: 24,
        age: 25,
        ...overrides
    };
}

// Ten Knicks at 24 projected minutes each fill exactly 240.
const KNICKS = [
    player(1, 'New York Knicks', { dpm: 4, o_dpm: 3, d_dpm: 1, x_minutes: 36, actual_salary: 50e6, sal_market_fixed: 70e6, s3: 0.95, projected_years_remaining_cal: 8.2, age: 27.6 }),
    player(2, 'New York Knicks', { dpm: 2, o_dpm: 0.5, d_dpm: 1.5, x_minutes: 30, actual_salary: 30e6, sal_market_fixed: 20e6, s3: 0.8, projected_years_remaining: 5.1 }),
    player(3, 'New York Knicks', { dpm: -1, o_dpm: -1.5, d_dpm: 0.5, x_minutes: 24, actual_salary: 10e6, sal_market_fixed: -2e6, s3: 40 }),
    ...Array.from({ length: 7 }, (_, i) => player(10 + i, 'New York Knicks', { dpm: 0.5, o_dpm: 0.25, d_dpm: 0.25, x_minutes: 21.43 }))
];
const CELTICS = Array.from({ length: 10 }, (_, i) => player(100 + i, 'Boston Celtics', { dpm: 1, o_dpm: 0.5, d_dpm: 0.5 }));
const LEAGUE_PLAYERS = [...KNICKS, ...CELTICS];

test('contributions add up to the Roster Lab rating for the same roster', () => {
    const rows = ratingContributions(KNICKS);
    const byId = new Map(KNICKS.map((row) => [row.nba_id, row]));
    const lab = rateRoster(defaultRoster(KNICKS), byId);
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    assert.ok(Math.abs(total - lab.rating) < 1e-9, `${total} vs ${lab.rating}`);
    const offense = rows.reduce((sum, row) => sum + row.offense, 0);
    assert.ok(Math.abs(offense - lab.offense) < 1e-9);
    for (const row of rows) assert.ok(Math.abs(row.offense + row.defense - row.total) < 1e-12);
    // Largest contribution first.
    assert.equal(rows[0].id, 1);
    assert.ok(rows.every((row, i) => i === 0 || rows[i - 1].total >= row.total));
});

test('the waterfall walks from zero to the team rating, one component at a time', () => {
    const rows = ratingContributions(KNICKS);
    const byId = new Map(KNICKS.map((row) => [row.nba_id, row]));
    const lab = rateRoster(defaultRoster(KNICKS), byId);
    for (const [component, expected] of [
        ['total', lab.rating],
        ['offense', lab.offense],
        ['defense', lab.defense]
    ]) {
        const { steps, total, low, high } = ratingWaterfall(rows, component);
        assert.ok(Math.abs(total - expected) < 1e-9, `${component}: ${total} vs ${expected}`);
        // Largest first; each step starts where the previous one ended.
        assert.ok(steps.every((step, i) => i === 0 || steps[i - 1].value >= step.value));
        assert.equal(steps[0].start, 0);
        for (let i = 1; i < steps.length; i += 1) assert.equal(steps[i].start, steps[i - 1].end);
        assert.ok(Math.abs(steps.at(-1).end - total) < 1e-12);
        assert.ok(low <= Math.min(0, total) && high >= Math.max(0, total));
    }
    // A player who costs points steps back left, below the running total's peak.
    const total = ratingWaterfall(rows, 'total');
    const cost = total.steps.find((step) => step.id === 3);
    assert.ok(cost.value < 0 && cost.end < cost.start);
    assert.ok(total.high > total.total);
});

test('axis ticks are round numbers across the range', () => {
    assert.deepEqual(niceTicks(0, 9.2), [0, 2, 4, 6, 8]);
    assert.deepEqual(niceTicks(-3.2, 6.1), [-2, 0, 2, 4, 6]);
    assert.deepEqual(niceTicks(-1.3, 4.1), [0, 2, 4]);
    assert.deepEqual(niceTicks(0, 0.9), [0, 0.2, 0.4, 0.6, 0.8]);
});

test('the summary ranks the team against every rated team and uses the Lab wins rule', () => {
    const league = leagueTeamRatings(LEAGUE_PLAYERS);
    assert.equal(league.length, 30);
    const rated = league.filter((team) => team.minutes > 0);
    assert.deepEqual(rated.map((team) => team.abbr).sort(), ['BOS', 'NYK']);

    const summary = teamRatingSummary('NYK', KNICKS, league);
    const knicks = league.find((team) => team.abbr === 'NYK');
    const celtics = league.find((team) => team.abbr === 'BOS');
    assert.ok(Math.abs(summary.rating - knicks.rating) < 1e-9);
    assert.equal(summary.rank, knicks.rating > celtics.rating ? 1 : 2);
    assert.equal(summary.teams, 2);
    const mean = (knicks.rating + celtics.rating) / 2;
    assert.ok(Math.abs(summary.wins - (41 + 2.7 * (knicks.rating - mean))) < 1e-9);

    assert.equal(teamRatingSummary('NYK', [], league), null);
    assert.equal(teamRatingSummary('NYK', KNICKS, []), null);
});

test('payroll pairs salary with fair value and totals the roster', () => {
    const { rows, payroll, value } = payrollRows(KNICKS, 2);
    assert.deepEqual(rows.map((row) => row.id), [1, 2]);
    assert.equal(rows[0].surplus, 20e6);
    assert.equal(rows[1].surplus, -10e6);
    assert.equal(payroll, 90e6);
    // A negative fair value counts as nothing toward the team's value.
    assert.equal(value, 90e6);
});

test('the core outlook lists the rotation by minutes with years left and survival', () => {
    const core = coreOutlook(KNICKS, 3);
    assert.deepEqual(core.map((row) => row.id), [1, 2, 3]);
    assert.equal(core[0].seasonsLeft, 8.2);
    // Falls back to the uncalibrated projection.
    assert.equal(core[1].seasonsLeft, 5.1);
    assert.equal(core[0].onRosterIn3, 95);
    // Percent-scale survival passes through.
    assert.equal(core[2].onRosterIn3, 40);
    assert.equal(core[0].age, 27.6);
});

const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) < tolerance;

test('an edited Lab roster splits into contributions that add up to its Lab rating', () => {
    const byId = new Map(KNICKS.map((row) => [row.nba_id, row]));
    byId.set(99, player(99, 'New York Knicks', { dpm: null }));
    // 102 minutes plus an unrated player and a player at zero: the Lab rates it as if it filled 240.
    const roster = [
        { id: 1, minutes: 40 },
        { id: 2, minutes: 30 },
        { id: 3, minutes: 12 },
        { id: 99, minutes: 20 },
        { id: 10, minutes: 0 }
    ];
    const rows = rosterContributions(roster, byId);
    const lab = rateRoster(roster, byId);
    assert.deepEqual(rows.map((row) => row.id).sort(), [1, 2, 3]);
    assert.ok(near(rows.reduce((sum, row) => sum + row.total, 0), lab.rating));
    assert.ok(near(rows.reduce((sum, row) => sum + row.offense, 0), lab.offense));
    assert.ok(near(rows.reduce((sum, row) => sum + row.defense, 0), lab.defense));
});

// A starter whose offense and defense cancel, a rotation player and two deep-bench players.
const MIXED = [
    { id: 1, name: 'Starter', minutes: 36, dpm: 0.05, oDpm: 2, dDpm: -1.95, offense: 1.5, defense: -1.46, total: 0.04 },
    { id: 2, name: 'Rotation', minutes: 20, dpm: 1, oDpm: 0.7, dDpm: 0.3, offense: 0.3, defense: 0.12, total: 0.42 },
    { id: 3, name: 'Bench A', minutes: 4.9, dpm: -2, oDpm: -1, dDpm: -1, offense: -0.1, defense: -0.1, total: -0.2 },
    { id: 4, name: 'Bench B', minutes: 1.1, dpm: 3, oDpm: 2, dDpm: 1, offense: 0.05, defense: 0.02, total: 0.07 }
];

test('the deep bench folds by minutes, never by contribution', () => {
    assert.equal(DEEP_BENCH_MINUTES, 5);
    const folded = foldDeepBench(MIXED);
    // The starter's net is nearly zero, but he plays 36 minutes, so he keeps his row.
    assert.deepEqual(folded.map((row) => row.id), [1, 2, 'deep-bench']);
    const bench = folded.at(-1);
    assert.equal(bench.bench, true);
    assert.deepEqual(bench.players.map((row) => row.id), [3, 4]);
    assert.ok(near(bench.minutes, 6));
    assert.ok(near(bench.total, -0.13));
    assert.ok(near(bench.offense + bench.defense, bench.total));
    assert.ok(near(bench.dpm, (-2 * 4.9 + 3 * 1.1) / 6));
    // One short-minutes player keeps his own row.
    assert.deepEqual(foldDeepBench(MIXED.slice(0, 3)).map((row) => row.id), [1, 2, 3]);
});

test('sorting by a column keeps the deep bench last', () => {
    const folded = foldDeepBench(MIXED);
    assert.deepEqual(sortContributions(folded, 'total').map((row) => row.id), [2, 1, 'deep-bench']);
    assert.deepEqual(sortContributions(folded, 'offense').map((row) => row.id), [1, 2, 'deep-bench']);
    assert.deepEqual(sortContributions(folded, 'defense').map((row) => row.id), [2, 1, 'deep-bench']);
});

test('the summary splits the rating into what above- and below-average players add', () => {
    const rows = ratingContributions(KNICKS);
    const lab = rateRoster(defaultRoster(KNICKS), new Map(KNICKS.map((row) => [row.nba_id, row])));
    const summary = contributionSummary(rows);
    assert.equal(summary.aboveCount, 9);
    assert.equal(summary.belowCount, 1);
    assert.ok(summary.below < 0 && summary.above > lab.rating);
    assert.ok(near(summary.above + summary.below, lab.rating));
    assert.ok(near(summary.total, lab.rating));
});

test('one scale covers the offense, defense and net columns and zero', () => {
    const folded = foldDeepBench(MIXED);
    assert.deepEqual(contributionExtent(folded), { low: -1.46, high: 1.5 });
    assert.deepEqual(contributionExtent([{ offense: 0.2, defense: 0.1, total: 0.3 }]), { low: 0, high: 0.3 });
});

test('the build-up keeps the deep bench last and marks the peak it falls back from', () => {
    const waterfall = ratingWaterfall(foldDeepBench(MIXED), 'total');
    assert.deepEqual(waterfall.steps.map((step) => step.id), [2, 1, 'deep-bench']);
    assert.ok(near(waterfall.peak, 0.46));
    assert.ok(near(waterfall.total, 0.33));
    // A team that only climbs, or only falls, has no peak to mark.
    assert.equal(ratingWaterfall(MIXED.slice(0, 2), 'total').peak, null);
    assert.equal(ratingWaterfall(MIXED.slice(2), 'total').peak, 0.07);
    assert.equal(ratingWaterfall([MIXED[2]], 'total').peak, null);
});

test('the minutes chart: widths are minutes shares and areas add up to the rating', () => {
    const byId = new Map(KNICKS.map((row) => [row.nba_id, row]));
    // 235 minutes with two deep-bench players.
    const roster = [
        { id: 1, minutes: 38 },
        { id: 2, minutes: 34 },
        { id: 3, minutes: 30 },
        ...[10, 11, 12, 13, 14, 15].map((id) => ({ id, minutes: 21 })),
        { id: 16, minutes: 3 },
        { id: 100, minutes: 4 }
    ];
    byId.set(100, CELTICS[0]);
    const rows = foldDeepBench(rosterContributions(roster, byId));
    const lab = rateRoster(roster, byId);
    const profile = minutesProfile(rows);
    assert.ok(near(profile.minutes, 235));
    assert.ok(near(profile.rating, lab.rating));
    assert.ok(near(profile.mean * 5, lab.rating));
    // Contiguous widths from 0 to 1, best DPM first, the deep bench last.
    assert.equal(profile.bars[0].x0, 0);
    assert.equal(profile.bars.at(-1).x1, 1);
    for (let i = 1; i < profile.bars.length; i += 1) assert.ok(near(profile.bars[i].x0, profile.bars[i - 1].x1));
    const players = profile.bars.filter((bar) => !bar.bench);
    assert.ok(players.every((bar, i) => i === 0 || players[i - 1].dpm >= bar.dpm));
    assert.equal(profile.bars.at(-1).id, 'deep-bench');
    // Each bar's area (DPM x share x 5) is that row's contribution, the deep bench's included.
    for (const bar of profile.bars) assert.ok(near(bar.dpm * bar.share * 5, bar.total), bar.name);
    assert.equal(profile.low, -1);
    assert.equal(profile.high, 4);
    assert.deepEqual(minutesProfile([]).bars, []);
});
