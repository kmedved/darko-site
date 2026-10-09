import { establishCareerCoverage } from '../../utils/careerCoverage.js';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import fontData from './assets/Archivo.ttf?inline';
import { Resvg } from '@resvg/resvg-js';
import css from '../../../app.css?raw';
import { getFullPlayerTrajectoryHistory, getWowyPlayerHistory } from '../supabase.js';
import { getLatestGameDate } from '../daily.js';
import { canonicalChartSpec } from './schema.js';
export { chartSpecSchema } from './schema.js';
import { prepareCareerSeries, summarizeCareerSeries } from '../../utils/careerChartData.js';
import { chartPalette, renderCareerSvg, SOCIAL_CARD_SIZE } from './renderCareerSvg.js';


export const whiteThemeTokens = css.match(/:root\[data-theme='white'\]\s*\{([\s\S]*?)\}/)?.[1] || '';

export const HISTORY_NOTE = 'Retrospective pregame estimates, not an archive of ratings originally published on each day. History begins in 1996–97; games count played appearances within available history, excluding DNP, forecasts and offseason carriers.';

// Vite embeds the licensed font in the server bundle; no system font/file path dependency.
const font = Buffer.from(fontData.split(',')[1], 'base64');
// Native resvg accepts fontFiles (fontBuffers belongs to its WASM API).
// Materialize embedded bytes in the function's writable temporary directory.
const fontPath = join(tmpdir(), `darko-archivo-${createHash('sha256').update(font).digest('hex').slice(0, 16)}.ttf`);
try { writeFileSync(fontPath, font, { flag: 'wx', mode: 0o600 }); }
catch (error) { if (error.code !== 'EEXIST') throw error; }
const cache = new Map();
const pending = new Map();
const TTL = 300_000, MAX_BYTES = 16 * 1024 * 1024;
let cacheBytes = 0, activeRenders = 0;


async function loadCareerChart(spec) {
  const [histories, datasetAsOf] = await Promise.all([
    Promise.all(spec.ids.map(async (id) => establishCareerCoverage(await getFullPlayerTrajectoryHistory(id), id, getWowyPlayerHistory))), getLatestGameDate()
  ]);
  const series = histories.map((history, index) => {
    if (history.truncated) throw new Error(`Player ${spec.ids[index]} exceeds supported history coverage; a full-career chart is unavailable.`);
    if (!history.rows.length) throw new Error(`No DARKO history for player ${spec.ids[index]}.`);
    return prepareCareerSeries(history, spec, index);
  });
  if (!series.some((player) => player.points.length)) throw new Error('No history matches the requested metric and range.');
  const metadata = {
    dataset_as_of: datasetAsOf, snapshot_timing: 'pregame',
    publication_time: null, model_vintage: null, history_note: HISTORY_NOTE,
    coverage: series.map(({ points, smoothed, ...coverage }) => ({ ...coverage, smoothing_bandwidth: smoothed?.bandwidth ?? null })),
    limitations: series.flatMap((player) => player.coverage_note ? [player.player_name + ': ' + player.coverage_note] : []),
    comparison: series.map((player, index) => summarizeCareerSeries(player, histories[index], spec)),
    comparison_note: 'Raw peak and last in range use observed ratings in the displayed range. Smoothed peak is the maximum of displayed LOESS samples and depends on smoothing and range. Latest available may be outside that range. Selected points use the nearest observation within coverage, never extrapolation.',
    specification: spec
  };
  return { series, metadata };
}

function rasterize(svg, width) {
  return Buffer.from(new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: [fontPath], loadSystemFonts: false, defaultFontFamily: 'Archivo' }
  }).render().asPng());
}

/** One bounded in-process cache and render cap for chart images and social cards alike. */
function cachedRender(key, render) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.created < TTL) return Promise.resolve(cached.value);
  if (cached) { cacheBytes -= cached.bytes; cache.delete(key); }
  if (pending.has(key)) return pending.get(key);
  if (activeRenders >= 2) return Promise.reject(new Error('Chart renderer is busy; please retry shortly.'));
  activeRenders += 1;
  const promise = (async () => {
    const value = await render();
    const bytes = (value.display?.length ?? 0) + (value.download?.length ?? 0) + (value.png?.length ?? 0);
    while (cache.size && (cacheBytes + bytes > MAX_BYTES || cache.size >= 16)) {
      const oldest = cache.keys().next().value;
      cacheBytes -= cache.get(oldest).bytes;
      cache.delete(oldest);
    }
    if (bytes <= MAX_BYTES) { cache.set(key, { created: Date.now(), bytes, value }); cacheBytes += bytes; }
    return value;
  })().finally(() => { activeRenders -= 1; pending.delete(key); });
  pending.set(key, promise);
  return promise;
}

export async function buildCareerChart(input) {
  const spec = canonicalChartSpec(input);
  return cachedRender(JSON.stringify(spec), async () => {
    const { series, metadata } = await loadCareerChart(spec);
    const svg = renderCareerSvg(spec, series, metadata, chartPalette(css));
    return { metadata, display: rasterize(svg, 1200), download: rasterize(svg, 2400) };
  });
}

/**
 * The link-preview image for a chart: always the wide 1200 × 630 card with an automatic title
 * naming the players, whatever the chart's own format, custom title or annotations.
 */
export async function buildSocialCard(input) {
  const spec = canonicalChartSpec({ ...input, title: '', format: 'wide', annotations: [], at: null });
  return cachedRender('social:' + JSON.stringify(spec), async () => {
    const { series, metadata } = await loadCareerChart(spec);
    const svg = renderCareerSvg(spec, series, metadata, chartPalette(css), { layout: 'social' });
    return { metadata, png: rasterize(svg, SOCIAL_CARD_SIZE.width) };
  });
}
