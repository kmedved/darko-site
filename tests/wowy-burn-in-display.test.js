import test from 'node:test';
import assert from 'node:assert/strict';
import { blendHistoricalDpm, blendHistoricalRows } from '../src/lib/server/wowy1997.js';
import { isBurnInRow, BURN_IN_NOTE, seriesShowBurnIn } from '../src/lib/utils/historyBurnIn.js';
import { displayHistory } from '../src/lib/server/historyDisplay.js';

const jordan = { nba_id: 893, season: 1997, date: '1996-11-01', dpm: -1.56821, o_dpm: -0.653333, d_dpm: -0.914879 };
const near = (a, b, tolerance = 1e-4) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('opening display uses pregame WOWY and preserves total equals offense plus defense', () => {
  const displayed = blendHistoricalDpm(jordan);
  near(displayed.o_dpm, 5.6766);
  near(displayed.d_dpm, 1.7989);
  near(displayed.dpm, 7.4755);
  near(displayed.dpm, displayed.o_dpm + displayed.d_dpm);
  assert.equal(jordan.dpm, -1.56821);
});

test('linear fade reaches DPM at the regular-season end and leaves later seasons intact', () => {
  const mid = { ...jordan, date: '1997-01-31', dpm: 4.09, o_dpm: 3, d_dpm: 1.09 };
  const result = blendHistoricalDpm(mid);
  near(result.dpm, 5.57, 0.01);
  near(result.dpm, result.o_dpm + result.d_dpm);
  for (const date of ['1997-04-20', '1997-05-15', '1997-11-01']) {
    const raw = { ...jordan, date };
    assert.deepEqual(blendHistoricalDpm(raw), raw);
  }
});

test('missing WOWY and dates before a player has data use DPM rather than future values', () => {
  // 402 has no 1996–97 WOWY; 1089's first state is his first rating, December 10.
  for (const row of [{ ...jordan, nba_id: 402 }, { ...jordan, nba_id: 99999999 }, { ...jordan, nba_id: 1089, date: '1996-12-01' }]) {
    assert.deepEqual(blendHistoricalDpm(row), row);
  }
});

test('a no-minute row before a debut takes the debut-day pregame state, so the display does not jump', () => {
  // Kobe Bryant: first rating November 1 (no minutes), debut and first WOWY state November 3.
  const beforeDebut = blendHistoricalDpm({ nba_id: 977, date: '1996-11-01', dpm: -3, o_dpm: -2, d_dpm: -1 });
  const debut = blendHistoricalDpm({ nba_id: 977, date: '1996-11-03', dpm: -3, o_dpm: -2, d_dpm: -1 });
  const weight = (date) => (Date.UTC(1997, 3, 20) - Date.parse(`${date}T00:00:00Z`)) / (Date.UTC(1997, 3, 20) - Date.UTC(1996, 10, 1));
  near(beforeDebut.o_dpm, (1 - weight('1996-11-01')) * -2 + weight('1996-11-01') * -1.4438);
  near(debut.o_dpm, (1 - weight('1996-11-03')) * -2 + weight('1996-11-03') * -1.4438);
});

test('the 1996–97 chart note appears only when a DPM series shows 1996–97 points', () => {
  const series = (date) => [{ points: [{ x: 0, y: 1, date }] }];
  assert.ok(seriesShowBurnIn('dpm', series('1997-01-31')));
  assert.ok(!seriesShowBurnIn('dpm', series('1998-01-31')));
  assert.ok(!seriesShowBurnIn('bayes_rapm_total', series('1997-01-31')));
});

test('frozen rows use their actual rating date; total-only display agrees with full row', () => {
  const frozen = { ...jordan, date: '1997-07-01', rating_date: '1996-11-01' };
  const full = blendHistoricalDpm(frozen);
  near(full.dpm, 7.4755);
  near(blendHistoricalDpm({ nba_id: 893, date: jordan.date, dpm: jordan.dpm }).dpm, full.dpm);
  assert.ok(isBurnInRow(frozen));
  assert.ok(!isBurnInRow({ ...jordan, date: '1997-04-20' }));
  assert.match(BURN_IN_NOTE, /WOWY RAPM/);
  assert.equal(blendHistoricalRows([jordan]).length, 1);
});

test('compare and API payloads get the same blend; other seasons pass through untouched', async () => {
  const later = { ...jordan, date: '1997-11-01' };
  const payload = { rows: [jordan, later], truncated: false, maxRows: 5000 };
  const shown = await displayHistory(payload);
  near(shown.rows[0].dpm, 7.4755);
  assert.deepEqual(shown.rows[1], later);
  assert.equal(shown.truncated, false);
  assert.equal(payload.rows[0].dpm, jordan.dpm);
  near((await displayHistory([jordan]))[0].dpm, 7.4755);
  const untouched = { rows: [later] };
  assert.equal(await displayHistory(untouched), untouched);
});
