import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    OFFSEASON_TEAM_ID,
    buildSeismograph,
    formatSigned,
    getSeismographSeasons,
    seasonOfRow,
    withGameNumbers
} from '../src/lib/utils/seismograph.js';
import { teamAbbrFromId } from '../src/lib/utils/teamAbbreviations.js';

function row(date, dpm, o, overrides = {}) {
    return {
        date,
        season: 2026,
        tm_id: 1610612760,
        team_name: 'Oklahoma City Thunder',
        opp_id: 1610612738,
        dpm,
        o_dpm: o,
        d_dpm: dpm - o,
        seconds_played: 1800,
        future_game: 0,
        ...overrides
    };
}

function assertClose(actual, expected, tolerance = 1e-9) {
    assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);
}

test('a game is credited with the change that shows up in the next row', () => {
    const { points, games } = buildSeismograph(
        [row('2025-10-22', 5, 4), row('2025-10-24', 5.3, 4.1), row('2025-10-26', 5.1, 4.2)],
        2026
    );
    assert.equal(games.length, 2);
    assertClose(points[0].update.dpm, 0.3);
    assertClose(points[0].update.o, 0.1);
    assertClose(points[0].update.d, 0.2);
    assertClose(points[1].update.dpm, -0.2);
    assert.equal(points[2].status, 'final');
    assert.equal(points[2].update, null);
});

test('games the player sat out get no update of their own', () => {
    const { points, games } = buildSeismograph(
        [
            row('2025-10-22', 5, 4),
            row('2025-10-24', 5.3, 4.1, { seconds_played: 0 }),
            row('2025-10-26', 5.32, 4.1),
            row('2025-10-28', 5.5, 4.3, { seconds_played: 0, future_game: 1 })
        ],
        2026
    );
    assert.deepEqual(points.map((point) => point.status), ['played', 'dnp', 'played', 'upcoming']);
    assert.equal(points[1].update, null);
    assert.equal(points[1].minutes, 0);
    assertClose(points[0].update.dpm, 0.3);
    assertClose(points[2].update.dpm, 0.18);
    assert.deepEqual(games.map((game) => game.date), ['2025-10-22', '2025-10-26']);
});

test('offseason rows end the season, so its last game has no update', () => {
    const { points, summary } = buildSeismograph(
        [
            row('2026-05-28', 5.95, 5.31),
            row('2026-05-30', 5.82, 5.2),
            row('2026-07-26', 5.61, 5.04, { tm_id: OFFSEASON_TEAM_ID, seconds_played: 0, future_game: 1 })
        ],
        2026
    );
    assert.equal(points.length, 2);
    assert.equal(points.at(-1).status, 'final');
    assertClose(summary.end, 5.82);
    assert.equal(summary.endStatus, 'final');
});

test('rows from other seasons stay out, and defense falls back to DPM minus offense', () => {
    const { points } = buildSeismograph(
        [
            row('2025-04-10', 3, 2, { season: 2025 }),
            row('2025-10-22', 5, 4, { d_dpm: null }),
            row('2025-10-24', 5.3, 4.1)
        ],
        2026
    );
    assert.equal(points.length, 2);
    assertClose(points[0].d, 1);
    assertClose(points[0].update.d, 0.2);
});

test('seasons list only seasons with a game played, newest first', () => {
    const rows = [
        row('2024-03-01', 1, 1, { season: 2024 }),
        row('2025-03-01', 1, 1, { season: 2025, seconds_played: 0 }),
        row('2025-11-01', 1, 1),
        row('2026-07-26', 1, 1, { tm_id: OFFSEASON_TEAM_ID, future_game: 1 })
    ];
    assert.deepEqual(getSeismographSeasons(rows), [2026, 2024]);
    assert.equal(seasonOfRow({ date: '2021-01-15' }), 2021);
    assert.equal(seasonOfRow({ date: '2020-12-22' }), 2021);
});

