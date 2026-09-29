import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { FROZEN_RATING_FIELDS, freezeHistory, freezeRow, isOffseasonRow, ratingDate } from '../src/lib/utils/frozenRatings.js';
import { csvText } from '../src/lib/utils/csv.js';
import { compareCsvColumns } from '../src/lib/utils/csvPresets.js';
import { snapshotNote } from '../src/lib/utils/headToHead.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

// Jokic, 2025-26: his last game (Apr 30, the rating going into it) and DARKO's offseason row.
const lastGame = { nba_id: 203999, date: '2026-04-30', tm_id: 1610612743, future_game: 0, dpm: 7.35021, o_dpm: 5.2328, d_dpm: 2.1174, box_dpm: 5.4748, on_off_dpm: 7.58983, x_minutes: 38.28 };
const offseason = { nba_id: 203999, date: '2026-07-26', tm_id: -999, future_game: 1, dpm: 6.76, o_dpm: 4.79, d_dpm: 1.97, box_dpm: 5.47184, on_off_dpm: 6.92048, x_minutes: 31.66, sal_market_fixed: 101400179 };

test('an offseason row takes its ratings from the last game and keeps the rest', () => {
	assert.equal(isOffseasonRow(offseason), true);
	assert.equal(isOffseasonRow(lastGame), false);
	// In season the latest row is the next game's forecast, with a real team: it passes.
	assert.equal(isOffseasonRow({ tm_id: 1610612743, future_game: 1 }), false);

	const frozen = freezeRow(offseason, lastGame);
	assert.deepEqual([frozen.dpm, frozen.o_dpm, frozen.d_dpm, frozen.box_dpm, frozen.on_off_dpm], [7.35021, 5.2328, 2.1174, 5.4748, 7.58983]);
	// Projections, salary, team and date stay the offseason row's.
	assert.deepEqual([frozen.x_minutes, frozen.sal_market_fixed, frozen.tm_id, frozen.date], [31.66, 101400179, -999, '2026-07-26']);
	assert.equal(offseason.dpm, 6.76, 'the source row is not changed');
	// No last game, or not an offseason row: as it is.
	assert.equal(freezeRow(offseason, null), offseason);
	assert.equal(freezeRow(lastGame, offseason), lastGame);
	assert.ok(FROZEN_RATING_FIELDS.includes('box_odpm') && FROZEN_RATING_FIELDS.includes('on_off_ddpm'));
});

test('in a history, an offseason row takes the ratings of the game day before it', () => {
	const rows = freezeHistory([{ ...lastGame, date: '2026-04-27', dpm: 7.25636 }, lastGame, offseason]);
	assert.deepEqual(rows.map((row) => row.dpm), [7.25636, 7.35021, 7.35021]);
	// A history that opens on an offseason row has nothing to take from.
	assert.deepEqual(freezeHistory([offseason]).map((row) => row.dpm), [6.76]);
	assert.deepEqual(freezeHistory(null), []);
});

test('the snapshot, histories and season lines all freeze at the last game', async () => {
	const loader = await read('src/lib/server/supabase.js');
	// Today's snapshot: each offseason row's ratings from that player's last game day.
	assert.match(loader, /const lastGames = await lastGameDayRows\(latestRows, latestSeason\);\s*const unique = latestRows\.map\(\(row\) => freezeRow\(row, lastGames\.get\(row\.nba_id\)\)\);/);
	assert.match(loader, /\.from\('player_seasons'\)\s*\.select\('nba_id, date'\)\s*\.eq\('season', season\)/);
	// Player histories (profile, Compare, Career Trajectories, the API) and the latest rows.
	assert.match(loader, /allData = freezeHistory\(allData\);/);
	assert.match(loader, /\.limit\(limit \+ 1\);/);
	assert.match(loader, /return freezeHistory\(\(data \|\| \[\]\)\.slice\(\)\.reverse\(\)\)\s*\.slice\(-limit\)/);
	// The leaderboard's season lines stop at the last game day.
	assert.match(loader, /if \(isOffseasonRow\(row\)\) continue;/);
});

test('a frozen rating keeps its own date, which the Compare CSV prints', async () => {
	const frozen = freezeRow(offseason, lastGame);
	assert.equal(frozen.rating_date, '2026-04-30');
	assert.equal(frozen.date, '2026-07-26', 'the projections keep their date');
	assert.equal(ratingDate(frozen), '2026-04-30');
	assert.equal(ratingDate(lastGame), '2026-04-30', 'a row as it is stands at its own date');
	assert.equal(ratingDate(null), null);
	assert.equal(freezeHistory([lastGame, offseason]).at(-1).rating_date, '2026-04-30');

	// The export the review ran: Jokic's +7.4 is dated April 30, not the offseason row's July 26.
	const [header, line] = csvText({ rows: [{ player_name: 'Nikola Jokic', ...frozen }], columns: compareCsvColumns })
		.trim()
		.split(/\r?\n/);
	const at = header.split(',').indexOf('Ratings as of');
	assert.equal(line.split(',')[at], '2026-04-30');
	assert.equal(line.split(',')[header.split(',').indexOf('DPM')], '+7.4');
	// A retired player's note reads the same date.
	assert.match(snapshotNote({ date: '2030-07-26', rating_date: '2026-04-30' }, new Date('2030-08-01T00:00:00Z')), /Apr 30, 2026/);

	// Today's snapshot fetches each last game day with its date.
	const loader = await read('src/lib/server/supabase.js');
	assert.match(loader, /\.select\(\['nba_id', 'date', \.\.\.FROZEN_RATING_FIELDS\]\.join\(', '\)\)/);
});
