import { careerCoverage } from './careerCoverage.js';
import { computeSeasonX, computeSeasonAgeX, getSeasonStartYear, formatSeasonEndYearLabel } from './seasonUtils.js';
import { getChartTheme } from './chartTheme.js';
import { loess } from './loess.js';
import { ratingDate } from './frozenRatings.js';

function seasonAgeDetails(row) {
  const season = Number.parseInt(row.season, 10) || getSeasonStartYear(row.date) + 1;
  return { season, season_label: formatSeasonEndYearLabel(season),
    season_age: row._seasonAge, exact_age: Number.parseFloat(row.age) };
}

export function careerX(row, scale) {
  const value = scale === 'games' ? row.game_num : scale === 'age' ? row.age : scale === 'season-age' ? row._seasonAgeX : row._seasonX;
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
    // Season bounds are calendar season-start years, as on the existing page; season-age bounds
    // are whole season ages, so a range never splits a season's column.
    const x = spec.scale === 'seasons' ? getSeasonStartYear(date)
      : spec.scale === 'season-age' ? row._seasonAge ?? null : careerX(row, spec.scale);
    if (x === null) return false;
    return (spec.min == null || x >= spec.min) && (spec.max == null || x <= spec.max);
  });
}

/**
 * Season age: split points (sorted by x) wherever a whole season column is empty, so a line never
 * crosses seasons the player did not play.
 */
export function splitAtMissingSeasons(points) {
  const runs = [];
  for (const point of points) {
    const previous = runs.at(-1)?.at(-1);
    if (previous && Math.round(point.x) - Math.round(previous.x) <= 1) runs.at(-1).push(point);
    else runs.push([point]);
  }
  return runs;
}

export function smoothCareerPoints(points, display = 'modern', override = null, { breakAtMissingSeasons = false } = {}) {
  const bandwidth = override ?? getChartTheme(display).smoothingBandwidth ?? (points.length > 100 ? 0.25 : 0.35);
  const fit = (run, share) => {
    const xs = run.map((point) => point.x);
    const ys = loess(xs, run.map((point) => point.y), share);
    return xs.map((x, index) => ({ x, y: ys[index] }));
  };
  if (!breakAtMissingSeasons) return { bandwidth, points: fit(points, bandwidth) };
  // Each run of consecutive seasons is smoothed on its own with the window the whole career would
  // use, so a missed season (a retirement, a lost year) does not bend the curve on either side.
  const window = Math.ceil(bandwidth * points.length);
  return { bandwidth, points: splitAtMissingSeasons(points).flatMap((run) => fit(run, Math.min(1, window / run.length))) };
}

export function prepareCareerSeries(history, spec, index) {
  // Numbering comes from getFullPlayerTrajectoryHistory before any crop. Only played games are
  // plotted: a frozen carrier row months after the last game must not extend the age or season
  // axis. Preserve the page's season spreading by filtering before computeSeasonX.
  const played = history.rows.filter(isPlayedGame);
  const positioned = spec.scale === 'season-age' ? computeSeasonAgeX(played) : played;
  const filtered = filterCareerRows(positioned, spec);
  const rows = spec.scale === 'seasons' ? computeSeasonX(filtered) : filtered;
  const points = rows.flatMap((row) => {
    const x = careerX(row, spec.scale);
    const y = Number.parseFloat(row[spec.metric]);
    return x === null || !Number.isFinite(y) ? [] : [{ x, y, date: String(ratingDate(row)).slice(0, 10),
      ...(spec.scale === 'season-age' ? seasonAgeDetails(row) : {}) }];
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
  return { ...coverage, points, smoothed: spec.smooth
    ? smoothCareerPoints(points, spec.display, spec.bandwidth, { breakAtMissingSeasons: spec.scale === 'season-age' })
    : null };
}

/** Raw observed ratings, kept separate from the smoothed presentation curve. */
export function summarizeCareerSeries(series, history, spec) {
  const point = (p) => p ? { date: p.date, x: p.x, value: p.y,
    ...(spec.scale === 'season-age' ? { season: p.season, season_label: p.season_label,
      season_age: p.season_age, exact_age: p.exact_age } : {}) } : null;
  const latestRow = [...history.rows].reverse().find((row) => Number.isFinite(Number.parseFloat(row[spec.metric])));
  const peak = series.points.reduce((best, p) => !best || p.y > best.y ? p : best, null);
  const curve = series.smoothed?.points || [];
  const curvePeakIndex = curve.reduce((best, p, index) => best < 0 || p.y > curve[best].y ? index : best, -1);
  const curvePeak = curvePeakIndex < 0 ? null : { ...series.points[curvePeakIndex], ...curve[curvePeakIndex] };
  const low = series.points[0]?.x, high = series.points.at(-1)?.x;
  const nearest = spec.at == null || !series.points.length || spec.at < low || spec.at > high ? null :
    series.points.reduce((best, p) => Math.abs(p.x - spec.at) < Math.abs(best.x - spec.at) ? p : best);
  return {
    nba_id: series.nba_id, player_name: series.player_name, color: series.color, source_url: series.source_url,
    latest_available: latestRow ? { date: String(ratingDate(latestRow)).slice(0, 10), value: Number.parseFloat(latestRow[spec.metric]),
      ...(spec.scale === 'season-age' ? seasonAgeDetails(computeSeasonAgeX([latestRow])[0]) : {}) } : null,
    latest_in_range: point(series.points.at(-1)), peak_in_range: point(peak),
    smoothed_peak_in_range: point(curvePeak),
    smoothed_peak_method: 'maximum of the displayed LOESS samples; presentation curve, not an observed rating',
    ...(spec.scale === 'season-age' ? { axis_note: 'x is position within a season column, not chronological age. Use season_age and season_label to describe the season; exact_age is age on the rating date.' } : {}),
    selected: { requested_x: spec.at ?? null, observed: point(nearest), method: 'nearest observed rating in the displayed range; no interpolation or extrapolation' },
    partial_career: series.partial_career, snapshot_timing: 'pregame'
  };
}