test('the summary finds the biggest moves and compares early and recent update sizes', () => {
    const rows = [];
    let dpm = 2;
    for (let i = 0; i < 40; i += 1) {
        const day = new Date(Date.UTC(2025, 9, 22 + i * 2)).toISOString().slice(0, 10);
        rows.push(row(day, dpm, dpm / 2));
        dpm += i < 20 ? (i % 2 ? -0.2 : 0.3) : (i % 2 ? -0.05 : 0.06);
    }
    const { summary, games } = buildSeismograph(rows, 2026);
    assert.equal(games.length, 39);
    assert.equal(summary.gamesPlayed, 40);
    assertClose(summary.best.update.dpm, 0.3);
    assertClose(summary.worst.update.dpm, -0.2);
    assert.equal(summary.window, 19);
    assert.ok(summary.recentUpdate < summary.earlyUpdate);
    assertClose(summary.change, summary.end - summary.start);
});

test('short seasons skip the early-versus-recent comparison', () => {
    const { summary } = buildSeismograph([row('2025-10-22', 5, 4), row('2025-10-24', 5.3, 4.1)], 2026);
    assert.equal(summary.window, 0);
    assert.equal(summary.earlyUpdate, null);
    assertClose(summary.typicalUpdate, 0.3);
});

test('each game names its opponent, and rows without one say nothing', () => {
    const { points } = buildSeismograph(
        [
            row('2025-10-22', 5, 4, { opp_id: 1610612745 }),
            row('2025-10-24', 5.3, 4.1, { opp_id: '1610612759' }),
            row('2025-10-26', 5.1, 4.2, { opp_id: undefined })
        ],
        2026
    );
    assert.deepEqual(points.map((point) => point.opponent), ['HOU', 'SAS', null]);
    assert.equal(teamAbbrFromId(1610612760), 'OKC');
    assert.equal(teamAbbrFromId(OFFSEASON_TEAM_ID), '');
    assert.equal(teamAbbrFromId(null), '');
});

test('signed formatting never shows negative zero', () => {
    assert.equal(formatSigned(0.123), '+0.12');
    assert.equal(formatSigned(-0.3), '-0.30');
    assert.equal(formatSigned(-0.001), '0.00');
    assert.equal(formatSigned(5.61, 1), '+5.6');
    assert.equal(formatSigned(null), '—');
});

