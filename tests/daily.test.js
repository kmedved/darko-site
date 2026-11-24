import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { ASK_PAGES } from '../src/lib/utils/askDarko.js';
import {
    ageRecordText,
    boardRows,
    chooseWindow,
    datedSeriesFrom,
    daysBefore,
    editionPhase,
    headline,
    lastName,
    lede,
    minGamesFor,
    MOVERS_SHOWN,
    movesByWindow,
    ordinal,
    pickMovers,
    ROTATION_MINUTES,
    rotationIds,
    seasonFromStart,
    seriesFrom,
    UPDATE_MIN_MINUTES,
    watchCards,
    withWindowMinutes
} from '../src/lib/utils/daily.js';
import { isDateAwarePath } from '../src/lib/utils/timeMachine.js';

function move(period, id, games, delta, extra = {}) {
    return {
        period,
        start_date: period === 'season' ? '2025-10-21' : '2026-03-01',
        end_date: '2026-03-08',
        nba_id: id,
        player_name: `Player ${id}`,
        tm_id: 1610612752,
        games,
        dpm_from: 1,
        o_from: 0.5,
        dpm_to: 1 + delta,
        o_to: 0.5 + delta / 2,
        delta,
        o_delta: delta / 2,
        ...extra
    };
}

test('movers need games in proportion to the window', () => {
    assert.equal(minGamesFor('7'), 2);
    assert.equal(minGamesFor('30'), 5);
    // About a fifth of the days since opening night, between 2 and 20.
    assert.equal(minGamesFor('season', { start: '2025-10-21', end: '2025-10-25' }), 2);
    assert.equal(minGamesFor('season', { start: '2025-10-21', end: '2025-12-01' }), 9);
    assert.equal(minGamesFor('season', { start: '2025-10-21', end: '2026-07-26' }), 20);
});

test('risers and fallers come from players with enough games, biggest moves first', () => {
    const rows = [
        ...Array.from({ length: 8 }, (_, index) => move('7', index + 1, 3, index - 4)),
        move('7', 50, 1, 9),
        ...Array.from({ length: 8 }, (_, index) => move('season', index + 1, 60, index))
    ];
    const byWindow = movesByWindow(rows);
    assert.deepEqual(Object.keys(byWindow).sort(), ['7', 'season']);
    const week = pickMovers(byWindow['7'], '7');
    // One game is too few for the week, however big the move.
    assert.ok(!week.risers.some((row) => row.id === 50));
    assert.deepEqual(week.risers.map((row) => row.delta), [3, 2, 1, 0, -1, -2]);
    assert.deepEqual(week.fallers.map((row) => row.delta).slice(0, 2), [-4, -3]);
    assert.equal(week.risers.length, MOVERS_SHOWN);

    // Enough movers: the week stays; too few (the month has none): the season instead.
    assert.deepEqual(chooseWindow(byWindow, '7'), { key: '7', fellBack: false });
    assert.deepEqual(chooseWindow(byWindow, '30'), { key: 'season', fellBack: true, played: false, minGames: 5 });
    assert.deepEqual(chooseWindow(byWindow, 'nonsense'), { key: '7', fellBack: false });
    // Opening week: everyone has played once, too few for the week's two games.
    const opening = movesByWindow(Array.from({ length: 8 }, (_, index) => move('7', index + 1, 1, index)));
    assert.deepEqual(chooseWindow(opening, '7'), { key: 'season', fellBack: true, played: true, minGames: 2 });
});

test('the rotation is players averaging 20+ minutes a game in the window', () => {
    assert.equal(ROTATION_MINUTES, 20);
    const byWindow = movesByWindow([
        ...Array.from({ length: 8 }, (_, index) => move('7', index + 1, 2, index + 1)),
        move('7', 9, 2, 9),
        move('7', 10, 2, -9),
        ...Array.from({ length: 10 }, (_, index) => move('season', index + 1, 40, index))
    ]);
    const starts = { 7: '2026-03-01', season: '2025-10-20' };
    const end = '2026-03-08';
    const games = [];
    for (let id = 1; id <= 8; id += 1) {
        games.push({ nba_id: id, date: '2026-03-03', minutes: 30 }, { nba_id: id, date: '2026-03-06', minutes: 24 });
    }
    // Two deep-bench players with the week's biggest moves.
    games.push({ nba_id: 9, date: '2026-03-03', minutes: 12 }, { nba_id: 9, date: '2026-03-06', minutes: 9 });
    games.push({ nba_id: 10, date: '2026-03-04', minutes: 14 }, { nba_id: 10, date: '2026-03-07', minutes: 16 });
    // Outside the week: on its first day (the window starts after it), after its end, and earlier.
    games.push({ nba_id: 9, date: '2026-03-01', minutes: 48 }, { nba_id: 9, date: '2026-03-09', minutes: 48 });
    games.push({ nba_id: 10, date: '2026-01-10', minutes: 40 });

    const withMinutes = withWindowMinutes(byWindow, games, starts, end);
    const mpg = (key, id) => withMinutes[key].rows.find((row) => row.id === id).mpg;
    assert.equal(mpg('7', 1), 27);
    assert.equal(mpg('7', 9), 10.5);
    assert.equal(mpg('7', 10), 15);
    assert.equal(mpg('season', 10), (14 + 16 + 40) / 3);
    // Movers without a game in the window get no minutes, and so never count as rotation.
    assert.equal(withMinutes.season.rows.find((row) => row.id === 1).mpg, 27);
    assert.deepEqual(rotationIds(withMinutes)['7'], [1, 2, 3, 4, 5, 6, 7, 8]);

    const all = pickMovers(withMinutes['7'], '7');
    assert.equal(all.risers[0].id, 9);
    assert.equal(all.fallers[0].id, 10);
    const rotation = pickMovers(withMinutes['7'], '7', { scope: 'rotation' });
    assert.deepEqual(rotation.risers.map((row) => row.id), [8, 7, 6, 5, 4, 3]);
    assert.equal(rotation.fallers[0].id, 1);
    assert.equal(rotation.eligible, 8);
    // Rows without minutes (the season's minutes failed to load) are never rotation players.
    assert.equal(pickMovers(byWindow['7'], '7', { scope: 'rotation' }).eligible, 0);
    assert.deepEqual(chooseWindow(withMinutes, '7', { scope: 'rotation' }), { key: '7', fellBack: false });
    assert.equal(chooseWindow(byWindow, '7', { scope: 'rotation' }).key, 'season');
});

