import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { careerChartLinks, readCareerQuery, resolveChartColors } from '../src/lib/utils/careerChartSpec.js';
import { isPlayedGame, prepareCareerSeries, smoothCareerPoints, summarizeCareerSeries } from '../src/lib/utils/careerChartData.js';
import { canonicalChartSpec, chartSpecFromUrl } from '../src/lib/server/charts/schema.js';
import { CHART_CREDIT, chartPalette, renderCareerSvg } from '../src/lib/server/charts/renderCareerSvg.js';
import { TITLE_CHARACTER_RANGES, undrawableTitleCharacters } from '../src/lib/server/charts/titleCharacters.js';
import { loess } from '../src/lib/utils/loess.js';
import { getSeriesColor, getWhiteSurfaceSeriesColor } from '../src/lib/utils/chartTheme.js';
import { execFileSync } from 'node:child_process';
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
    { ids: [1], ymin: 3, ymax: 3 }, { ids: [1], bandwidth: 0 }, { ids: [1], bandwidth: 1.01 }, { ids: [1], smooth: false, annotations: ['smoothed_peak'] }]) assert.throws(() => canonicalChartSpec(input));
});

test('comparison smoothing uses the shared 0.5 preset and plots only played games with values', () => {
  const spec = canonicalChartSpec({ ids: [708], scale: 'age', display: 'shiny' });
  const series = prepareCareerSeries({ rows: [...rows, { date: '1998-01-01', age: 22, dpm: null, game_num: 3 }] }, spec, 0);
  assert.equal(series.smoothed.bandwidth, 0.5);
  // The missed game, the scheduled game and the offseason carrier are rating states, not games.
  assert.deepEqual(series.points.map((point) => point.x), [20, 20.2]);
  assert.equal(series.points.length, rows.filter(isPlayedGame).length);
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
    annotations: ['peak', 'latest', 'selected'], bandwidth: 0.5, title: 'Garnett <comparison>' });
  for (const url of Object.values(careerChartLinks(spec))) assert.deepEqual(chartSpecFromUrl(url), spec);
  const history = { rows }, series = prepareCareerSeries(history, spec, 0);
  const comparison = [summarizeCareerSeries(series, history, spec)];
  const svg = renderCareerSvg(spec, [series], { comparison, dataset_as_of: '1997-01-01', history_note: 'Pregame' }, chartPalette(readFileSync('src/app.css', 'utf8')));
  assert.match(svg, /Raw peak: 1.00/);
  assert.match(svg, /Last: 1.00/);
  assert.match(svg, /Near game 2: 1.00/);
  for (const width of [1200, 2400]) {
    const image = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: ['src/lib/server/charts/assets/Archivo.ttf'], loadSystemFonts: false } }).render();
    assert.equal(image.width, width); assert.equal(image.height, width);
    assert.deepEqual([...image.pixels.subarray(0, 4)], [255, 255, 255, 255]);
  }
  for (const url of ['https://evil.example/trajectories?ids=708', 'https://www.darko.app@evil.example/trajectories?ids=708',
    'https://www.darko.app/player/708/comps', 'https://evil.example/player/708', 'https://www.darko.app/trajectories?ids=708&at=invalid']) assert.throws(() => chartSpecFromUrl(url));
  // A player page opens as that player's career chart; a social card URL imports like a chart image.
  assert.deepEqual(chartSpecFromUrl('https://www.darko.app/player/708').ids, [708]);
  assert.deepEqual(chartSpecFromUrl('https://darko.app/player/708/?scale=age').scale, 'age');
  assert.deepEqual(chartSpecFromUrl('https://www.darko.app/api/charts/social.png?ids=708,2544').ids, [708, 2544]);
  for (const input of [{ ids: [708], annotations: ['selected'] }, { ids: [708], annotations: ['peak', 'peak'] },
    { ids: [708], format: 'portrait' }]) assert.throws(() => canonicalChartSpec(input));
});

