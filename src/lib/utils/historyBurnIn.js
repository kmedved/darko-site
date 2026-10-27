import { ratingDate } from './frozenRatings.js';

export const BURN_IN_METRICS = new Set(['dpm', 'o_dpm', 'd_dpm']);
export const BURN_IN_NOTE = '1996–97 ratings start with WOWY RAPM and transition to DPM through the regular season. Where WOWY is unavailable, DPM is shown.';

export function isBurnInRow(row) {
  const date = String(ratingDate(row) ?? '').slice(0, 10);
  return date >= '1996-11-01' && date < '1997-04-20';
}

/** Whether a career chart's displayed series include blended 1996–97 points. */
export function seriesShowBurnIn(metric, series) {
  return BURN_IN_METRICS.has(metric) && series.some((player) => player.points.some(isBurnInRow));
}