test('the edition follows this past week\'s games', () => {
    assert.equal(editionPhase([]), 'offseason');
    assert.equal(editionPhase([{ game_type: 2 }]), 'season');
    assert.equal(editionPhase([{ game_type: 2 }, { game_type: 4 }]), 'playoffs');
    assert.equal(editionPhase([{ game_type: 5 }]), 'playoffs');
});

test('the headline and lede write themselves from the board and the movers', () => {
    const leader = { name: 'Nikola Jokic', dpm: 6.76, offense: 4.79, defense: 1.97 };
    const riser = { name: 'Dylan Harper', delta: 3.54 };
    const faller = { name: 'Gary Trent Jr.', delta: -2.84 };
    assert.equal(
        headline({ leader, riser, phase: 'offseason', key: 'season' }),
        "Jokic finishes on top; Harper is the season's biggest riser"
    );
    assert.equal(headline({ leader, riser: null, phase: 'season', key: '7' }), 'Jokic leads the league');
    assert.equal(headline({ leader: null }), 'The Daily');
    assert.equal(
        lede({ leader, riser, faller, phase: 'offseason', key: 'season', minGames: 20, nextSeasonLabel: '2026-27' }),
        'Nikola Jokic heads into 2026-27 atop DARKO at +6.76 per 100 possessions (+4.79 offense, +1.97 defense). ' +
            'Dylan Harper has climbed +3.54 since opening night, the biggest rise among players with 20+ games. ' +
            'Gary Trent Jr. has slid -2.84.'
    );
    assert.match(lede({ leader, phase: 'season', key: '7' }), /^Nikola Jokic sits atop DARKO/);
    assert.match(
        lede({ leader, riser, phase: 'season', key: '7', minGames: 2, minMinutes: 20 }),
        /the biggest rise among players with 2\+ games and 20\+ minutes a game\./
    );
});

test('names, ordinals and age records read naturally', () => {
    assert.equal(lastName('Victor Wembanyama'), 'Wembanyama');
    assert.equal(lastName('Gary Trent Jr.'), 'Trent Jr.');
    assert.equal(lastName('Nene'), 'Nene');
    assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal), [
        '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st'
    ]);
    assert.equal(
        ageRecordText({ age: 22.41, dpm: 6.2108, age_rank: 1 }),
        "posted +6.21 at age 22, the best age-22 season in DARKO's history."
    );
    assert.equal(
        ageRecordText({ age: 31.19, dpm: 7.35, age_rank: 4 }),
        "posted +7.35 at age 31, the 4th-best age-31 season in DARKO's history."
    );
});

