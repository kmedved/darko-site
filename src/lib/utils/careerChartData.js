import { careerCoverage } from './careerCoverage.js';
import { computeSeasonX, getSeasonStartYear } from './seasonUtils.js';
import { getChartTheme } from './chartTheme.js';
import { loess } from './loess.js';
import { ratingDate } from './frozenRatings.js';

export function careerX(row, scale) {
  const value = scale === 'games' ? row.game_num : scale === 'age' ? row.age : row._seasonX;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * A row for a game the player played. Trajectory rows also carry rating states for games
 * missed, scheduled games and offseason dates (game_num null); those are not observations
 * at their date, so charts leave them out on every axis.
 */
export function isPlayedGame(row) {
  return Number.isFinite(Number.parseFloat(row?.game_num));
}

export function filterCareerRows(rows, spec) {
  return rows.filter((row) => {
    const date = String(row.date || '').slice(0, 10);
    if (spec.from && date < spec.from) return false;
    if (spec.to && date > spec.to) return false;
    // Season bounds are calendar season-start years, as on the existing page.
    const x = spec.scale === 'seasons' ? getSeasonStartYear(date) : careerX(row, spec.scale);
    if (x === null) return false;
    return (spec.min == null || x >= spec.min) && (spec.max == null || x <= spec.max);
  });
}

export function smoothCareerPoints(points, display = 'modern', override = null) {
  const bandwidth = override ?? getChartTheme(display).smoothingBandwidth ?? (points.length > 100 ? 0.25 : 0.35);
  const xs = points.map((point) => point.x);
  const ys = loess(xs, points.map((point) => point.y), bandwidth);
  return { bandwidth, points: xs.map((x, index) => ({ x, y: ys[index] })) };
}

export function prepareCareerSeries(history, spec, index) {
  // Numbering comes from getFullPlayerTrajectoryHistory before any crop. Only played games are
  // plotted: a frozen carrier row months after the last game must not extend the age or season
  // axis. Preserve the page's season spreading by filtering before computeSeasonX.
  const played = history.rows.filter(isPlayedGame);
  const filtered = filterCareerRows(played, spec);
  const rows = spec.scale === 'seasons' ? computeSeasonX(filtered) : filtered;
  const points = rows.flatMap((row) => {
    const x = careerX(row, spec.scale);
    const y = Number.parseFloat(row[spec.metric]);
    return x === null || !Number.isFinite(y) ? [] : [{ x, y, date: String(ratingDate(row)).slice(0, 10) }];
  }).sort((a, b) => a.x - b.x);
  const first = history.rows[0];
  const career = careerCoverage(history);
  const coverage = {
    nba_id: spec.ids[index], player_name: first?.player_name || `Player ${spec.ids[index]}`,
    source_url: `https://www.darko.app/player/${spec.ids[index]}`,
    available_from: first?.date?.slice(0, 10) ?? null,
    available_to: (played.at(-1) ?? history.rows.at(-1))?.date?.slice(0, 10) ?? null,
    snapshot_date: ratingDate(history.rows.at(-1))?.slice(0, 10) ?? null,
    snapshot_timing: 'pregame', ...career,
    coverage_note: !points.length ? 'No values match this player’s requested metric/range.' : career.coverage_note,
    history_rows: history.rows.length, displayed_rows: points.length,
    displayed_from: points[0]?.date ?? null, displayed_to: points.at(-1)?.date ?? null,
    games_in_available_history: Math.max(0, ...history.rows.map((row) => Number(row.game_num) || 0)),
    color: spec.colors[index]
  };
  return { ...coverage, points, smoothed: spec.smooth ? smoothCareerPoints(points, spec.display, spec.bandwidth) : null };
}

/** Raw observed ratings, kept separate from the smoothed presentation curve. */
export function summarizeCareerSeries(series, history, spec) {
  const point = (p) => p ? { date: p.date, x: p.x, value: p.y } : null;
  const latestRow = [...history.rows].reverse().find((row) => Number.isFinite(Number.parseFloat(row[spec.metric])));
  const peak = series.points.reduce((best, p) => !best || p.y > best.y ? p : best, null);
  const curve = series.smoothed?.points || [];
  const curvePeakIndex = curve.reduce((best, p, index) => best < 0 || p.y > curve[best].y ? index : best, -1);
  const curvePeak = curvePeakIndex < 0 ? null : { ...curve[curvePeakIndex], date: series.points[curvePeakIndex].date };
  const low = series.points[0]?.x, high = series.points.at(-1)?.x;
  const nearest = spec.at == null || !series.points.length || spec.at < low || spec.at > high ? null :
    series.points.reduce((best, p) => Math.abs(p.x - spec.at) < Math.abs(best.x - spec.at) ? p : best);
  return {
    nba_id: series.nba_id, player_name: series.player_name, color: series.color, source_url: series.source_url,
    latest_available: latestRow ? { date: String(ratingDate(latestRow)).slice(0, 10), value: Number.parseFloat(latestRow[spec.metric]) } : null,
    latest_in_range: point(series.points.at(-1)), peak_in_range: point(peak),
    smoothed_peak_in_range: point(curvePeak),
    smoothed_peak_method: 'maximum of the displayed LOESS samples; presentation curve, not an observed rating',
    selected: { requested_x: spec.at ?? null, observed: point(nearest), method: 'nearest observed rating in the displayed range; no interpolation or extrapolation' },
    partial_career: series.partial_career, snapshot_timing: 'pregame'
  };
}
