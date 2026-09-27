import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
    AS_OF_PARAM,
    asOfWindowStart,
    frameIndexAtOrBefore,
    isDateAwarePath,
    locateDate,
    parseAsOfDate,
    relativeHref,
    withAsOf
} from '../src/lib/utils/timeMachine.js';
import { firstFrameOfSeason, lastName, reignsThrough, seasonWeek } from '../src/lib/utils/rewind.js';
import {
    TEAM_MINUTES,
    MAX_PLAYER_MINUTES,
    addToScenario,
    dedupeEdits,
    defaultRoster,
    gameWinProbability,
    normalCdf,
    rateRoster,
    rebalance,
    resetScenarioTeam,
    scenarioRoster,
    seriesWinProbability,
    winsFor
} from '../src/lib/utils/rosterLab.js';
import { NBA_TEAMS } from '../src/lib/utils/teamAbbreviations.js';
import { packRows, unpackRows } from '../src/lib/utils/columnar.js';

const CALENDAR = [
    { season: 2019, first_game: '2018-10-16', earliest_team_finale: '2019-04-10', regular_season_end: '2019-04-10', last_game: '2019-06-13' },
    { season: 2020, first_game: '2019-10-22', earliest_team_finale: '2020-03-10', regular_season_end: '2020-08-14', last_game: '2020-10-11' }
];

function assertClose(actual, expected, tolerance = 1e-6) {
    assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);
}

test('as-of dates must be real calendar dates inside DARKO history', () => {
    assert.equal(parseAsOfDate('2016-03-10'), '2016-03-10');
    assert.equal(parseAsOfDate(' 2016-03-10 '), '2016-03-10');
    assert.equal(parseAsOfDate('2016-02-30'), null);
    assert.equal(parseAsOfDate('1990-01-01'), null);
    assert.equal(parseAsOfDate('yesterday'), null);
    assert.equal(parseAsOfDate(null), null);
});

test('the Time Machine rides along in the query string', () => {
    const url = new URL('https://darko.app/player/203999?season=2020#seismograph');
    assert.equal(relativeHref(withAsOf(url, '2020-02-06')), `/player/203999?season=2020&${AS_OF_PARAM}=2020-02-06#seismograph`);
    assert.equal(relativeHref(withAsOf(new URL('https://darko.app/?asof=2020-02-06'), null)), '/');
    assert.equal(isDateAwarePath('/'), true);
    assert.equal(isDateAwarePath('/player/203999'), true);
    assert.equal(isDateAwarePath('/lab'), true);
    assert.equal(isDateAwarePath('/rewind'), true);
    assert.equal(isDateAwarePath('/standings'), false);
});

test('dates are placed in a season phase', () => {
    assert.equal(locateDate(CALENDAR, '2019-01-15').phase, 'regular');
    assert.equal(locateDate(CALENDAR, '2019-05-01').phase, 'playoffs');
    assert.equal(locateDate(CALENDAR, '2019-07-20').phase, 'offseason');
    assert.equal(locateDate(CALENDAR, '2019-10-10').phase, 'preseason');
    assert.equal(locateDate(CALENDAR, '2020-08-01').season, 2020);
});

test('snapshots look back four weeks, past every team finale once one team is done', () => {
    assert.equal(asOfWindowStart('2019-01-15', CALENDAR[0]), '2018-12-19');
    assert.equal(asOfWindowStart('2018-10-20', CALENDAR[0]), '2018-10-16');
    assert.equal(asOfWindowStart('2019-05-20', CALENDAR[0]), '2019-03-14');
    // The 2019-20 teams left out of the bubble last played March 10.
    assert.equal(asOfWindowStart('2020-08-05', CALENDAR[1]), '2020-02-12');
    assert.equal(asOfWindowStart('2019-01-15', null), '2018-12-19');
});

test('frames are found on or before a date', () => {
    const dates = ['2020-01-01', '2020-01-08', '2020-01-15'];
    assert.equal(frameIndexAtOrBefore(dates, '2019-12-31'), -1);
    assert.equal(frameIndexAtOrBefore(dates, '2020-01-08'), 1);
    assert.equal(frameIndexAtOrBefore(dates, '2020-01-10'), 1);
    assert.equal(frameIndexAtOrBefore(dates, '2021-01-01'), 2);
});

