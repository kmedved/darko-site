import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { careerChartLinks, readCareerQuery, resolveChartColors } from '../src/lib/utils/careerChartSpec.js';
import { prepareCareerSeries, smoothCareerPoints, summarizeCareerSeries } from '../src/lib/utils/careerChartData.js';
import { canonicalChartSpec, chartSpecFromUrl } from '../src/lib/server/charts/schema.js';
import { chartPalette, renderCareerSvg } from '../src/lib/server/charts/renderCareerSvg.js';
import { establishCareerCoverage, careerCoverage } from '../src/lib/utils/careerCoverage.js';
import { withGameNumbers } from '../src/lib/utils/seismograph.js';

const rows = withGameNumbers([
  { date: '1996-11-01', seconds_played: 200, age: 20, dpm: -1, rookie_season: 1996, player_name: 'Kevin Garnett', nba_id: 708 },
  { date: '1996-11-02', seconds_played: 0, age: 20.1, dpm: 9 },
  { date: '1996-11-03', seconds_played: 100, age: 20.2, dpm: 1 },
  { date: '1996-11-04', seconds_played: 0, future_game: 1, age: 20.3, dpm: 2 },
  { date: '1997-07-01', seconds_played: 0, tm_id: -999, age: 21, dpm: 2 }
]);

test('games crop retains original game numbers and labels a partial pre-1996 career', () => {
  const spec = canonicalChartSpec({ ids: [708], min: 2 });
  const series = prepareCareerSeries({ rows }, spec, 0);
  assert.deepEqual(series.points.map((p) => p.x), [2]);
  assert.equal(series.partial_career, true);
  assert.equal(series.games_in_available_history, 2);
  assert.match(series.coverage_note, /available history/);
  assert.equal(series.available_from, '1996-11-01');
});

test('page, display PNG and 2x download restore the same six-player specification', () => {
  const spec = canonicalChartSpec({ ids: [1, 2, 3, 4, 5, 6], metric: 'd_dpm', scale: 'age', min: 19, max: 25,
    from: '2000-01-01', to: '2026-10-06', title: 'Compare <peers>', display: 'shiny', ymin: -3, ymax: 8, points: false });
  const links = careerChartLinks(spec);
  for (const link of Object.values(links)) assert.deepEqual(canonicalChartSpec(readCareerQuery(new URL(link).searchParams)), spec);
  assert.equal(new URL(links.download_url).searchParams.get('width'), '2400');
  assert.equal(new Set(spec.colors).size, 6);
  assert.deepEqual(resolveChartColors({ ...spec, ids: [...spec.ids, 7] }).slice(0, 6), spec.colors);
});

test('chart specification rejects unsupported scope and invalid ranges', () => {
  for (const input of [{ ids: [1, 1] }, { ids: [1, 2, 3, 4, 5, 6, 7] }, { ids: [1], min: 25, max: 19 },
    { ids: [1], from: '2026-02-30' }, { ids: [1], metric: 'invented' }, { ids: [1], colors: ['javascript:bad'] },
    { ids: [1], ymin: 3, ymax: 3 }]) assert.throws(() => canonicalChartSpec(input));
});

test('comparison smoothing uses the shared 0.5 preset and excludes missing values', () => {
  const spec = canonicalChartSpec({ ids: [708], scale: 'age', display: 'shiny' });
  const series = prepareCareerSeries({ rows: [...rows, { date: '1998-01-01', age: 22, dpm: null }] }, spec, 0);
  assert.equal(series.smoothed.bandwidth, 0.5);
  assert.equal(series.points.length, rows.length);
  assert.deepEqual(series.smoothed, smoothCareerPoints(series.points, 'shiny'));
});

