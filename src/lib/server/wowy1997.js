// A pinned extract of Daily pregame WOWY, not the site's hindsight Final Cut series.
import daily from './data/wowy-pregame-1997.json' with { type: 'json' };
import { ratingDate } from '../utils/frozenRatings.js';

const FIRST_DAY = Date.UTC(1996, 10, 1);
const LAST_DAY = Date.UTC(1997, 3, 20);
const DAY_MS = 86_400_000;

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** The 1996–97 display fades from Daily WOWY to DPM by the regular-season finale. */
export function blendHistoricalDpm(row) {
  const date = String(ratingDate(row) ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return row;
  const time = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(time) || time < FIRST_DAY || time >= LAST_DAY) return row;
  const states = daily[String(row.nba_id)];
  if (!states) return row;
  const day = Math.floor((time - FIRST_DAY) / DAY_MS);
  // Use the most recent state at or before this rating date, never a future state.
  let low = 0, high = states.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (states[middle][0] <= day) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return row;
  const [, offense, defense] = states[low - 1];
  const dpm = numberOrNull(row.dpm);
  if (dpm === null) return row;
  const weight = (LAST_DAY - time) / (LAST_DAY - FIRST_DAY);
  const blend = (raw, wowy) => (1 - weight) * raw + weight * wowy;
  const rawOffense = numberOrNull(row.o_dpm);
  const rawDefense = numberOrNull(row.d_dpm);
  const result = { ...row, dpm: blend(dpm, offense + defense) };
  if (rawOffense !== null && rawDefense !== null) {
    result.o_dpm = blend(rawOffense, offense);
    result.d_dpm = blend(rawDefense, defense);
    result.dpm = result.o_dpm + result.d_dpm;
  }
  return result;
}

export function blendHistoricalRows(rows) {
  return (rows ?? []).map(blendHistoricalDpm);
}