test('smoothing overrides preserve preset defaults and keep raw versus curve peaks distinct', () => {
  const many = Array.from({ length: 120 }, (_, i) => ({ x: i + 1, y: i === 60 ? 10 : 1, date: '2025-01-01' }));
  assert.equal(smoothCareerPoints(many, 'modern').bandwidth, 0.25);
  assert.equal(smoothCareerPoints(many.slice(0, 10), 'modern').bandwidth, 0.35);
  assert.equal(smoothCareerPoints(many, 'shiny').bandwidth, 0.5);
  assert.equal(smoothCareerPoints(many, 'modern', 0.75).bandwidth, 0.75);
  const series = { nba_id: 1, player_name: 'Player', points: many, smoothed: smoothCareerPoints(many, 'modern', 0.5) };
  const history = { rows: many.map((p) => ({ date: p.date, dpm: p.y })) };
  const summary = summarizeCareerSeries(series, history, { metric: 'dpm', at: 60.2 });
  assert.equal(summary.peak_in_range.value, 10);
  assert.ok(summary.smoothed_peak_in_range.value < 10);
  assert.equal(summary.selected.observed.x, 60);
  assert.equal(summarizeCareerSeries({ ...series, smoothed: null }, history, { metric: 'dpm' }).smoothed_peak_in_range, null);
});

test("LOESS windows hold each point's nearest neighbours, so curves do not jump across season gaps", () => {
  // Two seasons with a long gap. An index-centred window at x=3 reached into the second season
  // and pulled the curve toward 10; the nearest four points are all in the first season.
  const smoothed = loess([0, 1, 2, 3, 100, 101, 102, 103], [0, 0, 0, 0, 10, 10, 10, 10], 0.5);
  for (const value of smoothed.slice(0, 4)) assert.ok(Math.abs(value) < 1e-9, String(value));
  for (const value of smoothed.slice(4)) assert.ok(Math.abs(value - 10) < 1e-9, String(value));
  // Ties keep every point inside its own window, and tiny inputs still work.
  assert.deepEqual(loess([1, 1, 1], [2, 2, 2], 0.3), [2, 2, 2]);
  assert.deepEqual(loess([5], [7], 0.5), [7]);
});

test('seasons axis plots only played games, labels seasons as 1996-97 and carries the site credit', () => {
  const spec = canonicalChartSpec({ ids: [708], scale: 'seasons' });
  const series = prepareCareerSeries({ rows }, spec, 0);
  // The July 1997 offseason carrier would otherwise have opened a 1997-98 season.
  assert.ok(series.points.every((point) => point.x < 1997));
  assert.equal(series.available_to, '1996-11-03');
  const svg = renderCareerSvg(spec, [series], { dataset_as_of: '1997-01-01', history_note: 'Pregame' }, chartPalette(readFileSync('src/app.css', 'utf8')));
  assert.match(svg, />1996-97</);
  assert.match(svg, />Season</);
  assert.doesNotMatch(svg, /starting year/);
  assert.ok(svg.includes(CHART_CREDIT));
  assert.equal(CHART_CREDIT, '@kmedved | www.darko.app | @anpatt7');
});

test('social cards are 1200 x 630 with an automatic title, no custom title and no annotations', () => {
  const spec = canonicalChartSpec({ ids: [708], scale: 'age', format: 'square', title: 'DARKO says nothing', annotations: ['peak'] });
  const series = prepareCareerSeries({ rows }, spec, 0);
  const comparison = [summarizeCareerSeries(series, { rows }, spec)];
  const svg = renderCareerSvg(spec, [series], { comparison, dataset_as_of: '1997-01-01', history_note: 'Pregame' },
    chartPalette(readFileSync('src/app.css', 'utf8')), { layout: 'social' });
  assert.match(svg, /width="1200" height="630"/);
  assert.match(svg, /Kevin Garnett · DARKO DPM by age/);
  assert.doesNotMatch(svg, /DARKO says nothing/);
  assert.doesNotMatch(svg, /Raw peak/);
  assert.ok(svg.includes(CHART_CREDIT));
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { fontFiles: ['src/lib/server/charts/assets/Archivo.ttf'], loadSystemFonts: false } }).render();
  assert.equal(image.height, 630);
});

