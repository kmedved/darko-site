import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    latestSeason,
    monthTicks,
    snapDate,
    splitShare,
    stepDate,
    stripScale
} from '../src/lib/utils/timeStrip.js';

const CALENDAR = [
    { season: 2025, first_game: '2024-10-22', regular_season_end: '2025-04-13', last_game: '2025-06-22' },
    { season: 2026, first_game: '2025-10-21', regular_season_end: '2026-04-12', last_game: '2026-06-03' }
];
const PAST_FRAMES = ['2025-03-30', '2025-04-06', '2025-04-13'];
const DAYS = { seasonStart: '2025-10-21', lastGame: '2026-06-03', pastFrames: PAST_FRAMES, historyStart: '1996-11-01' };
const utc = (date) => new Date(`${date}T00:00:00Z`);
const iso = (date) => date.toISOString().slice(0, 10);

test('the latest season gets its own stretch of the strip, a bigger one on narrow strips', () => {
    assert.deepEqual(latestSeason(CALENDAR), { row: CALENDAR[1], start: '2025-10-21', breakAt: '2025-09-21' });
    assert.equal(latestSeason([]), null);
    assert.deepEqual([splitShare(343), splitShare(790), splitShare(1200)], [0.55, 0.66, 0.74]);

    const x = stripScale({ width: 800, start: '1996-10-12', breakAt: '2025-09-21', end: '2026-07-18' });
    assert.equal(Math.round(x(utc('2025-09-21'))), 528);
    assert.equal(x(utc('1996-10-12')), 8);
    assert.equal(x(utc('2026-07-18')), 792);
    // Inverting a pixel gives back its date, on both sides of the break.
    assert.equal(iso(x.invert(x(utc('2026-01-15')))), '2026-01-15');
    assert.equal(iso(x.invert(x(utc('2010-01-15')))), '2010-01-15');
    // A day in the latest season is wider than a week before it.
    const day = x(utc('2026-01-16')) - x(utc('2026-01-15'));
    const week = x(utc('2010-01-22')) - x(utc('2010-01-15'));
    assert.ok(day > week, `${day} vs ${week}`);
});

test('the latest season snaps to the day; before it, to the nearest weekly frame', () => {
    assert.equal(snapDate('2026-01-15', DAYS), '2026-01-15');
    assert.equal(snapDate('2026-06-04', DAYS), null, 'past the last game is today');
    assert.equal(snapDate('2025-04-08', DAYS), '2025-04-06');
    assert.equal(snapDate('2025-04-11', DAYS), '2025-04-13');
    // Nearer the latest season's first game than the last frame: the first game.
    assert.equal(snapDate('2025-10-01', DAYS), '2025-10-21');
    assert.equal(snapDate('2025-06-01', DAYS), '2025-04-13');
    assert.equal(snapDate('2000-01-01', DAYS), '2025-03-30', 'before the first frame is the first frame');
});

test('arrow keys step a day in the latest season and a week before it', () => {
    assert.equal(stepDate(null, -1, DAYS), '2026-06-03', 'back from today is the last game');
    assert.equal(stepDate(null, 1, DAYS), null);
    assert.equal(stepDate('2026-01-15', -1, DAYS), '2026-01-14');
    assert.equal(stepDate('2026-06-03', 1, DAYS), null, 'past the last game is today');
    assert.equal(stepDate('2025-10-21', -1, DAYS), '2025-04-13', 'back from the first game is the last frame');
    assert.equal(stepDate('2025-04-13', 1, DAYS), '2025-10-21');
    assert.equal(stepDate('2025-04-13', -1, DAYS), '2025-04-06');
    assert.equal(stepDate('2025-03-30', -1, DAYS), '2025-03-30', 'the first frame stays put');
});

test('months are named where they fit, never under the season label or off the end', () => {
    const x = stripScale({ width: 621, start: '1996-10-12', breakAt: '2025-09-21', end: '2026-07-18' });
    const split = x(utc('2025-09-21'));
    const ticks = monthTicks(x, { from: '2025-10-21', to: '2026-07-18', split });
    assert.equal(ticks.length, 9, 'Nov through Jul');
    const named = ticks.filter((tick) => tick.label).map((tick) => tick.label);
    assert.deepEqual(named, ['Jan', 'Mar', 'May'], 'every other month at 621px');
    assert.ok(ticks.every((tick) => !tick.label || (tick.x > split + 52 && tick.x + 22 <= 613)));
});

test('the Time Machine strip draws the break and steps with the shared helpers', async () => {
    const strip = await fs.readFile(path.resolve(process.cwd(), 'src/lib/components/TimeMachine.svelte'), 'utf8');
    assert.match(strip, /stripScale\(\{ width: stripWidth, start: addDays\(HISTORY_START, -20\), breakAt: latest\?\.breakAt, end: todayEdge, pad \}\)/);
    assert.match(strip, /snapDate\(date, \{ seasonStart, lastGame, pastFrames, historyStart: HISTORY_START \}\)/);
    assert.match(strip, /stepDate\(current, delta, \{ seasonStart, lastGame, pastFrames \}\) \?\? TODAY/);
    assert.match(strip, /<line class="tm-split" x1=\{splitX\}/);
    assert.match(strip, /class:current=\{band\.current\}/);
});
