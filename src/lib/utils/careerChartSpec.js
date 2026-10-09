import { getWhiteSurfaceSeriesColor } from './chartTheme.js';

export const MAX_CHART_PLAYERS = 6;
export const CAREER_METRICS = Object.freeze(['dpm', 'o_dpm', 'd_dpm']);
export const CAREER_SCALES = Object.freeze(['games', 'age', 'seasons']);
export const CHART_QUERY_KEYS = Object.freeze([
  'ids', 'metric', 'scale', 'min', 'max', 'from', 'to', 'ymin', 'ymax',
  'colors', 'title', 'points', 'smooth', 'bandwidth', 'display', 'format', 'annotations', 'at'
]);

export function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// This parser also serves the existing page's broader metric/WOWY catalog.
// Server validation is deliberately separate from permissive page restoration.
export function readCareerQuery(params) {
  return {
    ids: (params.get('ids') || '').split(',').filter(Boolean).map(Number),
    metric: params.get('metric') || 'dpm', scale: params.get('scale') || 'games',
    min: optionalNumber(params.get('min')), max: optionalNumber(params.get('max')),
    from: params.get('from') || null, to: params.get('to') || null,
    ymin: optionalNumber(params.get('ymin')), ymax: optionalNumber(params.get('ymax')),
    colors: (params.get('colors') || '').split(',').filter(Boolean),
    title: params.get('title') || '', points: params.get('points') !== '0',
    format: params.get('format') || 'wide', annotations: (params.get('annotations') || '').split(',').filter(Boolean),
    at: optionalNumber(params.get('at')),
    smooth: params.get('smooth') !== '0', bandwidth: optionalNumber(params.get('bandwidth')), display: params.get('display') === 'shiny' ? 'shiny' : 'modern'
  };
}

export function writeCareerQuery(params, spec) {
  for (const key of CHART_QUERY_KEYS) params.delete(key);
  if (spec.ids?.length) params.set('ids', spec.ids.join(','));
  if (spec.metric && spec.metric !== 'dpm') params.set('metric', spec.metric);
  if (spec.scale && spec.scale !== 'games') params.set('scale', spec.scale);
  for (const key of ['min', 'max', 'from', 'to', 'ymin', 'ymax', 'title', 'at', 'bandwidth']) {
    if (spec[key] !== null && spec[key] !== undefined && spec[key] !== '') params.set(key, String(spec[key]));
  }
  if (spec.format && spec.format !== 'wide') params.set('format', spec.format);
  if (spec.annotations?.length) params.set('annotations', spec.annotations.join(','));
  if (spec.colors?.length) params.set('colors', spec.colors.join(','));
  if (spec.points === false) params.set('points', '0');
  if (spec.smooth === false) params.set('smooth', '0');
  if (['modern', 'shiny'].includes(spec.display)) params.set('display', spec.display);
  return params;
}

export function resolveChartColors(spec) {
  const used = new Set(spec.colors || []);
  return spec.ids.map((id, index) => {
    if (spec.colors?.[index]) return spec.colors[index];
    let slot = 0;
    while (used.has(getWhiteSurfaceSeriesColor(slot, spec.display))) slot += 1;
    const color = getWhiteSurfaceSeriesColor(slot, spec.display);
    used.add(color);
    return color;
  });
}

export function careerChartLinks(spec, origin = 'https://www.darko.app') {
  const page = new URL('/trajectories', origin);
  writeCareerQuery(page.searchParams, spec);
  const image = new URL('/api/charts/career.png', origin);
  writeCareerQuery(image.searchParams, spec);
  const download = new URL(image);
  download.searchParams.set('width', '2400');
  download.searchParams.set('download', '1');
  return { source_url: page.href, image_url: image.href, download_url: download.href };
}