test('Rewind counts weeks at No. 1 and places a frame in its season', () => {
    const frames = [
        { date: '2019-04-01', season: 2019, players: [[1, 800, 500, 10]] },
        { date: '2019-10-28', season: 2020, players: [[2, 700, 400, 11]] },
        { date: '2019-11-04', season: 2020, players: [[1, 750, 450, 10]] },
        { date: '2019-11-11', season: 2020, players: [[1, 760, 460, 10]] }
    ];
    assert.deepEqual(seasonWeek(frames, 2), { season: 2020, week: 2, weeks: 3, first: 1, last: 3 });
    assert.deepEqual(reignsThrough(frames, 2), [[1, 2], [2, 1]]);
    assert.equal(firstFrameOfSeason(frames, 2020), 1);
    assert.equal(lastName('Shai Gilgeous-Alexander'), 'Gilgeous-Alexander');
    assert.equal(lastName('Jaren Jackson Jr.'), 'Jackson Jr.');
});

test('rebalancing fills 240 minutes, holds the moved player and caps everyone at 42', () => {
    const roster = [40, 34, 32, 30, 28, 24, 20, 16].map((minutes, index) => ({ id: index + 1, minutes }));
    const balanced = rebalance(roster, 8);
    const total = balanced.reduce((sum, row) => sum + row.minutes, 0);
    assertClose(total, TEAM_MINUTES, 0.2);
    assert.equal(balanced.find((row) => row.id === 8).minutes, 16);
    assert.ok(balanced.every((row) => row.minutes <= MAX_PLAYER_MINUTES));
    assert.equal(balanced[0].minutes, MAX_PLAYER_MINUTES);
    assert.equal(roster[0].minutes, 40, 'the input roster is not mutated');
});

test('a default rotation uses projected minutes for up to 15 players', () => {
    const players = Array.from({ length: 18 }, (_, index) => ({ nba_id: index + 1, x_minutes: 36 - index * 2 }));
    const roster = defaultRoster(players);
    assert.equal(roster.length, 15);
    assert.equal(roster[0].id, 1);
    assertClose(roster.reduce((sum, row) => sum + row.minutes, 0), TEAM_MINUTES, 0.2);
});

test('team ratings are minutes-weighted DPM scaled to 240 minutes', () => {
    const byId = new Map([
        [1, { dpm: 6, o_dpm: 4 }],
        [2, { dpm: 0, o_dpm: 1 }]
    ]);
    const rating = rateRoster([{ id: 1, minutes: 120 }, { id: 2, minutes: 120 }], byId);
    assertClose(rating.rating, 15);
    assertClose(rating.offense, 12.5);
    assertClose(rating.defense, 2.5);
    // Half the minutes give the same rating per 240: the scale does not punish an unfinished rotation.
    assertClose(rateRoster([{ id: 1, minutes: 60 }, { id: 2, minutes: 60 }], byId).rating, 15);
    assert.equal(winsFor(0, 0), 41);
    assertClose(winsFor(3, 1), 41 + 2.7 * 2);
    assert.equal(winsFor(40, 0), 82);
});

test('matchup odds are symmetric and a best-of-seven magnifies an edge', () => {
    assertClose(normalCdf(0), 0.5);
    assertClose(normalCdf(1.96), 0.975, 1e-3);
    const { probability, margin } = gameWinProbability(5, 2, 100);
    assertClose(margin, 3);
    assertClose(probability + gameWinProbability(2, 5, 100).probability, 1);
    assertClose(seriesWinProbability(0.5), 0.5);
    assertClose(seriesWinProbability(0.6), 0.710208, 1e-5);
    assert.equal(NBA_TEAMS.length, 30);
});