test('boards, sparklines and watch cards come from plain rows', () => {
    const players = [
        { nba_id: 1, player_name: 'One', team_name: 'Denver Nuggets', dpm: 6.8, o_dpm: 4.8, d_dpm: null },
        { nba_id: 2, player_name: 'Two', team_name: 'San Antonio Spurs', dpm: '6.4', o_dpm: 2, d_dpm: 4.4 },
        { nba_id: 3, player_name: 'Three', team_name: null, dpm: null, o_dpm: null, d_dpm: null }
    ];
    const board = boardRows(players);
    assert.deepEqual(board.map((row) => row.id), [1, 2]);
    assert.ok(Math.abs(board[0].defense - 2) < 1e-9);

    const series = { 2: [['2025-10-22', 3], ['2026-03-02', 5], ['2026-03-05', 6.4]] };
    assert.deepEqual(seriesFrom(series[2], '2026-03-01'), [5, 6.4]);
    assert.deepEqual(seriesFrom(series[2], null), [3, 5, 6.4]);
    // The featured chart keeps the dates; the rating out of the last game counts from the next day.
    assert.deepEqual(
        datedSeriesFrom([['2026-03-02', 5], ['2026-03-05', 6.4], ['2026-03-05', 6.9], ['2026-03-06', null]], '2026-03-01'),
        [['2026-03-02', 5], ['2026-03-05', 6.4], ['2026-03-06', 6.9]]
    );
    assert.deepEqual(datedSeriesFrom(null, null), []);

    const byWindow = movesByWindow([move('season', 2, 60, 1.4), move('7', 2, 3, 0.2)]);
    const [card] = watchCards([2, 99], { players, byWindow, series });
    assert.equal(card.rank, 2);
    assert.deepEqual(card.changes, { 7: { delta: 0.2, games: 3 }, 30: null, season: { delta: 1.4, games: 60 } });
    assert.equal(card.series.length, 3);

    assert.equal(seasonFromStart('2025-10-21'), 2026);
    assert.equal(daysBefore('2026-03-08', 7), '2026-03-01');
});

test('the page, the menu, Ask DARKO and the Time Machine all lead to The Daily', async () => {
    const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');
    const layout = await read('src/routes/+layout.svelte');
    assert.match(layout, /\{ href: '\/daily', label: 'The Daily'/);
    assert.ok(ASK_PAGES.some((entry) => entry.href === '/daily' && entry.re.test('daily') && entry.re.test('movers')));
    assert.ok(isDateAwarePath('/daily'));

    const load = await read('src/routes/daily/+page.server.js');
    assert.match(load, /return asOfDate \? rewound\(asOfDate\) : latest\(\);/);
    // Single-game updates come from games of 10+ minutes.
    assert.equal(UPDATE_MIN_MINUTES, 10);
    assert.match(load, /getBiggestUpdates\(starts\[key\], end, UPDATES_SHOWN, \{ minMinutes: UPDATE_MIN_MINUTES \}\)/);
    const server = await read('src/lib/server/daily.js');
    for (const table of ['rating_moves', 'game_updates', 'player_seasons']) {
        assert.match(server, new RegExp(`from\\('${table}'\\)`));
        assert.match(server, new RegExp(`readLocalTable\\('${table}'\\)`));
    }
    // Until the pipeline publishes the tables, the page says they are coming.
    assert.match(server, /if \(isMissingTable\(error\)\) return null;/);

    const player = await read('src/routes/player/[nbaId]/+page.svelte');
    assert.match(player, /<WatchStar nbaId=\{nbaId\}/);
});

test("single-game updates give the offense/defense bar the row's room, and empty age records say why", async () => {
    const page = await fs.readFile(path.resolve(process.cwd(), 'src/routes/daily/+page.svelte'), 'utf8');

    // The bar's column scales with the panel, between today's 72px and about 110px.
    assert.match(page, /\.daily-panel \{[^}]*container-type: inline-size;/);
    const column = page.match(/\.update \{\s*grid-template-columns: 52px minmax\(0, 1fr\) clamp\((\d+)px, \d+cqi, (\d+)px\) 52px;/);
    assert.ok(column, 'the update row should size the bar column with clamp() on the panel width');
    assert.ok(Number(column[1]) >= 72 && Number(column[2]) >= 80 && Number(column[2]) <= 120);
    // Same colours and scale: the shared bar at max 2.2, hidden on phones as before.
    assert.match(page, /<span class="update-bar"><OffenseDefenseBar offense=\{row\.o_update\} defense=\{row\.d_update\} max=\{2\.2\} \/><\/span>/);
    assert.match(page, /@media \(max-width: 560px\) \{[\s\S]*?\.update-bar \{\s*display: none;/);

    assert.match(page, /<p class="empty">No age records yet\. This season's players qualify once they reach 20 regular-season games\.<\/p>/);
    assert.doesNotMatch(page, /No age records this season\./);
});

test('The Daily defaults to the rotation and falls back to every player without minutes', async () => {
    const server = await fs.readFile(path.resolve(process.cwd(), 'src/routes/daily/+page.server.js'), 'utf8');
    assert.match(server, /getGameMinutes\(starts\.season, end\)\.catch\(\(\) => null\)/);
    assert.match(server, /withWindowMinutes\(moves, gameMinutes, starts, end\)/);
    assert.match(server, /ids: ids\[key\] \?\? \[\]/);
    assert.match(server, /rotationUpdates,/);
    const page = await fs.readFile(path.resolve(process.cwd(), 'src/routes/daily/+page.svelte'), 'utf8');
    assert.match(page, /let scopeChoice = \$state\(DEFAULT_SCOPE\)/);
    assert.match(page, /const scope = \$derived\(rotationReady \? scopeChoice : 'all'\)/);
    assert.match(page, /pickMovers\(data\.windows\[windowKey\], windowKey, \{ scope \}\)/);
    assert.match(page, /aria-label="Players"/);
    assert.match(page, /minMinutes: rotation \? ROTATION_MINUTES : null/);
});