test('Modern SVG exports have a white background, escape titles and rasterize both sizes', () => {
  const spec = canonicalChartSpec({ ids: [708], title: '<script>unsafe</script>' });
  const series = prepareCareerSeries({ rows }, spec, 0);
  const css = readFileSync('src/app.css', 'utf8');
  const svg = renderCareerSvg(spec, [series], { dataset_as_of: '1997-01-01', history_note: 'Retrospective pregame series' }, chartPalette(css));
  assert.equal(spec.display, 'modern');
  assert.equal(chartPalette(css).bg, '#ffffff');
  assert.ok(!svg.includes('<script>'));
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /Games played in available history/);
  for (const width of [1200, 2400]) {
    const image = new Resvg(svg, { fitTo: { mode: 'width', value: width },
      font: { fontFiles: ['src/lib/server/charts/assets/Archivo.ttf'], loadSystemFonts: false } }).render();
    assert.deepEqual([...image.pixels.subarray(0, 4)], [255, 255, 255, 255]);
    assert.equal(image.width, width);
    assert.equal(image.height, width * 650 / 1200);
    assert.ok(image.asPng().length > 10000);
  }
});

test('Garnett-style clipped rookie metadata cannot certify a complete career', async () => {
  const history = { rows: [{ ...rows[0], rookie_season: 1997 }] };
  const verified = await establishCareerCoverage(history, 708, async () => ({ rows: [{ date: '1995-11-03', league: 'NBA' }], truncated: true }));
  assert.equal(careerCoverage(verified).partial_career, true);
  assert.equal(careerCoverage(verified).nba_debut_date, '1995-11-03');
  assert.equal(verified.rows, history.rows);
  const missing = await establishCareerCoverage(history, 708, async () => { throw new Error('missing'); });
  assert.equal(careerCoverage(missing).partial_career, null);
});


test('comparison separates latest available from raw range peaks and never extrapolates selected values', () => {
  const history = { rows };
  const spec = canonicalChartSpec({ ids: [708], min: 2, at: 2 });
  const series = prepareCareerSeries(history, spec, 0);
  const summary = summarizeCareerSeries(series, history, spec);
  assert.equal(summary.latest_available.value, 2);
  assert.equal(summary.latest_in_range.value, 1);
  assert.equal(summary.peak_in_range.value, 1); // DNP rating 9 is not a played-game point.
  assert.deepEqual(summary.selected.observed, { date: '1996-11-03', x: 2, value: 1 });
  assert.equal(summarizeCareerSeries(series, history, { ...spec, at: 20 }).selected.observed, null);
  const empty = prepareCareerSeries(history, { ...spec, min: 30 }, 0);
  assert.equal(summarizeCareerSeries(empty, history, spec).peak_in_range, null);
});

test('square annotated export and imported links retain every setting at both resolutions', () => {
  const spec = canonicalChartSpec({ ids: [708], metric: 'dpm', scale: 'games', min: 1, max: 2,
    from: null, to: null, ymin: -2, ymax: 3, format: 'square', at: 2,
    annotations: ['peak', 'latest', 'selected'], title: 'Garnett <comparison>' });
  for (const url of Object.values(careerChartLinks(spec))) assert.deepEqual(chartSpecFromUrl(url), spec);
  const history = { rows }, series = prepareCareerSeries(history, spec, 0);
  const comparison = [summarizeCareerSeries(series, history, spec)];
  const svg = renderCareerSvg(spec, [series], { comparison, dataset_as_of: '1997-01-01', history_note: 'Pregame' }, chartPalette(readFileSync('src/app.css', 'utf8')));
  assert.match(svg, /Peak 1.00/);
  assert.match(svg, /Last 1.00/);
  assert.match(svg, /@ 2 1.00/);
  for (const width of [1200, 2400]) {
    const image = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: ['src/lib/server/charts/assets/Archivo.ttf'], loadSystemFonts: false } }).render();
    assert.equal(image.width, width); assert.equal(image.height, width);
    assert.deepEqual([...image.pixels.subarray(0, 4)], [255, 255, 255, 255]);
  }
  for (const url of ['https://evil.example/trajectories?ids=708', 'https://www.darko.app@evil.example/trajectories?ids=708',
    'https://www.darko.app/player/708', 'https://www.darko.app/trajectories?ids=708&at=invalid']) assert.throws(() => chartSpecFromUrl(url));
  for (const input of [{ ids: [708], annotations: ['selected'] }, { ids: [708], annotations: ['peak', 'peak'] },
    { ids: [708], format: 'portrait' }]) assert.throws(() => canonicalChartSpec(input));
});