test('the layout carries the Time Machine and Rewind never reloads its history', async () => {
    const [layout, rewindServer, history, supabase] = await Promise.all([
        fs.readFile('src/routes/+layout.svelte', 'utf8'),
        fs.readFile('src/routes/rewind/+page.server.js', 'utf8'),
        fs.readFile('src/lib/server/history.js', 'utf8'),
        fs.readFile('src/lib/server/supabase.js', 'utf8')
    ]);
    assert.match(layout, /<TimeMachine \/>/);
    assert.match(layout, /beforeNavigate\(\(navigation\) => \{/);
    assert.match(layout, /href: '\/rewind', label: 'Rewind'/);
    assert.match(layout, /href: '\/lab', label: 'Roster Lab'/);
    assert.doesNotMatch(rewindServer, /url/);
    assert.match(history, /if \(!dev \|\| !env\.DARKO_LOCAL_DATA_DIR\) return null;/);
    assert.match(supabase, /export async function getPlayersAsOf\(asOf, calendar = null\)/);
});

test('career histories round-trip through the column-by-column transport', () => {
    const rows = [
        { nba_id: 1, date: '2020-01-01', dpm: 1.5, team_name: 'Boston Celtics' },
        { nba_id: 1, date: '2020-01-03', dpm: -0.25, team_name: null },
        { nba_id: 1, date: '2020-01-05', dpm: 2, extra: 'late field' }
    ];
    const packed = packRows(rows);
    assert.deepEqual(packed.keys, ['nba_id', 'date', 'dpm', 'team_name', 'extra']);
    assert.deepEqual(unpackRows(packed), [
        { nba_id: 1, date: '2020-01-01', dpm: 1.5, team_name: 'Boston Celtics', extra: null },
        { nba_id: 1, date: '2020-01-03', dpm: -0.25, team_name: null, extra: null },
        { nba_id: 1, date: '2020-01-05', dpm: 2, team_name: null, extra: 'late field' }
    ]);
    assert.deepEqual(unpackRows(packRows([])), []);
});

test('the heaviest pages ship their rows column by column', async () => {
    const [leaderboardServer, leaderboardPage, playerServer, playerPage] = await Promise.all([
        fs.readFile('src/routes/+page.server.js', 'utf8'),
        fs.readFile('src/routes/+page.svelte', 'utf8'),
        fs.readFile('src/routes/player/[nbaId]/+page.server.js', 'utf8'),
        fs.readFile('src/routes/player/[nbaId]/+page.svelte', 'utf8')
    ]);
    assert.match(leaderboardServer, /players: packRows\(/);
    assert.match(leaderboardPage, /unpackRows\(data\.players\)/);
    assert.match(playerServer, /history: packRows\(historyRows\)/);
    assert.match(playerPage, /unpackRows\(data\.history\)/);
});

test('a folded Time Machine is restored before paint from the same storage key the strip writes', async () => {
    const [html, state, css] = await Promise.all([
        fs.readFile('src/app.html', 'utf8'),
        fs.readFile('src/lib/timeMachineState.svelte.js', 'utf8'),
        fs.readFile('src/app.css', 'utf8')
    ]);
    const key = state.match(/TIME_MACHINE_COLLAPSED_KEY = '([^']+)'/)?.[1];
    assert.ok(key, 'the state module names its storage key');
    assert.ok(html.includes(`localStorage.getItem('${key}') === 'collapsed'`), 'app.html reads the same key');
    assert.match(html, /dataset\.timeMachine = 'collapsed'/);
    assert.match(css, /:root\[data-time-machine='collapsed'\] \{\s*--time-machine-height: 0px;/);
});

test('the time colour is each theme accent, not a colour of its own', async () => {
    const css = await fs.readFile('src/app.css', 'utf8');
    assert.match(css, /--time: var\(--accent\);/);
    assert.match(css, /--time-text: var\(--accent\);/);
    assert.equal((css.match(/--time(-text)?:/g) ?? []).length, 2, 'no theme overrides the time colour');
});

test('rebalancing shrinks capped players when the moved one fills the room', () => {
    const roster = [42, 42, 42, 42, 42, 30].map((minutes, index) => ({ id: index + 1, minutes }));
    roster[5].minutes = 42;
    const balanced = rebalance(roster, 6);
    assert.deepEqual(balanced.map((row) => row.minutes), [39.6, 39.6, 39.6, 39.6, 39.6, 42]);
});

test('rebalanced minutes total exactly 240 after rounding, and a short roster stays short', () => {
    const uneven = rebalance([10, 20, 33, 7, 12, 25, 9].map((minutes, index) => ({ id: index + 1, minutes })));
    assert.equal(Math.round(uneven.reduce((sum, row) => sum + row.minutes, 0) * 10) / 10, TEAM_MINUTES);
    const short = rebalance([30, 30, 30, 30].map((minutes, index) => ({ id: index + 1, minutes })));
    assert.deepEqual(short.map((row) => row.minutes), [42, 42, 42, 42]);
});

function labFixture() {
    const home = new Map([[1, 'NYK'], [2, 'SAS'], [3, 'MIL'], [4, 'NYK'], [5, 'SAS'], [6, 'MIL']]);
    const baseRosters = new Map([
        ['NYK', [{ id: 1, minutes: 30 }, { id: 4, minutes: 30 }]],
        ['SAS', [{ id: 2, minutes: 30 }, { id: 5, minutes: 30 }]],
        ['MIL', [{ id: 3, minutes: 30 }, { id: 6, minutes: 30 }]]
    ]);
    return { baseRosters, homeOf: (id) => home.get(id) ?? null };
}

function owners(edits, baseRosters) {
    const seen = new Map();
    for (const abbr of baseRosters.keys()) {
        for (const row of scenarioRoster(abbr, edits, baseRosters)) {
            seen.set(row.id, [...(seen.get(row.id) ?? []), abbr]);
        }
    }
    return seen;
}

test('a Lab trade then a reset leaves every player on one team', () => {
    const { baseRosters, homeOf } = labFixture();
    let edits = addToScenario({}, baseRosters, { to: 'NYK', id: 2, homeOf });
    assert.deepEqual(owners(edits, baseRosters).get(2), ['NYK']);
    edits = resetScenarioTeam(edits, baseRosters, 'SAS', { homeOf });
    assert.deepEqual(owners(edits, baseRosters).get(2), ['SAS'], 'resetting SAS brings its player home');
    assert.ok([...owners(edits, baseRosters).values()].every((teams) => teams.length === 1));
});

test('adding a player from an off-screen team takes them off that team', () => {
    const { baseRosters, homeOf } = labFixture();
    const edits = addToScenario({}, baseRosters, { to: 'NYK', id: 3, homeOf });
    assert.deepEqual(owners(edits, baseRosters).get(3), ['NYK']);
    const milwaukee = scenarioRoster('MIL', edits, baseRosters);
    assert.deepEqual(milwaukee.map((row) => [row.id, row.minutes]), [[6, 42]], 'MIL rebalances without them');
    assert.equal(edits.NYK.find((row) => row.id === 3).from, 'MIL');
});

test('resetting a team sends acquired players back to an edited home team', () => {
    const { baseRosters, homeOf } = labFixture();
    let edits = addToScenario({}, baseRosters, { to: 'SAS', id: 1, homeOf });
    edits = addToScenario(edits, baseRosters, { to: 'NYK', id: 3, homeOf });
    edits = resetScenarioTeam(edits, baseRosters, 'SAS', { homeOf });
    const map = owners(edits, baseRosters);
    assert.deepEqual(map.get(1), ['NYK']);
    assert.deepEqual(map.get(3), ['NYK']);
    assert.ok([...map.values()].every((teams) => teams.length === 1));
});

test('saved edits that list a player twice keep the first team only', () => {
    const edits = dedupeEdits({ NYK: [{ id: 2, minutes: 30 }], SAS: [{ id: 2, minutes: 30 }, { id: 5, minutes: 30 }] });
    assert.deepEqual(edits, { NYK: [{ id: 2, minutes: 30 }], SAS: [{ id: 5, minutes: 30 }] });
});

test('on the leaderboard the Time Machine replaces the season picker in both directions', () => {
    const rewound = new URL('https://darko.app/?season=2016&asof=2016-02-22');
    assert.equal(relativeHref(withAsOf(rewound, null)), '/', 'Back to today opens the current leaderboard');
    assert.equal(relativeHref(withAsOf(new URL('https://darko.app/?season=2016'), '2016-02-22')), '/?asof=2016-02-22');
    assert.equal(relativeHref(withAsOf(new URL('https://darko.app/wowy?season=2016'), null)), '/wowy?season=2016');
});

test('Rewind says where its weeks begin rather than showing a later week for an earlier date', async () => {
    const page = await fs.readFile('src/routes/rewind/+page.svelte', 'utf8');
    assert.doesNotMatch(page, /Math\.max\(0, frameIndexAtOrBefore\(/);
    assert.match(page, /\{:else if !frame\}\s*<div class="empty-state rewind-before"/);
    assert.match(page, /onclick=\{\(\) => goTo\(0\)\}/);
    assert.equal(frameIndexAtOrBefore(['1996-11-07', '1996-11-14'], '1996-11-01'), -1);
});