test('chart titles accept what the bundled font can draw and refuse emoji or other scripts', () => {
  assert.equal(canonicalChartSpec({ ids: [1], title: 'Jokić vs. Dončić — “peak” years… ±0.5' }).title, 'Jokić vs. Dončić — “peak” years… ±0.5');
  // Decomposed accents are composed first, so they validate like typed accents.
  assert.equal(canonicalChartSpec({ ids: [1], title: 'Jokic\u0301' }).title, 'Jokić');
  for (const title of ['🔥 Tatum vs George', 'Tatum 塔图姆', 'Леброн']) {
    assert.throws(() => canonicalChartSpec({ ids: [1], title }), /Chart titles can use Latin letters/);
  }
  assert.deepEqual(undrawableTitleCharacters('A🔥B🔥塔'), ['🔥', '塔']);
});

test('the drawable title characters match the bundled font exactly', () => {
  const font = readFileSync('src/lib/server/charts/assets/Archivo.ttf');
  const tables = new Map();
  for (let i = 0; i < font.readUInt16BE(4); i += 1) tables.set(font.toString('latin1', 12 + 16 * i, 16 + 16 * i), font.readUInt32BE(20 + 16 * i));
  const cmap = tables.get('cmap');
  const fromFont = new Set();
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i += 1) {
    const sub = cmap + font.readUInt32BE(cmap + 8 + 8 * i);
    if (font.readUInt16BE(sub) !== 4) continue;
    const segX2 = font.readUInt16BE(sub + 6), ends = sub + 14, starts = ends + segX2 + 2, deltas = starts + segX2, offsets = deltas + segX2;
    for (let seg = 0; seg < segX2 / 2; seg += 1) {
      const end = font.readUInt16BE(ends + 2 * seg), start = font.readUInt16BE(starts + 2 * seg);
      const delta = font.readInt16BE(deltas + 2 * seg), rangeOffset = font.readUInt16BE(offsets + 2 * seg);
      for (let code = start; code <= end && code !== 0xffff; code += 1) {
        let glyph = rangeOffset === 0 ? (code + delta) & 0xffff : font.readUInt16BE(offsets + 2 * seg + rangeOffset + 2 * (code - start));
        if (rangeOffset !== 0 && glyph) glyph = (glyph + delta) & 0xffff;
        if (glyph && code >= 0x20 && !(code >= 0xe000 && code <= 0xf8ff) && code !== 0xfeff) fromFont.add(code);
      }
    }
  }
  const fromRanges = new Set(TITLE_CHARACTER_RANGES.flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, i) => start + i)));
  assert.deepEqual([...fromRanges].sort((a, b) => a - b), [...fromFont].sort((a, b) => a - b));
});

test('chart images give the sixth player the light-surface violet; on-screen charts keep their palette', () => {
  const colors = canonicalChartSpec({ ids: [1, 2, 3, 4, 5, 6] }).colors;
  assert.equal(colors[5], '#4a3aa7');
  assert.equal(new Set(colors).size, 6);
  assert.equal(getWhiteSurfaceSeriesColor(5, 'modern'), '#4a3aa7');
  assert.equal(getSeriesColor(5, 'modern'), '#008300');
  assert.equal(getWhiteSurfaceSeriesColor(5, 'shiny'), getSeriesColor(5, 'shiny'));
});

test('the fallback link-preview card is a 1200 x 630 PNG', () => {
  const png = readFileSync('static/og-default.png');
  assert.equal(png.toString('latin1', 1, 4), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
});

test('the downloadable Claude skill ZIP matches the packaged skill source', () => {
  for (const file of ['SKILL.md', 'references/methodology.md']) {
    const zipped = execFileSync('unzip', ['-p', 'static/darko-analysis-skill.zip', `darko-analysis/${file}`]);
    assert.equal(zipped.toString('utf8'), readFileSync(`plugins/darko/skills/darko-analysis/${file}`, 'utf8'), file);
  }
});