test('every theme and the Shiny view define the offense and defense colors', async () => {
    const { readFile } = await import('node:fs/promises');
    const [appCss, shinyCss, shinyDesign, profile] = await Promise.all([
        readFile('src/app.css', 'utf8'),
        readFile('src/shiny-view.css', 'utf8'),
        readFile('src/lib/utils/shinyDesign.js', 'utf8'),
        readFile('src/routes/player/[nbaId]/+page.svelte', 'utf8')
    ]);
    for (const selector of [":root {", ":root[data-theme='black'] {", ":root[data-theme='light'] {", ":root[data-theme='white'] {"]) {
        const start = appCss.indexOf(selector);
        const block = appCss.slice(start, appCss.indexOf('}', start));
        assert.ok(start >= 0, `${selector} should exist`);
        assert.match(block, /--offense:\s*#[0-9a-f]{6};/, `${selector} should define --offense`);
        assert.match(block, /--defense:\s*#[0-9a-f]{6};/, `${selector} should define --defense`);
    }
    const shinyRoot = shinyCss.slice(shinyCss.indexOf(":root[data-view='shiny'] {"));
    assert.match(shinyRoot.slice(0, shinyRoot.indexOf('}')), /--offense:\s*#ed7d3a;[\s\S]*--defense:\s*#385bbb;/);
    assert.match(shinyDesign, /seismograph: Object\.freeze\(/);
    assert.match(profile, /<SeismographChart\s+\{seismograph\}/);
    assert.match(profile, /class="seismograph-kicker" data-shiny-role="editorial-kicker"/);
});

test('games are numbered as played: not the days sat out, a forecast or the offseason', () => {
    // Kobe's first days: a game he sat out, then three he played; then an offseason row and the
    // next season's forecast.
    const rows = withGameNumbers([
        { date: '1996-11-01', career_game_num: 1, seconds_played: 0, future_game: 0, tm_id: 1610612747 },
        { date: '1996-11-03', career_game_num: 2, seconds_played: 382, future_game: 0, tm_id: 1610612747 },
        { date: '1996-11-05', career_game_num: 3, seconds_played: 196, future_game: 0, tm_id: 1610612747 },
        { date: '1996-11-06', career_game_num: 4, seconds_played: 409, future_game: 0, tm_id: 1610612747 },
        { date: '1997-07-26', career_game_num: 5, seconds_played: 0, future_game: 1, tm_id: OFFSEASON_TEAM_ID },
        { date: '1997-10-31', career_game_num: 6, seconds_played: 0, future_game: 1, tm_id: 1610612747 }
    ]);
    assert.deepEqual(rows.map((row) => row.game_num), [null, 1, 2, 3, null, null]);
    assert.equal(rows[1].career_game_num, 2, 'the rest of the row is kept');
    assert.deepEqual(withGameNumbers(null), []);
});

test('Career Trajectories counts, plots and rolls over games played', async () => {
    const loader = await fs.readFile('src/lib/server/supabase.js', 'utf8');
    const start = loader.indexOf('const TRAJECTORY_RATING_COLUMNS = [');
    const columns = loader.slice(start, loader.indexOf("].join(', ');", start));
    assert.match(columns, /'seconds_played',\s*'future_game',/);
    // The history numbers the games and keeps the flags server-side.
    assert.match(loader, /rows: withGameNumbers\(history\.rows\)\.map\(\(\{ seconds_played, future_game, \.\.\.row \}\) => row\)/);

    const page = await fs.readFile('src/routes/trajectories/+page.svelte', 'utf8');
    assert.match(page, /function gameX\(row\) \{\s*const value = Number\.parseFloat\(isWowyMetric \? row\?\.career_game_num : row\?\.game_num\);/);
    // Games mode draws games played, at their number; the range filter and the summaries agree.
    assert.match(page, /\} else if \(timeScale === 'games'\) \{\s*rows = rows\.flatMap\(\(row\) => \{\s*const x = gameX\(row\);/);
    assert.match(page, /\} else \{\s*val = gameX\(row\);\s*\}/);
    assert.match(page, /const gamePoints = metricPoints\.filter\(\(point\) => gameX\(point\.row\) != null\);/);
    assert.match(page, /label: 'Games Played',\s*value: formatInteger\(gamePoints\.length\)/);
    assert.match(page, /const game = gameX\(row\);\s*if \(value == null \|\| game == null\) return null;/);
    assert.doesNotMatch(page, /Games Tracked/);
    const chart = await fs.readFile('src/lib/components/TrajectoryChart.svelte', 'utf8');
    assert.match(chart, /if \(timeScale === 'games'\) \{\s*\/\/ Games played, numbered by the page \(routes\/trajectories\)\.\s*const n = Number\.parseFloat\(row\._gameX\);/);
    assert.doesNotMatch(chart, /row\.career_game_num/);
});

test('Career Trajectories: no NBA ids on the chips, and the examples shrink to a row once a player is on', async () => {
    const page = await fs.readFile('src/routes/trajectories/+page.svelte', 'utf8');
    assert.doesNotMatch(page, /<small>\{p\.nba_id\}<\/small>/);
    assert.match(page, /\{#if selectedPlayers\.length === 0\}\s*<div class="trajectory-starter-grid"/);
    assert.match(page, /\{:else if moreStarters\.length > 0\}\s*<div class="trajectory-starter-row" aria-label="Suggested players">/);
    assert.match(page, /const moreStarters = \$derived\(\s*STARTER_PLAYERS\.filter\(\(starter\) => !selectedPlayers\.some/);
});
