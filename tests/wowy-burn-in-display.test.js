import test from 'node:test';
import assert from 'node:assert/strict';
import { blendHistoricalDpm, blendHistoricalRows } from '../src/lib/server/wowy1997.js';
import { isBurnInRow, BURN_IN_NOTE } from '../src/lib/utils/historyBurnIn.js';
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
  for (const row of [{ ...jordan, nba_id: 977 }, { ...jordan, nba_id: 99999999 }]) {
    assert.deepEqual(blendHistoricalDpm(row), row);
  }
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
