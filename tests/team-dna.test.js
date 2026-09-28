import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultRoster, rateRoster } from '../src/lib/utils/rosterLab.js';
import {
    coreOutlook,
    leagueTeamRatings,
    niceTicks,
    payrollRows,
    ratingContributions,
    ratingWaterfall,
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
